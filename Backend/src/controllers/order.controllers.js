import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { getCartSubtotal } from "../utils/helper.js";

export const createOrder = asyncHandler( async(req, res) => {
    const userId = req.user.id;
    const { 
        shipping_full_name, shipping_phone, 
        shipping_street, shipping_city, shipping_state, shipping_country,
        shipping_postal_code,
        payment_method
    } = req.body;

    // validation

    
    if (!payment_method) {
        throw new ApiError(400, "Payment method is required");
    }

    //get cart
    const [cart] = await pool.query(`SELECT id FROM cart WHERE user_id = ?`, [userId])

    if (cart.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, "Cart is empty", {
                items: [],
                subtotal: 0,
                totalItems: 0,
            })
        );
    }

    const cartId = cart[0].id;

    const connection = await pool.getConnection();
    try {

        await connection.beginTransaction();

        const [cartItems] = await connection.query(
          `SELECT ci.product_id, ci.size_id, ci.quantity, p.price, p.name,
                  ps.stock AS available_stock
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           LEFT JOIN product_sizes ps ON ps.id = ci.size_id
           WHERE ci.cart_id = ?
           FOR UPDATE`,
          [cartId]
        );

        if (cartItems.length === 0) {
          throw new ApiError(400, "Cart is empty");
        }

        // Validate stock for every item before creating anything
        for (const item of cartItems) {

            if (item.available_stock === null || item.available_stock < item.quantity) {
              throw new ApiError(400, `Insufficient stock for ${item.name}`);
            }
        }
        
        const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const taxRate = 18;
        const shipping = 10;
        const discount = 0;
        
        const tax = (subtotal * taxRate) / 100;
        const total = subtotal + tax + shipping - discount;

        await connection.query(`
            INSERT INTO orders 
            ( shipping_full_name, shipping_phone, 
            shipping_street, shipping_city, shipping_state, shipping_country,
            shipping_postal_code,
            subtotal, discount, tax, shipping_fee, total_amount
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
            `,[
                shipping_full_name, shipping_phone, 
                shipping_street, shipping_city, shipping_state, shipping_country,
                shipping_postal_code, subtotal, discount, tax, shipping, total
            ])
        
        const orderId = orderResult.insertId;

        // Create order_items (price snapshot) + decrement stock
        for (const item of cartItems) {
          await connection.query(
            `INSERT INTO order_items (order_id, product_id, size_id, quantity, price)
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, item.product_id, item.size_id, item.quantity, item.price]
          );

          if (item.size_id) {
            await connection.query(
              `UPDATE product_sizes SET stock = stock - ? WHERE id = ?`,
              [item.quantity, item.size_id]
            );
          }
        }

        // Clear the cart
        await connection.query(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);

        await connection.commit();
        return res
        .status(200)
        .json(new ApiResponse(200, "Order placed successfully"))
    } catch (error) {
       await connection.rollback();
       throw error instanceof ApiError ? error : new ApiError(500, error.message);
    } finally {
        await connection.release()
    }
})

export const getMyOrders = asyncHandler( async(req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) -1)* Number(limit)


    const [orders] = await pool.query(`
        SELECT id, status, payment_status, payment_method, subtotal FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `,[userId, Number(limit), offset])

    if(orders.length === 0){
       return res
       .status(200)
       .json(new ApiResponse(200, "No order is placed yet.",[]))
    }

    return res
    .status(200)
    .json(new ApiResponse(200, "Order fetched successfully", orders))
})

export const getMyOrderById = asyncHandler( async (req, res) => {
    const userId = req.user.id;
    const {id:order_id} = req.params;

    const [rows] = await pool.query(`
    SELECT
      o.id,
      o.status,
      o.payment_status,
      o.payment_method,
      o.subtotal,
      o.discount,
      o.tax,
      o.shipping_fee,
      o.total_amount,
      o.shipping_full_name,
      o.shipping_phone,
      o.shipping_street,
      o.shipping_city,
      o.shipping_state,
      o.shipping_country,
      o.shipping_postal_code,
      o.created_at,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'product_id', oi.product_id,
            'name', p.name,
            'quantity', oi.quantity,
            'price', oi.price,
            'size_id', oi.size_id,
            'image_url', (
              SELECT pi.image_url FROM product_images pi
              WHERE pi.product_id = p.id AND pi.is_primary = true
              LIMIT 1
            )
          )
        )
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
      ) AS items
    FROM orders o
    WHERE o.id = ? AND o.user_id = ?
    `,
    [order_id, userId]
  );

    if(rows.length === 0){
       throw new ApiError(404, "Order not found ")
    }

    const order = rows[0];
    order.items = order.items ? JSON.parse(order.items) : [];

    return res
    .status(200)
    .json(new ApiResponse(200, "Order fetched successfully", order))

})

export const cancleMyOrder = asyncHandler( async(req, res) => {
  const userId = req.user.id;
  const { id:order_id } = req.params;

  const [result] = await pool.query(`
    SELECT id, status FROM orders WHERE id = ? AND user_id = ?
    `,[order_id, userId])

  if(result.length === 0){
    throw new ApiError(404, "Order not found");
  }

  if(result[0].status === 'cancelled' || result[0].status === 'delivered' || result[0].status === 'shipped'){
    throw new ApiError(401, `Order is already ${currentStatus} and cannot be cancelled`)
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction()

    // Restore stock for each item in this order
    const [orderItems] = await connection.query(
      `SELECT product_id, size_id, quantity FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    for (const item of orderItems) {
      if (item.size_id) {
        await connection.query(
          `UPDATE product_sizes SET stock = stock + ? WHERE id = ?`,
          [item.quantity, item.size_id]
        );
      }
    }

    const [order] = await pool.query(`
      UPDATE orders SET status = ? WHERE id = ? AND user_id = ?
      `,['cancelled',order_id,userId])
    
    if(order.affectedRows === 0){
      throw new ApiError(500, "Failed to cancle the order.")
    }
    
    await connection.commit();

    return res
    .status(201)
    .json(new ApiResponse(201,"Order cancelled successfully."))
    
  } catch (error) {
    await connection.rollback();
    throw error instanceof ApiError ? error : new ApiError(500, error.message);
  } finally {
    connection.release()
  }
})

export const getAllOrders = asyncHandler( async(req, res) => {
    const { page = 1, limit = 10, status, paymentStatus } = req.query;
    const offset = (Number(page) -1)* Number(limit)

    let query = `SELECT o.id, o.status, o.payment_status, o.payment_method, o.subtotal, o.total_amount,o.created_at,
    u.full_name AS customer_name, u.email AS customer_email
    FROM orders o
    JOIN users u
    ON u.id = o.user_id
    WHERE 1=1
    `

    const params = []

    if(status){
      query += `AND o.status = ?`
      params.push(status)
    }
    if(paymentStatus){
      query += `AND o.payment_status`
      params.push(paymentStatus)
    }

    query += `ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
    params.push(Number(limit), offset)

    const [order] = await pool.query(query, params);

    const countQuery = `SELECT COUNT(*) AS total FROM order o WHERE 1=1`
    const countParams = []

    if(status){
      query += `AND o.status = ?`
    }
    if(paymentStatus){
      query += `AND o.payment_status`
      params.push(paymentStatus)
    }

    const [countOrder] = await pool.query(countQuery, countParams)
    const totalOrders = countOrder[0].total;


    return res.status(200).json(
      new ApiResponse(200, "Orders fetched successfully", {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
        },
      })
    );

})

export const getOrderById = asyncHandler( async (req, res) => {
    
    const {id:order_id} = req.params;

    const [rows] = await pool.query(`
    SELECT
      o.id,
      o.status,
      o.payment_status,
      o.payment_method,
      o.subtotal,
      o.discount,
      o.tax,
      o.shipping_fee,
      o.total_amount,
      o.shipping_full_name,
      o.shipping_phone,
      o.shipping_street,
      o.shipping_city,
      o.shipping_state,
      o.shipping_country,
      o.shipping_postal_code,
      o.created_at,
      u.full_name AS customer_name,
      u.email AS customer_email,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'product_id', oi.product_id,
            'name', p.name,
            'quantity', oi.quantity,
            'price', oi.price,
            'size_id', oi.size_id,
            'image_url', (
              SELECT pi.image_url FROM product_images pi
              WHERE pi.product_id = p.id AND pi.is_primary = true
              LIMIT 1
            )
          )
        )
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
      ) AS items
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
    `,
    [orderId]
  );

    if(rows.length === 0){
       throw new ApiError(404, "Order not found ")
    }

    const order = rows[0];
    order.items = order.items ? JSON.parse(order.items) : [];

    return res
    .status(200)
    .json(new ApiResponse(200, "Order fetched successfully", order))

})