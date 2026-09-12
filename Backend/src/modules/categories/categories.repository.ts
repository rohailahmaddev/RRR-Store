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

export const getCategories = async() => {
    const result = await prisma.categories.findMany({
        orderBy:{
            name:'asc'
        }
    })
    return result;
}

export const updateCategory = async(id:number,categoryName:string,slug:string) => {
    return await prisma.categories.update({
        where:{
            id:id
        },
        data:{
            name:categoryName,
            slug:slug
        }
    })
}

export const deleteCategory = async(id:number) => {
    return await prisma.categories.delete({
        where:{id:id}
    })
}