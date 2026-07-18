import pool from "../db/index.db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

export const addToCart = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { product_id: productId, size_id: sizeId, quantity = 1 } = req.body;

    //validate size stock
    const [sizeRows] = await pool.query(`
        SELECT stock FROM product_sizes WHERE product_id = ? AND id = ?
        `, [productId, sizeId])

    if (sizeRows.length === 0) {
        throw new ApiError(404, "Product size not found");
    }

    if (sizeRows[0].stock < quantity) {
        throw new ApiError(400, "Insufficient stock");
    }

    const connection = await pool.getConnection()
    try {

        await connection.beginTransaction();

        //find and create cart
        const [cartRows] = await connection.query(`SELECT id FROM cart WHERE user_id = ?`, [userId])

        let cart_id
        if (cartRows.length > 0) {
            cart_id = cartRows[0].id;
        } else {
            const [newCart] = await connection.query(`
                INSERT INTO cart ( user_id ) VALUES ( ? ) 
                `, [userId])
            cart_id = newCart.insertId;
        }


        const [result] = await connection.query(`
           UPDATE product_size
           SET stock = stock - ?
           WHERE id = ?
           AND stock >= ?
           `,[quantity, sizeId, quantity]);

        if (result.affectedRows === 0) {
            throw new ApiError(400, "Insufficient stock.");
        }

        await connection.query(`
            INSERT INTO cart_items ( cart_id, product_id, size_id, quantity ) 
            VALUES( ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + ?
            `, [cart_id, productId, sizeId, quantity, quantity])

        await connection.commit();

        return res
            .status(200)
            .json(new ApiResponse(200, "Item added to cart"))

    } catch (error) {

        await connection.rollback()

        throw new ApiError(500, "Faild to place your order")
    } finally {
        await connection.release()
    }

})

export const getCart = asyncHandler(async (req, res) => {
    const userId = req.user.id;

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

    const card_id = cart[0].id;

    const [items] = await pool.query(`
        SELECT 
        ci.id AS cart_id,
        ci.product_id,
        ci.quantity,
        ci.size_id,
        p.name, 
        p.sku, 
        p.price,
        ps.size_name,
        ( SELECT pi.image_url FROM product_images pi
         WHERE pi.product_id = p.id AND pi.is_primary = true
         limit 1        
        ) AS image_url
        From cart_items ci 
        INNER JOIN products p
        ON ci.product_id = p.id
        LEFT JOIN product_sizes ps
        ON ps.id = ci.size_id
        WHERE p.is_active = true AND ci.cart_id = ?
        `, [card_id])

    if (items.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, "Cart is empty", {
                items: [],
                subtotal: 0,
                totalItems: 0,
            })
        );
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const totalItem = items.reduce((sum, item) => sum + item.quantity, 0)

    return res.status(200).json(
        new ApiResponse(200, "Cart items", {
            items: [items],
            subtotal: subtotal,
            totalItems: totalItem,
        })
    );

})

export const removeCartItem = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Get user's cart
        const [cart] = await connection.query(
            `SELECT id FROM carts WHERE user_id = ?`,
            [userId]
        );

        if (cart.length === 0) {
            throw new ApiError(404, "Cart not found.");
        }

        // Delete the cart item
        const [result] = await connection.query(
            `DELETE FROM cart_items
             WHERE id = ? AND cart_id = ?`,
            [cartItemId, cart[0].id]
        );

        if (result.affectedRows === 0) {
            throw new ApiError(404, "Cart item not found.");
        }

        await connection.commit();

        return res.status(200).json(
            new ApiResponse(200, null, "Item removed from cart successfully.")
        );
    } catch (error) {
        await connection.rollback();
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, error.message);
    } finally {
        connection.release();
    }
});

export const updateCartItemQuantity = asyncHandler(async (req, res) => {

    const userId = req.user.id;
    const { cartItemId } = req.params;
    const { operation } = req.body;

    const [items] = await pool.query(
            `SELECT
                ci.quantity,
                ps.stock
             FROM cart_items ci
             JOIN carts c ON ci.cart_id = c.id
             JOIN product_size ps ON ci.size_id = ps.id
             WHERE ci.id = ? AND c.user_id = ?`,
            [cartItemId, userId]
    );  
    if (items.length === 0) {
        throw new ApiError(404, "Cart item not found.");
    }   
    const item = items[0];  
    if (operation === "increment") {
            if (item.quantity >= item.stock) {
                throw new ApiError(400, "No more stock available.");
            }

            await pool.query(
                `UPDATE cart_items
                 SET quantity = quantity + 1
                 WHERE id = ?`,
                [cartItemId]
            );
    } else if (operation === "decrement") {
            if (item.quantity <= 1) {
                throw new ApiError(400, "Quantity cannot be less than 1.");
            }

            await pool.query(
                `UPDATE cart_items
                 SET quantity = quantity - 1
                 WHERE id = ?`,
                [cartItemId]
            );
    } else {
            throw new ApiError(400, "Invalid operation.");
    }

    return res.status(200).json(
            new ApiResponse(200, null, "Quantity updated successfully.")
    );

});
