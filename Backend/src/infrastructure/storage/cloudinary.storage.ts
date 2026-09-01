import fs from "fs"
import cloudinary from "../../config/cloudinary.js"
import { UploadApiResponse } from "cloudinary";
import { getErrorMessage } from "../../shared/utility/tryCatchError.js";
import { ApiError } from "../../shared/utility/ApiError.js";
import { uploadImagesList } from "../../shared/types/index.types.js";

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

const uploadImagesOnCloudinary = async (filesLocalPath: string[] = []):Promise<uploadImagesList> => {

  if(filesLocalPath.length === 0) return []

  
  let uploadResult = await Promise.allSettled(
    filesLocalPath.map((filePath) => uploadOnCloudinary(filePath))
  )

  let upload:uploadImagesList = [];

  let failed:string[] = [] ;

  uploadResult.forEach((result, index) => {

    if(result.status === "fulfilled" && result.value){
      upload.push(result.value)
    } else {
      const fp = filesLocalPath[index];
      if (fp) failed.push(fp);
    }
  
  });

  if(failed.length>0){
    await Promise.all(
      upload.map((img) => deleteFromCloudinary(img.public_id))
    )

    throw new ApiError(500,`Failed to upload ${failed.length} image(s).`);
  }

  return upload

}


export const uploadImagesOnCloudinaryService = async(imagesLocalPaths:string[]):Promise<uploadImagesList> => {
    let uploadedImages:uploadImagesList;
    try {
        uploadedImages = await uploadImagesOnCloudinary(imagesLocalPaths)
    } catch (error) {
        throw new ApiError(504, `Failed to upload product images.${getErrorMessage(error)}`);
    }
    return uploadedImages;
}


export { uploadOnCloudinary, deleteFromCloudinary, uploadImagesOnCloudinary }