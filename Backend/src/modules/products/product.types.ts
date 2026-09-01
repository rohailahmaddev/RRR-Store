import { StringFormatParams } from "zod/v4/core";
import { TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js";
import { productVariantsList } from "../../shared/types/index.types.js";

export interface addProduct{
    productName:string;
    description:string;
    price:number;
    categoryName:string;
    sku:string;
    productVariants:productVariantsList;
    imageLocalPaths:string[];
};

export interface createProducts{
    productName:string;
    description:string;
    price:number;
    categoryId:number;
    sku:string;
    tx:TransactionClient;
};

export interface UpdateProductInput {
  productId: number;
  body: any;
  files: any;
}

export interface getProductInput {
    page:number, 
    limit:number, 
    search_name:string, 
    categoryId:string, 
    min_price:number, 
    max_price:number, 
    sort_by:string
}

