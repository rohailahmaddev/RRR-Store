import pool from "../config/index.db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
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
          `SELECT ci.product_id, ci.product_variant_id, ci.quantity, p.price, p.name,
                  pv.stock AS available_stock
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           LEFT JOIN product_variants pv ON pv.id = ci.product_variant_id
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

        const orderResult = await connection.query(`
            INSERT INTO orders 
            ( user_id, shipping_full_name, shipping_phone, 
            shipping_street, shipping_city, shipping_state, shipping_country,
            shipping_postal_code,
            subtotal, discount, tax, shipping_fee, total_amount
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            `,[
                userId,
                shipping_full_name, shipping_phone, 
                shipping_street, shipping_city, shipping_state, shipping_country,
                shipping_postal_code, subtotal, discount, tax, shipping, total
            ])

        const orderId = orderResult[0].insertId;

        // Create order_items (price snapshot) + decrement stock
        for (const item of cartItems) {
          await connection.query(
            `INSERT INTO order_items (order_id, product_id, product_variant_id, quantity, price)
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, item.product_id, item.product_variant_id, item.quantity, item.price]
          );

          if (item.product_variant_id) {
            await connection.query(
              `UPDATE product_variants SET stock = stock - ? WHERE id = ?`,
              [item.quantity, item.product_variant_id]
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
        SELECT id, status, payment_status, payment_method, subtotal, total_amount FROM orders
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
        SELECT
          COALESCE(
            CONCAT(
              '[',
              GROUP_CONCAT(
                JSON_OBJECT(
                  'product_id', oi.product_id,
                  'name', p.name,
                  'quantity', oi.quantity,
                  'price', oi.price,
                  'product_variant_id', oi.product_variant_id,
                  'image_url', (
                    SELECT pi.image_url
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                      AND pi.is_primary = TRUE
                    LIMIT 1
                  )
                )
              ),
              ']'
            ),
            '[]'
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
      `SELECT product_id, product_variant_id, quantity FROM order_items WHERE order_id = ?`,
      [order_id]
    );

    for (const item of orderItems) {
      if (item.product_variant_id) {
        await connection.query(
          `UPDATE product_variants SET stock = stock + ? WHERE id = ?`,
          [item.quantity, item.product_variant_id]
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

    const [orders] = await pool.query(query, params);

    const countQuery = `SELECT COUNT(*) AS total FROM orders o WHERE 1=1`
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
        SELECT
          COALESCE(
            CONCAT(
              '[',
              GROUP_CONCAT(
                JSON_OBJECT(
                  'product_id', oi.product_id,
                  'name', p.name,
                  'quantity', oi.quantity,
                  'price', oi.price,
                  'product_variant_id', oi.product_variant_id,
                  'image_url', (
                    SELECT pi.image_url
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                      AND pi.is_primary = TRUE
                    LIMIT 1
                  )
                )
              ),
              ']'
            ),
            '[]'
          )
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
      ) AS items
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
    `,
    [order_id]
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

// admin controllers
export const updateOrderStatus = asyncHandler( async(req, res) => {
    const { id:order_id } = req.params;
    const { status } = req.body;

    const VALID_ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    
    //transition allowed
    const ALLOWED_TRANSITIONS = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["shipped", "cancelled"],
      shipped: ["delivered", "cancelled"],
      delivered: [], // terminal state, no further transitions
      cancelled: [], // terminal state, no further transitions
    };


    if(!status){
      throw new ApiError(400, "Status is required")
    }

    if(!VALID_ORDER_STATUSES.includes(status)){
      throw new ApiError(400, `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`);
    }

    const [order] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [order_id])

    if(order.length === 0) {
      throw new ApiError(404, "Order not found")
    }

    if(order[0].status === status){
      throw new ApiError(400, `Order is already ${status}`)
    }

    if(!ALLOWED_TRANSITIONS[order[0].status].includes(status)){
      throw new ApiError(400, `Cannot change status from ${currentStatus} to ${status}`);
    }

    if(status === 'cancelled' && !result[0].status === 'delivered' && !result[0].status === 'shipped'){

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction()

      //restore stock for each item in this order
      const [orderItems] = await connection.query(
        `SELECT product_id, product_variant_id, quantity FROM order_items WHERE order_id = ?`,
        [order_id]
      );

      for (const item of orderItems) {
        if (item.product_variant_id) {
          await connection.query(
            `UPDATE product_variants SET stock = stock + ? WHERE id = ?`,
            [item.quantity, item.product_variant_id]
          );
        }
      }

      const [order] = await connection.query(`
        UPDATE orders SET status = ? WHERE id = ?
        `,['cancelled',order_id])
      
      await connection.commit();

    } catch (error) {
      await connection.rollback();
      throw new ApiError(500, "Failed to cancel the order");
    } finally {
      connection.release();
    }

    } else {
      const [updatedOrder] = await connection.query(`
        UPDATE orders SET status = ? WHERE id = ?
      `,[status,order_id])

      if(updatedOrder.affectedRows ===0){
        throw new ApiError(500,"Failed to cancel the order")
      }

    }

    //create audit logs
    await logAudit({
      userId: req.user.id,
      action: "UPDATE_ORDER_STATUS",
      entityType: "orders",
      entityId: Number(order_id),
      details: { status: {from: order[0].status, to: status } },
      ipAddress: req.ip,
    });

    return res
    .status(200)
    .json(new ApiResponse(200, "Order status updated successfully"))

})

export const updatePaymentStatus = asyncHandler( async(req, res) => {
    const { id:order_id } = req.params;
    const { payment_status } = req.body;

    const VALID_PAYMENT_STATUSES = ["unpaid", "paid", "refunded"];

    const ALLOWED_PAYMENT_TRANSITIONS = {
      unpaid: ["paid"],
      paid: ["refunded"],
      refunded: [], // terminal state
    };

    if (!payment_status) {
      throw new ApiError(400, "Payment status is required");
    }

    if (!VALID_PAYMENT_STATUSES.includes(payment_status)) {
      throw new ApiError(400, `Invalid payment status. Must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`);
    }

    const [orders] = await pool.query(`SELECT id, payment_status FROM orders WHERE id = ?`, [order_id]);

    if (orders.length === 0) {
      throw new ApiError(404, "Order not found");
    }

    if (orders[0].payment_status === payment_status) {
      throw new ApiError(400, `Payment status is already ${payment_status}`);
    }

    if(!ALLOWED_PAYMENT_TRANSITIONS[order[0].status].includes(payment_status)){
      throw new ApiError(400, `Cannot change status from ${currentStatus} to ${status}`);
    }

    const [result] = await pool.query(`
      UPDATE orders SET payment_status = ? WHERE id = ?
      `, [payment_status, order_id])

    if(result.affectedRows === 0){
      throw new ApiError(500, "Failed to update payment status")
    }

    //create audit logs
    await logAudit({
      userId: req.user.id,
      action: "UPDATE_PAYMENT_STATUS",
      entityType: "orders",
      entityId: Number(order_id),
      details: { status: {from: order[0].payment_status, to: payment_status } },
      ipAddress: req.ip,
    });

    return res
    .status(200)
    .json(new ApiResponse(200, "Payment status updated successfully"))  
})

export const adminCancelOrder = asyncHandler( async(req, res) => {
    const { id:order_id } = req.params;

    const [result] = await pool.query(`
      SELECT id, status FROM orders WHERE id = ?
      `,[order_id])
    
    if(result.length === 0){
      throw new ApiError(404, "Order not found");
    }

    if(result[0].status === 'cancelled' || result[0].status === 'delivered' || result[0].status === 'shipped'){
      throw new ApiError(401, `Order is already ${result[0].status} and cannot be cancelled`)
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction()

      //restore stock  for each item in this order
      const [orderItems] = await connection.query(
        `SELECT product_id, product_variant_id, quantity FROM order_items WHERE order_id = ?`,
        [order_id]
      );

      for (const item of orderItems) {
        if (item.product_variant_id) {
          await connection.query(
            `UPDATE product_variants SET stock = stock + ? WHERE id = ?`,
            [item.quantity, item.product_variant_id]
          );
        }
      }

      const [order] = await connection.query(`
        UPDATE orders SET status = ? WHERE id = ?
        `,['cancelled',order_id])
    
    await connection.commit();
    
    //create audit logs
    await logAudit({
      userId: req.user.id,
      action: "UPDATE_ORDER_STATUS",
      entityType: "orders",
      entityId: Number(order_id),
      details: { status: {from: result[0].status, to: 'cancelled' } },
      ipAddress: req.ip,
    });

    return res
    .status(200)
    .json(new ApiResponse(200, "Order status updated successfully"))

    } catch (error) {
      await connection.rollback();
      throw new ApiError(500, "Failed to cancel the order");
    } finally {
      connection.release();
    }
})

export const getOrderStats = asyncHandler( async(req, res) => {
  //overall count by status
  const [countByStatus] = await pool.query(`
    SELECT status, COUNT(*) AS count 
    FROM orders
    GROUP BY status
    `)
  
  //overall count by payment status
  const [countByPaymentStatus] = await pool.query(`
    SELECT payment_status , COUNT(*) AS count
    FROM orders
    GROUP BY payment_status
    `)

  //total revenum
  const [totalOrderRevenue] = await pool.query(`
    SELECT COALESEC(SUM(total_amount), 0) AS total_revenue
    FROM orders
    WHERE payment_status = 'paid' AND status != 'cancelled'
    `)

  //total number of order
  const [totalOrders] = await pool.query(`
    SELECT COUNT(*) AS total_orders 
    FROM orders`)

  //today order
  const [todayOrders] = await pool.query(`
    SELECT COUNT(*) AS today_orders
    FROM orders
    WHERE DATE(created_at) = CURDATE()
  `)

  //revenue this month
  const [monthlyRevenue] = await pool.query(`
    SELECT COALESCE(SUM(total_amount), 0) AS monthly_revenue
    FROM orders
    WHERE payment_status = 'paid' 
    AND status != 'cancelled'
    AND MONTH(created_at) = MONTH(CURDATE())
    AND YEAR(created_at) = YEAR(CURDATE())
    `)
  
  //average order value
  const [averageOrderValue] = await pool.query(`
    SELECT COALESCE(AVG(total_amount), 0) AS avgOrderValue
    FROM orders
    WHERE payment_status = 'paid' AND status != 'cancelled'
    `)
  
  // reshape status count
  const ordersByStatus = countByStatus.reduce((acc, row) => {
    acc[row.status] = row.count
    return acc
  },{})
  
  const ordersByPaymentStatus = countByPaymentStatus.reduce((acc, row) => {
    acc[row.payment_status] = row.count
    return acc
  },{})

  return res
  .status(200)
  .json(
    new ApiResponse(200, "Order stats fetched successfully", {
      totalOrders: totalOrdersResult[0].total_orders,
      todayOrders: todayOrders[0].today_orders,
      totalRevenue: totalOrderRevenue[0].total_revenue,
      monthRevenue: monthlyRevenue[0].monthly_revenue,
      avgOrderValue:averageOrderValue[0].avgOrderValue,
      ordersByStatus,
      ordersByPaymentStatus,
    })
  );

})