import { prisma } from "../../config/database.js";

export const insertCategory = async(categoryName:string,slug:string,tx:any) =>{
    const result = await prisma.categories.create({
        data:{
            name:categoryName,
            slug:slug,
        }
    })
    return result;
}

export const getCategoryByName = async(categroyName:string,tx:any) => {
    const result = await prisma.categories.findMany({
        where:{name:categroyName}
    })

    return result
}