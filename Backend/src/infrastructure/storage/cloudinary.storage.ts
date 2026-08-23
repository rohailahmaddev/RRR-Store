import fs from "fs"
import cloudinary from "../../config/cloudinary.js"
import { UploadApiResponse } from "cloudinary";
import { getErrorMessage } from "../../shared/utility/tryCatchError.js";
import { ApiError } from "../../shared/utility/ApiError.js";

const deleteLocalFile = (filePath : string) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (err) {
        console.error(`Failed to delete local file: ${filePath}`, err)
    }
}

const uploadOnCloudinary = async (localFilePath:string) : Promise<UploadApiResponse> => {
    try {
        const response = await cloudinary.uploader.upload(
            localFilePath,{
                resource_type:"auto"
            }
        )

         
        // delete file from server
        deleteLocalFile(localFilePath)

        return response
       
    } catch (error) {
        deleteLocalFile(localFilePath)
        throw new ApiError(502,`Cloudinary upload failed ${getErrorMessage(error)}`)
    }
}


const deleteFromCloudinary = async (publicId : string) => {
    try {
        await cloudinary.uploader.destroy(publicId)
    } catch (error) {
        throw new ApiError(501, `Failed to delete image. ${getErrorMessage(error)}`)
    }
}


export { uploadOnCloudinary, deleteFromCloudinary }