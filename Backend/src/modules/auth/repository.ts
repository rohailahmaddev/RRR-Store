import { prisma } from "../../config/database.js"
import { userSelect } from "../../shared/types/index.types.js"

export const getUserByEmailRepo = async (email:string)=> {
    const user = await prisma.users.findUnique({
        where:{email:email},
        select:userSelect
    })
    return user;
}

export const UpdateverificationEmailTokenRepo = async (userId:number,verifyToken:string, verifyTokenExpiry:Date) => {
    const result = await prisma.users.update({
        where:{id:userId},
        data:{
            verify_token:verifyToken,
            verify_token_expiry:verifyTokenExpiry
        }
    })

    return result;
}