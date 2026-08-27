import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utility/asyncHandler.js";
import { exportCSVServices, exportProductVariantsCSVServices, importCSVServices } from "./csv.services.js";
import { ApiResponse } from "../../shared/utility/ApiResponse.js";

export const exportCSVController = asyncHandler(async(req:Request, res:Response) =>{
    const csv = await exportCSVServices(req)
    res.header("Content-Type", "text/csv");
    res.attachment(`products-export-${Date.now()}.csv`);
    res.send(csv);
})

export const exportProductVariantCSVController = asyncHandler(async(req:Request, res:Response) => {
    const csv = await exportProductVariantsCSVServices(req);
    res.header("Content-Type", "text/csv");
    res.attachment(`product-variants-${Date.now()}.csv`);
    res.send(csv);
})

export const importProductVariantCSVController = asyncHandler(async(req:Request, res:Response) => {
    const filePath = req.file?.path;
    await importCSVServices(req,filePath);
    res.status(200).json(new ApiResponse(200, "All products imported successfully from CSV file") );
})
