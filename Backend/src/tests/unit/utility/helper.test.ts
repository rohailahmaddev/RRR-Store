import { describe, expect, it } from "vitest";
import { calculateQuantity, calculateSubTotal, comparePassword, hashPassword, hashToken, parseJson, validateVariantsArray } from "../../../shared/utility/helper.js";
import { boolean, string } from "zod";
import { ApiError } from "../../../shared/utility/ApiError.js";
import { Decimal } from "@prisma/client/runtime/client";

describe("hashToken", () =>{
    it("Should hash the token", () => {
       const result = hashToken("a9F7kP2xL8mQ4zW1vN5bC3jH6dG9fY2s")
       expect(result).toBeTypeOf("string")
       expect(result.length).toBeGreaterThan(0)
    })
})

describe("hashPassword",() => {
    it("Should hash the password",async () => {
        const result = await hashPassword("140986rao")
        expect(result).toBeTypeOf("string")
        expect(result.length).toBeGreaterThan(0)
    })
})

describe("comparePassword",()=> {
    it("Should compare password", async() =>{
        const hash = await hashPassword("140986rao")
        const result = await comparePassword("140986rao",hash)
        expect(result).toBeTypeOf("boolean")
        expect(result).toBe(true)
    })
})

describe("parseJson",() => {
    it("Should parse json to array", () =>{
        const result = parseJson(`["Apple","Banana","Orange"]`)
        expect(Array.isArray(result)).toBe(true)
    })
})

describe("validateVariantsArray", () => {
  it("returns default variant when array is empty", () => {
    const result = validateVariantsArray([]);
    expect(result).toEqual([{ size_name: "Standard", color: "Default", stock: 0 }]);
  });

  it("maps valid variants correctly", () => {
    const input = [
      { size_name: "M", color: "Red", stock: 10 },
      { size_name: "L", color: "Blue", stock: 5 },
    ];
    const result = validateVariantsArray(input);
    expect(result).toEqual([
      { size_name: "M", color: "Red", stock: 10 },
      { size_name: "L", color: "Blue", stock: 5 },
    ]);
  });

  it("defaults size_name to 'Standard' when missing/empty", () => {
    const input = [{ size_name: "", color: "Red", stock: 3 }];
    const result = validateVariantsArray(input);
    expect(result[0]?.size_name).toBe("Standard");
  });

  it("defaults color to 'Default' when missing/empty", () => {
    const input = [{ size_name: "M", color: "", stock: 3 }];
    const result = validateVariantsArray(input);
    expect(result[0]?.color).toBe("Default");
  });

  it("throws ApiError when stock is undefined", () => {
    const input = [{ size_name: "M", color: "Red", stock: undefined }];
    expect(() => validateVariantsArray(input as any)).toThrow(ApiError);
  });

  it("throws ApiError with correct index in message", () => {
    const input = [
      { size_name: "M", color: "Red", stock: 10 },
      { size_name: "L", color: "Blue", stock: undefined },
    ];
    expect(() => validateVariantsArray(input as any)).toThrow(
      "Variant at index 1 has an invalid or missing stock value"
    );
  });

  it("throws ApiError with status code 400", () => {
    const input = [{ size_name: "M", color: "Red", stock: undefined }];
    try {
      validateVariantsArray(input as any);
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(400);
    }
  });

  it("allows stock of 0 (falsy but defined)", () => {
    const input = [{ size_name: "M", color: "Red", stock: 0 }];
    const result = validateVariantsArray(input);
    expect(result[0]?.stock).toBe(0);
  });

  it("preserves order of multiple variants", () => {
    const input = [
      { size_name: "S", color: "Green", stock: 1 },
      { size_name: "M", color: "Yellow", stock: 2 },
      { size_name: "L", color: "Black", stock: 3 },
    ];
    const result = validateVariantsArray(input);
    expect(result.map((v) => v.size_name)).toEqual(["S", "M", "L"]);
  });
});

describe("calculateSubtotal", () => {
  it("should calculate the subtotal correctly", () => {
    const result = calculateSubTotal([
      { quantity: 2, product:{price:new Decimal(100.78) }},
      { quantity: 3, product:{price: new Decimal(50.89) }},
    ]);

    expect(result).toBe(354.23);
  });
});

describe("calculateTotalItems", () => {
  it("should calculate the items correctly", () => {
    const result = calculateQuantity([
      { quantity: 2, product:{price:new Decimal(100.78) }},
      { quantity: 3, product:{price: new Decimal(50.89) }},
    ]);

    expect(result).toBe(5);
  });
});