import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import dotenv from "dotenv"


dotenv.config()


//cloudinary configurations
cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})


const deleteLocalFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (err) {
        console.error(`Failed to delete local file: ${filePath}`, err)
    }
}


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        const response = await cloudinary.uploader.upload(
            localFilePath,{
                resource_type:"auto"
            }
        )


        console.log("File is uploaded on cloudinary. File src: " + response.url)
         
        // delete file from server
        deleteLocalFile(localFilePath)


        return response
       
    } catch (error) {
        console.error("Cloudinary upload failed:", error?.message || error)
        deleteLocalFile(localFilePath)
        return null
    }
}


const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId)
    } catch (error) {
        return null
    }
}


export {uploadOnCloudinary, deleteFromCloudinary}
