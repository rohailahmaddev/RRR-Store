import { prisma } from "../../config/database.js";
import { deleteFromCloudinary, uploadImagesOnCloudinaryService } from "../../infrastructure/storage/cloudinary.storage.js";
import { ApiError } from "../../shared/utility/ApiError.js";
import { validateVariantsArray } from "../../shared/utility/helper.js";
import { getErrorMessage } from "../../shared/utility/tryCatchError.js";
import { createProduct, createProductImages, createProductVariants, deleteProductImages, getProductById, getProductByQuery, getProductCount, getProductImagePublicIds, insertProductImages, updateProduct, updateProductVariants } from "./product.repository.js";
import { addProduct, getProductInput } from "./product.types.js";
import { UpdateProductInput } from "./product.types.js"
import { insertCategoriesService } from "../categories/categories.services.js";

export const addProductService = async ({ productName, description, price, categoryName, sku, productVariants, imageLocalPaths }: addProduct) => {

  const uploadedImages = await uploadImagesOnCloudinaryService(imageLocalPaths);
  let productId
  try {

    await prisma.$transaction(async (tx) => {
      const categoryId = await insertCategoriesService(categoryName, tx);
      const product = await createProduct({ productName, description, price, categoryId, sku, tx });
      productId = product?.id;
      await createProductImages(productId, uploadedImages, tx);
      const validProductVariants = validateVariantsArray(productVariants);
      await createProductVariants(productId, validProductVariants, tx);
    })

  } catch (error) {

    //delete images form cloudinary after failure
    if (uploadedImages.length > 0) {
      await Promise.all(
        uploadedImages.map((img) => deleteFromCloudinary(img.public_id))
      )
    }

    throw new ApiError(500, `Failed to create product. ${getErrorMessage(error)}`);
  }

  return productId;

}

export const updateProductService = async ({ productId, body, files }: UpdateProductInput) => {
  const { productName, description, price, categoryName, sku, } = body;

  if (!Number.isInteger(productId) || productId <= 0) {
    throw new ApiError(400, "Invalid product ID");
  }

  if (price !== undefined && isNaN(Number(price))) {
    throw new ApiError(400, "Price must be a valid number");
  }

  const hasProductVariants = body?.productVariants !== undefined;
  let productVariants: any[];
  if (hasProductVariants) {
    productVariants = body?.productVariants;
    if (!Array.isArray(productVariants)) {
      throw new ApiError(
        400,
        "productVariants must be an array"
      );
    }
  }

  const hasDeletedImagesIds = body?.deletedImageIds !== undefined
  let deletedImageIds: any[] = [];
  if (hasDeletedImagesIds) {
    deletedImageIds = body?.deletedImageIds;
    if (!Array.isArray(deletedImageIds)) {
      throw new ApiError(
        400,
        "Deleted image must be an array"
      );
    }
  }

  // Check product exists
  const existingProduct = await getProductById(productId);
  if (!existingProduct) {
    throw new ApiError(404, "No product found");
  }

  // Upload new images
  let imageLocalPaths: any[] = [];
  if (Object.keys(files).length > 0) {
    const imageFiles = (files as { images?: Express.Multer.File[] } | undefined)?.images ?? [];
    imageLocalPaths = imageFiles?.map(
      (file: Express.Multer.File) => file.path
    ) ?? [];
  }

  let uploadedImages: any[] = [];
  if (Array.isArray(imageLocalPaths) && imageLocalPaths.length > 0) {
    uploadedImages = await uploadImagesOnCloudinaryService(imageLocalPaths)
  }

  // Get public IDs BEFORE deleting DB records
  let deletedImages: any[] = [];
  if (hasDeletedImagesIds) {
    deletedImages = await getProductImagePublicIds(productId, deletedImageIds);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Category
      let categoryId: number | undefined;
      if (categoryName !== undefined) {
        categoryId = await insertCategoriesService(categoryName, tx);
      }

      // Product
      const productData: any = {};
      if (sku !== undefined) productData.sku = sku;
      if (productName !== undefined) productData.name = productName;
      if (description !== undefined) productData.description = description;
      if (price !== undefined) productData.price = Number(price);
      if (categoryId !== undefined) productData.categoryId = categoryId;

      if (Object.keys(productData).length > 0) {
        await updateProduct(productId, productData, tx);
      }

      // Delete images
      if (hasDeletedImagesIds) {
        await deleteProductImages(productId, deletedImageIds, tx);
      }

      // Add new images
      if (uploadedImages && uploadedImages.length > 0) {
        await insertProductImages(productId, uploadedImages, tx);
      }

      // Variants
      if (hasProductVariants) {
        const validatedVariants = validateVariantsArray(productVariants);
        await updateProductVariants(productId, validatedVariants, tx);
      }
    });
  } catch (error: any) {
    // DB failed → remove newly uploaded Cloudinary files
    if (uploadedImages.length > 0) {
      await Promise.all(
        uploadedImages.map((img) => deleteFromCloudinary(img.public_id))
      );
    }
    throw new ApiError(500, `Failed to update product. ${error.message}`);
  }

  // DB succeeded → remove deleted images from Cloudinary
  if (deletedImages.length > 0) {
    await Promise.all(
      deletedImages.map((img) => deleteFromCloudinary(img.public_id))
    );
  }
};

export const getProductsService = async (RequestQuery: any) => {

  const { page = 1, limit = 20, search_name, categoryId, min_price, max_price, sort_by }: getProductInput = RequestQuery;

  let query = `
    SELECT products.id, products.sku, products.name, products.description, products.price, products.rating,
    products.rating_count,
    categories.name AS category_name,

    (
        SELECT image_url 
        FROM product_images 
        WHERE product_images.product_id = products.id 
          AND product_images.is_primary = true 
        LIMIT 1
    ) AS image_url

    FROM products
    LEFT JOIN categories
    ON categories.id = products.category_id

    WHERE products.is_active = true 
    `

  const param: any[] = []

  if (search_name) {
    query += ` AND products.name LIKE ?`;
    param.push(`%${search_name}%`);
  }

  //filter by category
  if (categoryId) {
    query += ` AND category_id = ?`
    param.push(categoryId)
  }

  //filter by min_price
  if (min_price) {
    query += ` AND price >= ?`
    param.push(min_price)
  }

  //filter by max_price
  if (max_price) {
    query += ` AND price <= ?`
    param.push(max_price)
  }

  const sortMap: Record<string, string> = {
    price_asc: "price ASC",
    price_desc: "price DESC",
    newest: "created_at DESC",
    rating: "rating ASC",
  };

  query += ` ORDER BY ${sortMap[sort_by] || "products.created_at DESC"}`
  const offset = (Number(page) - 1) * Number(limit)

  query += ` LIMIT ? OFFSET ? `
  param.push(Number(limit), offset)

  // Count total products for pagination
  let count_query = `SELECT COUNT(*) AS total FROM products WHERE is_active = true `
  const count_param = []

  if (categoryId) {
    count_query += `AND category_id = ?`
    count_param.push(categoryId)
  }

  //count by min_price
  if (min_price) {
    count_query += `AND price >= ?`
    count_param.push(min_price)
  }

  //filter by max_price
  if (max_price) {
    count_query += `AND price <= ?`
    count_param.push(max_price)
  }


  try {
    const products = await getProductByQuery(query, param)
    const totalProducts: unknown = await getProductCount(count_query, count_param)
    console.log("Total Products:", totalProducts);
    return { products, totalProducts: (totalProducts as [{ total: number }])[0].total, page: Number(page), limit: Number(limit) };
  } catch (error) {
    throw new ApiError(500, `Failed to fetch products. ${getErrorMessage(error)}`);
  }

}