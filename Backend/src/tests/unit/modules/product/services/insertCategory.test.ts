import { describe, it, expect, vi, beforeEach } from "vitest";
import { insertCategoriesService, } from "../../../../../modules/categories/categories.services.js";
import { getCategoryByName, insertCategory, } from "../../../../../modules/categories/categories.repository.js";


//category service
vi.mock("../../../../../modules/categories/categories.repository.js", () => ({
  getCategoryByName: vi.fn(),
  insertCategory: vi.fn(),
}));

describe("insertCategoriesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return existing category id", async () => {
    const tx = {} as any;

    vi.mocked(getCategoryByName).mockResolvedValue([
      {
        id: 10,
        name: "Mobile Phones",
      },
    ] as any);

    const result = await insertCategoriesService(
      "Mobile Phones",
      tx
    );

    expect(result).toBe(10);

    expect(getCategoryByName).toHaveBeenCalledWith(
      "Mobile Phones",
      tx
    );

    expect(insertCategory).not.toHaveBeenCalled();
  });

  it("should create category when category does not exist", async () => {
    const tx = {} as any;

    vi.mocked(getCategoryByName).mockResolvedValue([]);

    vi.mocked(insertCategory).mockResolvedValue({
      id: 20,
      name: "Mobile Phones",
      slug: "mobile-phones",
    } as any);

    const result = await insertCategoriesService(
      "Mobile Phones",
      tx
    );

    expect(result).toBe(20);

    expect(getCategoryByName).toHaveBeenCalledWith(
      "Mobile Phones",
      tx
    );

    expect(insertCategory).toHaveBeenCalledWith(
      "Mobile Phones",
      "mobile-phones",
      tx
    );
  });

  it("should generate correct slug", async () => {
    const tx = {} as any;

    vi.mocked(getCategoryByName).mockResolvedValue([]);

    vi.mocked(insertCategory).mockResolvedValue({
      id: 30,
    } as any);

    await insertCategoriesService(
      "Men's Fashion & Clothing",
      tx
    );

    expect(insertCategory).toHaveBeenCalledWith(
      "Men's Fashion & Clothing",
      "mens-fashion-clothing",
      tx
    );
  });
});