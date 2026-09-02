import { prisma } from "../../config/database.js";
import { deleteFromCloudinary, uploadImagesOnCloudinaryService } from "../../infrastructure/storage/cloudinary.storage.js";
import { ApiError } from "../../shared/utility/ApiError.js";
import { validateVariantsArray } from "../../shared/utility/helper.js";
import { getErrorMessage } from "../../shared/utility/tryCatchError.js";
import { createProduct, createProductImages, updateProduct, deleteProductImages, getProductById, getProductByQuery, getProductCount, getProductImagePublicIds, getSingleProduct, insertProductImages, getProductCategoryIdByProductId, getRelatedProducts } from "./product.repository.js";
import { addProduct, getProductInput } from "./product.types.js";
import { UpdateProductInput } from "./product.types.js"
import { insertCategoriesService } from "../categories/categories.services.js";
import { auditLogs } from "../logs/logs.services.js";
import { Request } from "express";
import { createProductVariants } from "../productVariants/productVariants.repository.js";

export const addProductService = async ({ productName, description, price, categoryName, sku, productVariants, imageLocalPaths }: addProduct) => {

  if (!Array.isArray(productVariants)) {
    throw new ApiError(
      400,
      "productVariants must be an array"
    );
  }

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

export const getProductsCountService = async (RequestQuery: any) => {

  const { search_name, categoryId, min_price, max_price }: getProductInput = RequestQuery;

  // Count total products for pagination
  let count_query = `SELECT COUNT(*) AS total FROM products WHERE is_active = true `
  const count_param = []

  if (search_name) {
    count_query += ` AND name LIKE ?`;
    count_param.push(`%${search_name}%`);
  }

  if (categoryId) {
    count_query += ` AND category_id = ?`
    count_param.push(categoryId)
  }

  //count by min_price
  if (min_price) {
    count_query += ` AND price >= ?`
    count_param.push(min_price)
  }

  //filter by max_price
  if (max_price) {
    count_query += ` AND price <= ?`
    count_param.push(max_price)
  }

  try {
    const totalProducts: unknown = await getProductCount(count_query, count_param)
    return totalProducts;
  } catch (error) {
    throw new ApiError(500, `Failed to fetch products count. ${getErrorMessage(error)}`);
  }

}

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
    query += ` AND products.category_id = ?`
    param.push(categoryId)
  }

  //filter by min_price
  if (min_price) {
    query += ` AND products.price >= ?`
    param.push(min_price)
  }

  //filter by max_price
  if (max_price) {
    query += ` AND products.price <= ?`
    param.push(max_price)
  }

  const sortMap: Record<string, string> = {
    price_asc: "products.price ASC",
    price_desc: "products.price DESC",
    newest: "products.created_at DESC",
    rating: "products.rating DESC",
  };

  query += ` ORDER BY ${sortMap[sort_by] || "products.created_at DESC"}`
  const offset = (Number(page) - 1) * Number(limit)

  query += ` LIMIT ? OFFSET ? `
  param.push(Number(limit), offset)


  try {
    const products = await getProductByQuery(query, param)
    const totalProducts = await getProductsCountService(RequestQuery)
    const total = Number((totalProducts as [{ total: number }])[0].total);
    return { products, totalProducts: total, page: Number(page), limit: Number(limit) };
  } catch (error) {
    throw new ApiError(500, `Failed to fetch products. ${getErrorMessage(error)}`);
  }

}

export const getSingleProductService = async (req: Request) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    throw new ApiError(400, "Invalid product ID");
  }

  try {
    const productId = Number(id)
    const product = await getSingleProduct(productId)

    if (!product || (Array.isArray(product) && product.length === 0)) {
      throw new ApiError(404, "Product not found");
    }

    return Array.isArray(product) ? product[0] : product;;

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to fetch product. ${getErrorMessage(error)}`);
  }
}

export const deactivateProductListingService = async (req: any) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    throw new ApiError(400, "Invalid product ID");
  }

  const productId = Number(id);

  try {
    const product = await getProductById(productId);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    if (!product.is_active) {
      throw new ApiError(400, "Product is already deactivated");
    }

    await updateProduct(productId, { is_active: false }, prisma);

    await auditLogs({
      userId: req?.user?.id,
      action: "DEACTIVATE_PRODUCT_LISTING",
      entityType: "product",
      entityId: productId,
      details: {
        field: "is_active",
        oldValue: product.is_active,
        newValue: false,
      },
      ipAddress: req.ip,
    });

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to deactivate product. ${getErrorMessage(error)}`);
  }

}

export const activateProductListingService = async (req: any) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    throw new ApiError(400, "Invalid product ID");
  }

  const productId = Number(id);

  try {
    const product = await getProductById(productId);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    if (product.is_active) {
      throw new ApiError(400, "Product is already activated");
    }

    await updateProduct(productId, { is_active: true }, prisma);

    await auditLogs({
      userId: req.user.id,
      action: "ACTIVATE_PRODUCT_LISTING",
      entityType: "product",
      entityId: productId,
      details: {
        field: "is_active",
        oldValue: product.is_active,
        newValue: true,
      },
      ipAddress: req.ip,
    });

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to activate product. ${getErrorMessage(error)}`);
  }

}

export const getRelatedProductsService = async (req: any) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    throw new ApiError(400, "Invalid product ID");
  }

  const productId = Number(id);

  try {
    const product = await getProductCategoryIdByProductId(productId);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const relatedProducts = await getRelatedProducts(product?.category_id, productId, product.name);
    return relatedProducts;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to fetch related products. ${getErrorMessage(error)}`);
  }
}