import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProductsService } from "../../../../../modules/products/product.services.js";

import {
    getProductByQuery,
    getProductCount,
} from "../../../../../modules/products/product.repository.js";

vi.mock(
    "../../../../../modules/products/product.repository.js",
    () => ({
        getProductByQuery: vi.fn(),
        getProductCount: vi.fn(),
    })
);

//getProductsService test cases
describe("getProductsService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch products with default pagination", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([
            {
                id: 1,
                sku: "SKU001",
                name: "Laptop",
                price: 1000,
            },
        ] as any);

        vi.mocked(getProductCount).mockResolvedValue([
            {
                total: 1,
            },
        ] as any);

        const result = await getProductsService({});

        console.log("Result:",result)
        expect(result).toEqual({
            products: [
                {
                    id: 1,
                    sku: "SKU001",
                    name: "Laptop",
                    price: 1000,
                },
            ],
            totalProducts: 1,
            page: 1,
            limit: 20,
        });

        expect(getProductByQuery).toHaveBeenCalledTimes(1);
        expect(getProductByQuery).toHaveBeenCalledTimes(1);
    });

    it("should apply search_name filter", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductByQuery).mockResolvedValue([
            {
                total: 0,
            },
        ] as any);

        await getProductsService({
            search_name: "laptop",
        });

        const [query, params] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "AND products.name LIKE ?"
        );

        expect(params).toContain("%laptop%");
    });

    it("should apply category filter", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductByQuery).mockResolvedValue([
            {
                total: 5,
            },
        ] as any);

        await getProductsService({
            categoryId: 3,
        });

        const [query, params] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "AND products.category_id = ?"
        );

        expect(params).toContain(3);
    });

    it("should apply minimum price filter", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductByQuery).mockResolvedValue([
            {
                total: 5,
            },
        ] as any);

        await getProductsService({
            min_price: 100,
        });

        const [query, params] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "AND products.price >= ?"
        );

        expect(params).toContain(100);
    });

    it("should apply maximum price filter", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductByQuery).mockResolvedValue([
            {
                total: 5,
            },
        ] as any);

        await getProductsService({
            max_price: 500,
        });

        const [query, params] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "AND products.price <= ?"
        );

        expect(params).toContain(500);
    });

    it("should apply min and max price filters together", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductByQuery).mockResolvedValue([
            {
                total: 5,
            },
        ] as any);

        await getProductsService({
            min_price: 100,
            max_price: 500,
        });

        const [query, params] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "AND products.price >= ?"
        );

        expect(query).toContain(
            "AND products.price <= ?"
        );

        expect(params).toContain(100);
        expect(params).toContain(500);
    });

    it("should apply category and price filters together", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductByQuery).mockResolvedValue([
            {
                total: 2,
            },
        ] as any);

        await getProductsService({
            categoryId: 5,
            min_price: 100,
            max_price: 1000,
        });

        const [query, params] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "AND products.category_id = ?"
        );

        expect(query).toContain(
            "AND products.price >= ?"
        );

        expect(query).toContain(
            "AND products.price <= ?"
        );

        expect(params).toEqual([
            5,
            100,
            1000,
            20,
            0,
        ]);
    });

    it("should apply price ascending sort", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);
        vi.mocked(getProductCount).mockResolvedValue([
            { total: 0 },
        ] as any);

        await getProductsService({
            sort_by: "price_asc",
        });

        const [query] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "ORDER BY products.price ASC"
        );
    });

    it("should apply price descending sort", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);
        vi.mocked(getProductCount).mockResolvedValue([
            { total: 0 },
        ] as any);

        await getProductsService({
            sort_by: "price_desc",
        });

        const [query] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "ORDER BY products.price DESC"
        );
    });

    it("should apply newest sort", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);
        vi.mocked(getProductCount).mockResolvedValue([
            { total: 0 },
        ] as any);

        await getProductsService({
            sort_by: "newest",
        });

        const [query] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "ORDER BY products.created_at DESC"
        );
    });

    it("should use default sorting for invalid sort value", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);
        vi.mocked(getProductCount).mockResolvedValue([
            { total: 0 },
        ] as any);

        await getProductsService({
            sort_by: "invalid_sort",
        });

        const [query] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "ORDER BY products.created_at DESC"
        );
    });

    it("should calculate pagination correctly", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductCount).mockResolvedValue([
            {
                total: 45,
            },
        ] as any);

        const result = await getProductsService({
            page: 3,
            limit: 10,
        });

        expect(result.page).toBe(3);
        expect(result.limit).toBe(10);
        expect(result.totalProducts).toBe(45);

        const [, params] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(params).toEqual([
            10,
            20,
        ]);
    });

    it("should convert page and limit to numbers", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductByQuery).mockResolvedValue([
            {
                total: 50,
            },
        ] as any);

        const result = await getProductsService({
            page: "2",
            limit: "10",
        });

        expect(result.page).toBe(2);
        expect(result.limit).toBe(10);

        const [, params] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(params).toEqual([
            10,
            10,
        ]);
    });

    it("should throw ApiError when product query fails", async () => {
        vi.mocked(getProductByQuery).mockRejectedValue(
            new Error("Database connection failed")
        );

        await expect(
            getProductsService({})
        ).rejects.toMatchObject({
            statusCode: 500,
        });
    });

    it("should throw ApiError when count query fails", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductByQuery).mockRejectedValue(
            new Error("Count query failed")
        );

        await expect(
            getProductsService({})
        ).rejects.toMatchObject({
            statusCode: 500,
        });
    });

    it("should apply search_name filter to count query", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);

        vi.mocked(getProductCount).mockResolvedValue([
            {
                total: 2,
            },
        ] as any);

        await getProductsService({
            search_name: "iphone",
        });

        const [countQuery, countParams] =
            vi.mocked(getProductCount).mock.calls[0]!;

        expect(countQuery).toContain(
            "AND name LIKE ?"
        );

        expect(countParams).toContain(
            "%iphone%"
        );
    });

    it("should sort products by highest rating first", async () => {
        vi.mocked(getProductByQuery).mockResolvedValue([]);
        vi.mocked(getProductCount).mockResolvedValue([
            { total: 0 },
        ] as any);

        await getProductsService({
            sort_by: "rating",
        });

        const [query] =
            vi.mocked(getProductByQuery).mock.calls[0]!;

        expect(query).toContain(
            "ORDER BY products.rating DESC"
        );
    });

});
