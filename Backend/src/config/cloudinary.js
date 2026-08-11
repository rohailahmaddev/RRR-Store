import {v2 as cloudinary} from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

//cloudinary configurations
const cloudinaryConnection = cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

export default cloudinaryConnection;