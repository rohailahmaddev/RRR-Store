import { getCategoryByName, insertCategory } from "./categories.repository.js";

export const insertCategoriesService = async (categoryName:string,tx:any):Promise<number> => {
    let categoryId;

    //get existing category of same name
    const existingCategory = await getCategoryByName(categoryName,tx)

    if (existingCategory.length > 0) {

        categoryId = existingCategory[0]?.id;

    } else {

        const slug = categoryName
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-");

        //insert category
        const category = await insertCategory(categoryName, slug, tx)

        categoryId = category?.id;
    }

    return categoryId as number;
}
