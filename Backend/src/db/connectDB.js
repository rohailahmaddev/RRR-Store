import mysql from "mysql2/promise"
import pool from "./index.db.js" 


const connectDB = async () => {
    try {

        const connection = await pool.getConnection()
        console.log(`MySQL connected! Host: ${connection.config.host} | DB: ${connection.config.database}`)
        connection.release()

    } catch (error) {

        console.error("MySQL connection error:", error)
        process.exit(1)
        
    }
}


export default connectDB
