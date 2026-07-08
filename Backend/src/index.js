import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/connectDB.js";
import { createProductTable } from "./model/product.model.js";
import { createUserTable } from "./model/user.model.js";
import { createCartTable } from "./model/cart.model.js";
import { createOrderTable } from "./model/order.model.js";



dotenv.config({
    path: "./.env",
});

const PORT = process.env.PORT || 4000;

const startServer = async () => {

    try{
        await connectDB() // test + log connection at startup

        // creates tables if it doesn't exist
         await createUserTable();
         await createProductTable();
         await createCartTable();
         await createOrderTable();

        app.listen(PORT, () => {
           console.log(`Server is running on port http://localhost:${PORT}`);
        })
    }catch(err){
        console.error("Error starting server:", err);
        process.exit(1);
    }

}

startServer()
