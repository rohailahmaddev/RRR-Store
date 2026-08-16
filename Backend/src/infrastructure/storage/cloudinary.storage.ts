import fs from "fs"
import cloudinary from "../../config/cloudinary.js"
import { UploadApiResponse } from "cloudinary";

const deleteLocalFile = (filePath : string) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (err) {
        console.error(`Failed to delete local file: ${filePath}`, err)
    }
}

const uploadOnCloudinary = async (localFilePath:string) : Promise<UploadApiResponse | null> => {
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
        const message = error instanceof Error ? error.message : String(error)
        console.error("Cloudinary upload failed:", message)
        deleteLocalFile(localFilePath)
        return null
    }
}


const deleteFromCloudinary = async (publicId : string) => {
    try {
        await cloudinary.uploader.destroy(publicId)
    } catch (error) {
        return null
    }
}


export { uploadOnCloudinary, deleteFromCloudinary }