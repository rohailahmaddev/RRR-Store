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

