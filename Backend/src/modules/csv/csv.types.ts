import { productVariantsList } from "../../shared/types/index.types.js";

export interface importCSVType{
    productName:string;
    description:string;
    price:number;
    categoryName:string;
    sku:string;
    stock:number;
    size_name:string;
    color:string;
    imageLocalPaths:string[];
}

export type importCSVList = importCSVType[]