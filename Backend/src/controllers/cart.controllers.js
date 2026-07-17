import pool from "../db/index.db.js";
import { asyncHandler } from "../utils/AsyncHandler";

export const addToCart = asyncHandler( async (req, res) => {
    const { id:userId } = req.user.id;
    const { productId, sizeId, quantity = 1 } =req.body;

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

    //find and create cart
    const [cartRows] = await pool.query(`SELECT id FROM cart WHERE user_id = ?`,[userId])

    let cart_id 
    if(cartRows.length>0){
        cart_id = cartRows[0].id;
    } else {
        const [newCart] = await pool.query(`
            INSERT INTO cart ( user_id ) VALUES ( ? ) 
            `, [userId])
        cart_id = newCart.insertId;
    }

    const [result] = await pool.query(`
        INSERT INTO cart_items ( cart_id, product_id, size_id, quantity ) 
        VALUES( ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + ?
        `,[cart_id, productId, sizeId, quantity, quantity])
    
    if(result.affectedRows === 0){
        throw new ApiError(500, "Faild to place your order")
    }

    return res
    .status(200)
    .json(new ApiError(200, "Item added to cart"))

})

export const getCart = asyncHandler( async (req, res) => {
    const {id:userId} =req.user.id;

    const [cart] = await pool.query(`SELECT id FROM cart WHERE id = ?`,[userId])

    if(cart.length === 0){
        return res.status(200).json(
          new ApiResponse(200, "Cart is empty", {
            items: [],
            subtotal: 0,
            totalItems: 0,
          })
        );
    }
    
    const card_id = cart[0].id;

    const [cart_items] = await pool.query(`
        SELECT 
        ci.product_id, 
        ci.size_id, 
        ci.quantity 
        FORM cart_items 
        WHERE cart_id = ?
        `,[card_id])
    
    
    
})