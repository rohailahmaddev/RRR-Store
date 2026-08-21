import { describe, it, expect } from "vitest";
import { createAddressSchema, updateAddressSchema } from "../../../validations/address.validation.js"; // adjust path
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, } from "../../../validations/auth.validation.js"; 
import { addToCartSchema, updateCartItemSchema } from "../../../validations/cart.validation.js";
import { createCategorySchema, updateCategorySchema } from "../../../validations/category.validation.js";
import { imageUploadSchema } from "../../../validations/file.validation.js";
import { createOrderSchema } from "../../../validations/order.validation.js";
import { paginationSchema, productFilterSchema, idParamSchema } from "../../../validations/pagination.validation.js"; // adjust path
import { productVariantSchema, productVariantsSchema, createProductSchema, } from "../../../validations/product.validation.js";
import { createReviewSchema } from "../../../validations/review.validation.js";

//address validations
describe("createAddressSchema", () => {
  const validAddress = {
    label: "Home",
    full_name: "Rohail Rao",
    street: "123 Main Street",
    city: "Lahore",
    state: "Punjab",
    country: "Pakistan",
    postal_code: "54000",
    is_default: true,
  };

  it("passes with a fully valid address", () => {
    const result = createAddressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it("passes with only required fields (optional fields omitted)", () => {
    const minimal = {
      full_name: "Rohail Rao",
      street: "123 Main Street",
      city: "Lahore",
      country: "Pakistan",
    };
    const result = createAddressSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("trims whitespace from string fields", () => {
    const result = createAddressSchema.safeParse({
      ...validAddress,
      full_name: "  Rohail Rao  ",
      city: "  Lahore  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).toBe("Rohail Rao");
      expect(result.data.city).toBe("Lahore");
    }
  });

  describe("required fields", () => {
    it("fails when full_name is missing", () => {
      const { full_name, ...rest } = validAddress;
      const result = createAddressSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("fails when street is missing", () => {
      const { street, ...rest } = validAddress;
      const result = createAddressSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("fails when city is missing", () => {
      const { city, ...rest } = validAddress;
      const result = createAddressSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("fails when country is missing", () => {
      const { country, ...rest } = validAddress;
      const result = createAddressSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields", () => {
    it("passes when label is omitted", () => {
      const { label, ...rest } = validAddress;
      const result = createAddressSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });

    it("passes when state is omitted", () => {
      const { state, ...rest } = validAddress;
      const result = createAddressSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });

    it("passes when postal_code is omitted", () => {
      const { postal_code, ...rest } = validAddress;
      const result = createAddressSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });

    it("passes when is_default is omitted", () => {
      const { is_default, ...rest } = validAddress;
      const result = createAddressSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });
  });

  describe("field length / type constraints", () => {
    it("fails when full_name is shorter than 2 characters", () => {
      const result = createAddressSchema.safeParse({ ...validAddress, full_name: "A" });
      expect(result.success).toBe(false);
    });

    it("fails when full_name exceeds 100 characters", () => {
      const result = createAddressSchema.safeParse({
        ...validAddress,
        full_name: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("fails when street is shorter than 3 characters", () => {
      const result = createAddressSchema.safeParse({ ...validAddress, street: "ab" });
      expect(result.success).toBe(false);
    });

    it("fails when street exceeds 255 characters", () => {
      const result = createAddressSchema.safeParse({
        ...validAddress,
        street: "a".repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it("fails when city is shorter than 2 characters", () => {
      const result = createAddressSchema.safeParse({ ...validAddress, city: "A" });
      expect(result.success).toBe(false);
    });

    it("fails when country is shorter than 2 characters", () => {
      const result = createAddressSchema.safeParse({ ...validAddress, country: "A" });
      expect(result.success).toBe(false);
    });

    it("fails when label exceeds 50 characters", () => {
      const result = createAddressSchema.safeParse({
        ...validAddress,
        label: "a".repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it("fails when postal_code exceeds 20 characters", () => {
      const result = createAddressSchema.safeParse({
        ...validAddress,
        postal_code: "1".repeat(21),
      });
      expect(result.success).toBe(false);
    });

    it("fails when is_default is not a boolean", () => {
      const result = createAddressSchema.safeParse({
        ...validAddress,
        is_default: "yes",
      });
      expect(result.success).toBe(false);
    });

    it("fails when full_name is not a string (e.g. number)", () => {
      const result = createAddressSchema.safeParse({ ...validAddress, full_name: 123 });
      expect(result.success).toBe(false);
    });
  });

  it("fails when body is an empty object", () => {
    const result = createAddressSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("strips unknown/extra fields by default", () => {
    const result = createAddressSchema.safeParse({ ...validAddress, extra_field: "junk" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).extra_field).toBeUndefined();
    }
  });
});

describe("updateAddressSchema", () => {
  it("passes with an empty object (all fields optional via .partial())", () => {
    const result = updateAddressSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("passes with only a single field provided", () => {
    const result = updateAddressSchema.safeParse({ city: "Karachi" });
    expect(result.success).toBe(true);
  });

  it("passes with a partial set of fields", () => {
    const result = updateAddressSchema.safeParse({
      city: "Karachi",
      is_default: false,
    });
    expect(result.success).toBe(true);
  });

  it("still enforces field constraints when a field IS provided", () => {
    const result = updateAddressSchema.safeParse({ city: "A" }); // still too short
    expect(result.success).toBe(false);
  });

  it("still enforces type constraints when a field IS provided", () => {
    const result = updateAddressSchema.safeParse({ is_default: "yes" }); // not boolean
    expect(result.success).toBe(false);
  });

  it("passes with a fully valid full update", () => {
    const result = updateAddressSchema.safeParse({
      label: "Office",
      full_name: "Rohail Rao",
      street: "456 Second Street",
      city: "Islamabad",
      state: "Federal",
      country: "Pakistan",
      postal_code: "44000",
      is_default: false,
    });
    expect(result.success).toBe(true);
  });

  it("trims whitespace on provided fields", () => {
    const result = updateAddressSchema.safeParse({ city: "  Karachi  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe("Karachi");
    }
  });
});

//password validations
describe("registerSchema", () => {
  const validPayload = {
    email: "Test@Example.com",
    password: "password1",
    full_name: "Rohail Rao",
    phone: "03001234567",
  };

  it("passes with a fully valid payload", () => {
    const result = registerSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("passes without optional phone", () => {
    const { phone, ...rest } = validPayload;
    const result = registerSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("lowercases and trims email", () => {
    const result = registerSchema.safeParse({ ...validPayload, email: "  Test@EXAMPLE.com  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  it("fails on invalid email format", () => {
    const result = registerSchema.safeParse({ ...validPayload, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("fails when email is missing", () => {
    const { email, ...rest } = validPayload;
    const result = registerSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("fails when password is shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...validPayload, password: "1234567" });
    expect(result.success).toBe(false);
  });

  it("fails when password exceeds 10 characters", () => {
    const result = registerSchema.safeParse({ ...validPayload, password: "12345678901" });
    expect(result.success).toBe(false);
  });

  it("passes with password at exactly 8 characters (lower boundary)", () => {
    const result = registerSchema.safeParse({ ...validPayload, password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("passes with password at exactly 10 characters (upper boundary)", () => {
    const result = registerSchema.safeParse({ ...validPayload, password: "1234567890" });
    expect(result.success).toBe(true);
  });

  it("fails when full_name is shorter than 2 characters", () => {
    const result = registerSchema.safeParse({ ...validPayload, full_name: "A" });
    expect(result.success).toBe(false);
  });

  it("fails when full_name exceeds 30 characters", () => {
    const result = registerSchema.safeParse({ ...validPayload, full_name: "A".repeat(31) });
    expect(result.success).toBe(false);
  });

  it("trims full_name", () => {
    const result = registerSchema.safeParse({ ...validPayload, full_name: "  Rohail Rao  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).toBe("Rohail Rao");
    }
  });

  it("fails when phone is shorter than 7 characters", () => {
    const result = registerSchema.safeParse({ ...validPayload, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("fails when phone exceeds 20 characters", () => {
    const result = registerSchema.safeParse({ ...validPayload, phone: "1".repeat(21) });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("passes with valid email and non-empty password", () => {
    const result = loginSchema.safeParse({ email: "test@example.com", password: "anything" });
    expect(result.success).toBe(true);
  });

  it("lowercases and trims email", () => {
    const result = loginSchema.safeParse({ email: "  Test@EXAMPLE.com  ", password: "x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  it("fails on invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("fails when password is empty string", () => {
    const result = loginSchema.safeParse({ email: "test@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("fails when password is missing", () => {
    const result = loginSchema.safeParse({ email: "test@example.com" });
    expect(result.success).toBe(false);
  });

  it("accepts a single-character password (no min length beyond 1)", () => {
    const result = loginSchema.safeParse({ email: "test@example.com", password: "a" });
    expect(result.success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("passes with a valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "test@example.com" });
    expect(result.success).toBe(true);
  });

  it("lowercases and trims email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "  Test@EXAMPLE.com  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  it("fails on invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("fails when email is missing", () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("passes with valid token and password", () => {
    const result = resetPasswordSchema.safeParse({ token: "abc123", password: "password1" });
    expect(result.success).toBe(true);
  });

  it("fails when token is empty string", () => {
    const result = resetPasswordSchema.safeParse({ token: "", password: "password1" });
    expect(result.success).toBe(false);
  });

  it("fails when token is missing", () => {
    const result = resetPasswordSchema.safeParse({ password: "password1" });
    expect(result.success).toBe(false);
  });

  it("fails when password is shorter than 8 characters", () => {
    const result = resetPasswordSchema.safeParse({ token: "abc123", password: "short" });
    expect(result.success).toBe(false);
  });

  it("fails when password exceeds 10 characters", () => {
    const result = resetPasswordSchema.safeParse({ token: "abc123", password: "12345678901" });
    expect(result.success).toBe(false);
  });

  it("trims token", () => {
    const result = resetPasswordSchema.safeParse({ token: "  abc123  ", password: "password1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe("abc123");
    }
  });
});

describe("changePasswordSchema", () => {
  const validPayload = {
    current_password: "oldpass1",
    new_password: "newpass1",
    confirm_password: "newpass1",
  };

  it("passes when new_password and confirm_password match", () => {
    const result = changePasswordSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("fails when new_password and confirm_password do not match", () => {
    const result = changePasswordSchema.safeParse({
      ...validPayload,
      confirm_password: "different1",
    });
    expect(result.success).toBe(false);
  });

  it("attaches mismatch error to confirm_password path", () => {
    const result = changePasswordSchema.safeParse({
      ...validPayload,
      confirm_password: "different1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const flattened = result.error.flatten();
      expect(flattened.fieldErrors.confirm_password).toContain("Passwords do not match");
    }
  });

  it("fails when current_password is empty", () => {
    const result = changePasswordSchema.safeParse({ ...validPayload, current_password: "" });
    expect(result.success).toBe(false);
  });

  it("fails when new_password is shorter than 8 characters", () => {
    const result = changePasswordSchema.safeParse({
      ...validPayload,
      new_password: "short1",
      confirm_password: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("fails when confirm_password is empty", () => {
    const result = changePasswordSchema.safeParse({ ...validPayload, confirm_password: "" });
    expect(result.success).toBe(false);
  });

  it("fails when any required field is missing", () => {
    const { current_password, ...rest } = validPayload;
    const result = changePasswordSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

//cart validations
describe("addToCartSchema", () => {
  const validPayload = {
    product_id: 1,
    product_variant_id: 2,
    quantity: 3,
  };

  it("passes with a fully valid payload", () => {
    const result = addToCartSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("passes when product_variant_id is omitted (optional)", () => {
    const { product_variant_id, ...rest } = validPayload;
    const result = addToCartSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("passes when product_variant_id is explicitly null (nullable)", () => {
    const result = addToCartSchema.safeParse({ ...validPayload, product_variant_id: null });
    expect(result.success).toBe(true);
  });

  describe("product_id", () => {
    it("fails when missing", () => {
      const { product_id, ...rest } = validPayload;
      const result = addToCartSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("fails when zero", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, product_id: 0 });
      expect(result.success).toBe(false);
    });

    it("fails when negative", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, product_id: -1 });
      expect(result.success).toBe(false);
    });

    it("fails when not an integer", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, product_id: 1.5 });
      expect(result.success).toBe(false);
    });

    it("fails when not a number (string)", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, product_id: "1" });
      expect(result.success).toBe(false);
    });
  });

  describe("product_variant_id", () => {
    it("fails when zero", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, product_variant_id: 0 });
      expect(result.success).toBe(false);
    });

    it("fails when negative", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, product_variant_id: -5 });
      expect(result.success).toBe(false);
    });

    it("fails when not an integer", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, product_variant_id: 2.5 });
      expect(result.success).toBe(false);
    });
  });

  describe("quantity", () => {
    it("fails when missing", () => {
      const { quantity, ...rest } = validPayload;
      const result = addToCartSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("fails when zero", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, quantity: 0 });
      expect(result.success).toBe(false);
    });

    it("fails when negative", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, quantity: -1 });
      expect(result.success).toBe(false);
    });

    it("fails when not an integer", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, quantity: 1.5 });
      expect(result.success).toBe(false);
    });

    it("passes at quantity = 1 (lower boundary)", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, quantity: 1 });
      expect(result.success).toBe(true);
    });

    it("passes at quantity = 100 (upper boundary)", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, quantity: 100 });
      expect(result.success).toBe(true);
    });

    it("fails at quantity = 101 (exceeds max)", () => {
      const result = addToCartSchema.safeParse({ ...validPayload, quantity: 101 });
      expect(result.success).toBe(false);
    });
  });

  it("fails when body is an empty object", () => {
    const result = addToCartSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("strips unknown/extra fields by default", () => {
    const result = addToCartSchema.safeParse({ ...validPayload, note: "gift wrap please" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).note).toBeUndefined();
    }
  });
});

describe("updateCartItemSchema", () => {
  it("passes with a valid quantity", () => {
    const result = updateCartItemSchema.safeParse({ quantity: 5 });
    expect(result.success).toBe(true);
  });

  it("fails when quantity is missing", () => {
    const result = updateCartItemSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("fails when quantity is zero", () => {
    const result = updateCartItemSchema.safeParse({ quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("fails when quantity is negative", () => {
    const result = updateCartItemSchema.safeParse({ quantity: -3 });
    expect(result.success).toBe(false);
  });

  it("fails when quantity is not an integer", () => {
    const result = updateCartItemSchema.safeParse({ quantity: 2.5 });
    expect(result.success).toBe(false);
  });

  it("passes at quantity = 1 (lower boundary)", () => {
    const result = updateCartItemSchema.safeParse({ quantity: 1 });
    expect(result.success).toBe(true);
  });

  it("passes at quantity = 100 (upper boundary)", () => {
    const result = updateCartItemSchema.safeParse({ quantity: 100 });
    expect(result.success).toBe(true);
  });

  it("fails at quantity = 101 (exceeds max)", () => {
    const result = updateCartItemSchema.safeParse({ quantity: 101 });
    expect(result.success).toBe(false);
  });

  it("fails when quantity is a string", () => {
    const result = updateCartItemSchema.safeParse({ quantity: "5" });
    expect(result.success).toBe(false);
  });
});

//category validations
describe("createCategorySchema", () => {
  const validPayload = {
    name: "Electronics",
    slug: "electronics",
  };

  it("passes with a fully valid payload", () => {
    const result = createCategorySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("trims and validates name", () => {
    const result = createCategorySchema.safeParse({ ...validPayload, name: "  Electronics  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Electronics");
    }
  });

  describe("name", () => {
    it("fails when missing", () => {
      const { name, ...rest } = validPayload;
      const result = createCategorySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("fails when shorter than 2 characters", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, name: "A" });
      expect(result.success).toBe(false);
    });

    it("fails when exceeds 100 characters", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, name: "A".repeat(101) });
      expect(result.success).toBe(false);
    });

    it("passes at exactly 2 characters (lower boundary)", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, name: "AB" });
      expect(result.success).toBe(true);
    });

    it("passes at exactly 100 characters (upper boundary)", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, name: "A".repeat(100) });
      expect(result.success).toBe(true);
    });

    it("fails when name is only whitespace", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, name: "   " });
      expect(result.success).toBe(false);
    });
  });

  describe("slug", () => {
    it("lowercases and trims slug", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "  Electronics  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("electronics");
      }
    });

    it("accepts hyphenated multi-word slugs", () => {
      const result = createCategorySchema.safeParse({
        ...validPayload,
        slug: "electronics-and-gadgets",
      });
      expect(result.success).toBe(true);
    });

    it("accepts slugs with numbers", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "top-10-gadgets" });
      expect(result.success).toBe(true);
    });

    it("fails when missing", () => {
      const { slug, ...rest } = validPayload;
      const result = createCategorySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("fails on spaces (not converted to hyphens)", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "home appliances" });
      expect(result.success).toBe(false);
    });

    it("fails on underscores", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "home_appliances" });
      expect(result.success).toBe(false);
    });

    it("fails on leading hyphen", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "-electronics" });
      expect(result.success).toBe(false);
    });

    it("fails on trailing hyphen", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "electronics-" });
      expect(result.success).toBe(false);
    });

    it("fails on consecutive hyphens", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "electronics--gadgets" });
      expect(result.success).toBe(false);
    });

    it("fails on special characters", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "electronics!" });
      expect(result.success).toBe(false);
    });

    it("fails when exceeds 120 characters", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "a".repeat(121) });
      expect(result.success).toBe(false);
    });

    it("passes at exactly 120 characters (upper boundary)", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "a".repeat(120) });
      expect(result.success).toBe(true);
    });

    it("fails when slug is empty string after trim", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "   " });
      expect(result.success).toBe(false);
    });

    it("returns the custom 'Invalid slug format' message on regex failure", () => {
      const result = createCategorySchema.safeParse({ ...validPayload, slug: "Invalid Slug!" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const flattened = result.error.flatten();
        expect(flattened.fieldErrors.slug).toContain("Invalid slug format");
      }
    });
  });

  it("fails when body is an empty object", () => {
    const result = createCategorySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("strips unknown/extra fields by default", () => {
    const result = createCategorySchema.safeParse({ ...validPayload, description: "extra" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).description).toBeUndefined();
    }
  });
});

describe("updateCategorySchema", () => {
  it("passes with an empty object (all fields optional via .partial())", () => {
    const result = updateCategorySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("passes when only name is provided", () => {
    const result = updateCategorySchema.safeParse({ name: "Gadgets" });
    expect(result.success).toBe(true);
  });

  it("passes when only slug is provided", () => {
    const result = updateCategorySchema.safeParse({ slug: "gadgets" });
    expect(result.success).toBe(true);
  });

  it("still enforces name length constraint when provided", () => {
    const result = updateCategorySchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("still enforces slug format constraint when provided", () => {
    const result = updateCategorySchema.safeParse({ slug: "Invalid Slug!" });
    expect(result.success).toBe(false);
  });

  it("passes with a fully valid update", () => {
    const result = updateCategorySchema.safeParse({ name: "Gadgets", slug: "gadgets" });
    expect(result.success).toBe(true);
  });

  it("lowercases slug when provided in an update", () => {
    const result = updateCategorySchema.safeParse({ slug: "GADGETS" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("gadgets");
    }
  });
});

//files validations
describe("imageUploadSchema", () => {
  it("passes with 1 image", () => {
    const result = imageUploadSchema.safeParse({ images: ["file1"] });
    expect(result.success).toBe(true);
  });

  it("passes with 5 images (upper boundary)", () => {
    const result = imageUploadSchema.safeParse({ images: [1, 2, 3, 4, 5] });
    expect(result.success).toBe(true);
  });

  it("fails with 0 images", () => {
    const result = imageUploadSchema.safeParse({ images: [] });
    expect(result.success).toBe(false);
  });

  it("fails with more than 5 images", () => {
    const result = imageUploadSchema.safeParse({ images: [1, 2, 3, 4, 5, 6] });
    expect(result.success).toBe(false);
  });

  it("fails when images key is missing", () => {
    const result = imageUploadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("fails when images is not an array", () => {
    const result = imageUploadSchema.safeParse({ images: "not-an-array" });
    expect(result.success).toBe(false);
  });

  it("accepts any element type (z.any() has no real validation)", () => {
    const result = imageUploadSchema.safeParse({ images: [null, undefined, {}, 123, "str"] });
    expect(result.success).toBe(true); // demonstrates the schema's weak typing
  });
});

//order
describe("createOrderSchema", () => {
  const validPayload = {
    address_id: 1,
    payment_method: "cod",
  };

  it("passes with a fully valid payload", () => {
    const result = createOrderSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  describe("address_id", () => {
    it("fails when missing", () => {
      const { address_id, ...rest } = validPayload;
      const result = createOrderSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("fails when zero", () => {
      const result = createOrderSchema.safeParse({ ...validPayload, address_id: 0 });
      expect(result.success).toBe(false);
    });

    it("fails when negative", () => {
      const result = createOrderSchema.safeParse({ ...validPayload, address_id: -1 });
      expect(result.success).toBe(false);
    });

    it("fails when not an integer", () => {
      const result = createOrderSchema.safeParse({ ...validPayload, address_id: 1.5 });
      expect(result.success).toBe(false);
    });

    it("fails when not a number (string)", () => {
      const result = createOrderSchema.safeParse({ ...validPayload, address_id: "1" });
      expect(result.success).toBe(false);
    });
  });

  describe("payment_method", () => {
    it.each(["cod", "stripe", "paypal", "jazzcash", "easypaisa"])(
      "accepts '%s' as a valid payment method",
      (method) => {
        const result = createOrderSchema.safeParse({ ...validPayload, payment_method: method });
        expect(result.success).toBe(true);
      }
    );

    it("fails when missing", () => {
      const { payment_method, ...rest } = validPayload;
      const result = createOrderSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("fails on an unsupported payment method", () => {
      const result = createOrderSchema.safeParse({ ...validPayload, payment_method: "bitcoin" });
      expect(result.success).toBe(false);
    });

    it("fails on empty string", () => {
      const result = createOrderSchema.safeParse({ ...validPayload, payment_method: "" });
      expect(result.success).toBe(false);
    });

    it("is case-sensitive ('COD' is rejected)", () => {
      const result = createOrderSchema.safeParse({ ...validPayload, payment_method: "COD" });
      expect(result.success).toBe(false);
    });

    it("fails when not a string (e.g. number)", () => {
      const result = createOrderSchema.safeParse({ ...validPayload, payment_method: 123 });
      expect(result.success).toBe(false);
    });
  });

  it("fails when body is an empty object", () => {
    const result = createOrderSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("strips unknown/extra fields by default", () => {
    const result = createOrderSchema.safeParse({ ...validPayload, note: "leave at door" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).note).toBeUndefined();
    }
  });
});

//pagination
describe("paginationSchema", () => {
  it("applies defaults when nothing is provided", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 1, limit: 20 });
    }
  });

  it("coerces string query params into numbers (real-world Express query shape)", () => {
    const result = paginationSchema.safeParse({ page: "2", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 2, limit: 50 });
    }
  });

  describe("page", () => {
    it("fails when zero", () => {
      const result = paginationSchema.safeParse({ page: "0" });
      expect(result.success).toBe(false);
    });

    it("fails when negative", () => {
      const result = paginationSchema.safeParse({ page: "-1" });
      expect(result.success).toBe(false);
    });

    it("fails when not an integer", () => {
      const result = paginationSchema.safeParse({ page: "1.5" });
      expect(result.success).toBe(false);
    });

    it("fails when not numeric at all", () => {
      const result = paginationSchema.safeParse({ page: "abc" });
      expect(result.success).toBe(false);
    });
  });

  describe("limit", () => {
    it("fails when zero", () => {
      const result = paginationSchema.safeParse({ limit: "0" });
      expect(result.success).toBe(false);
    });

    it("fails when exceeds 100", () => {
      const result = paginationSchema.safeParse({ limit: "101" });
      expect(result.success).toBe(false);
    });

    it("passes at exactly 100 (upper boundary)", () => {
      const result = paginationSchema.safeParse({ limit: "100" });
      expect(result.success).toBe(true);
    });

    it("fails when negative", () => {
      const result = paginationSchema.safeParse({ limit: "-5" });
      expect(result.success).toBe(false);
    });
  });
});

describe("productFilterSchema", () => {
  it("passes with only pagination defaults (all filters optional)", () => {
    const result = productFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      });
    }
  });

  it("passes with a full set of filters, all as query-string strings", () => {
    const result = productFilterSchema.safeParse({
      page: "2",
      limit: "10",
      category_id: "3",
      min_price: "100",
      max_price: "500",
      rating: "4",
      search: "shoes",
      sort: "price",
      order: "asc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 2,
        limit: 10,
        category_id: 3,
        min_price: 100,
        max_price: 500,
        rating: 4,
        search: "shoes",
        sort: "price",
        order: "asc",
      });
    }
  });

  describe("category_id", () => {
    it("fails when zero", () => {
      const result = productFilterSchema.safeParse({ category_id: "0" });
      expect(result.success).toBe(false);
    });

    it("fails when not an integer", () => {
      const result = productFilterSchema.safeParse({ category_id: "1.5" });
      expect(result.success).toBe(false);
    });

    it("is valid when omitted", () => {
      const result = productFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("min_price / max_price", () => {
    it("accepts zero (nonnegative allows 0)", () => {
      const result = productFilterSchema.safeParse({ min_price: "0" });
      expect(result.success).toBe(true);
    });

    it("fails when negative", () => {
      const result = productFilterSchema.safeParse({ min_price: "-1" });
      expect(result.success).toBe(false);
    });

    it("fails cross-field validation when min_price > max_price", () => {
      const result = productFilterSchema.safeParse({ min_price: "500", max_price: "100" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const flattened = result.error.flatten();
        expect(flattened.fieldErrors.max_price).toContain(
          "max_price must be greater than min_price"
        );
      }
    });

    it("passes when min_price equals max_price", () => {
      const result = productFilterSchema.safeParse({ min_price: "100", max_price: "100" });
      expect(result.success).toBe(true);
    });

    it("passes when min_price < max_price", () => {
      const result = productFilterSchema.safeParse({ min_price: "50", max_price: "200" });
      expect(result.success).toBe(true);
    });

    it("skips cross-field check when only min_price is provided", () => {
      const result = productFilterSchema.safeParse({ min_price: "500" });
      expect(result.success).toBe(true);
    });

    it("skips cross-field check when only max_price is provided", () => {
      const result = productFilterSchema.safeParse({ max_price: "100" });
      expect(result.success).toBe(true);
    });
  });

  describe("rating", () => {
    it("passes at 0 (lower boundary)", () => {
      const result = productFilterSchema.safeParse({ rating: "0" });
      expect(result.success).toBe(true);
    });

    it("passes at 5 (upper boundary)", () => {
      const result = productFilterSchema.safeParse({ rating: "5" });
      expect(result.success).toBe(true);
    });

    it("fails above 5", () => {
      const result = productFilterSchema.safeParse({ rating: "5.1" });
      expect(result.success).toBe(false);
    });

    it("fails below 0", () => {
      const result = productFilterSchema.safeParse({ rating: "-1" });
      expect(result.success).toBe(false);
    });

    it("allows fractional ratings within range (e.g. 4.5)", () => {
      const result = productFilterSchema.safeParse({ rating: "4.5" });
      expect(result.success).toBe(true);
    });
  });

  describe("search", () => {
    it("trims whitespace", () => {
      const result = productFilterSchema.safeParse({ search: "  shoes  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("shoes");
      }
    });

    it("fails when exceeds 100 characters", () => {
      const result = productFilterSchema.safeParse({ search: "a".repeat(101) });
      expect(result.success).toBe(false);
    });

    it("is valid when omitted", () => {
      const result = productFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("sort", () => {
    it.each(["created_at", "price", "name", "rating"])(
      "accepts '%s' as a valid sort field",
      (sortValue) => {
        const result = productFilterSchema.safeParse({ sort: sortValue });
        expect(result.success).toBe(true);
      }
    );

    it("defaults to 'created_at' when omitted", () => {
      const result = productFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("created_at");
      }
    });

    it("fails on an unsupported sort field", () => {
      const result = productFilterSchema.safeParse({ sort: "popularity" });
      expect(result.success).toBe(false);
    });
  });

  describe("order", () => {
    it.each(["asc", "desc"])("accepts '%s' as a valid order", (orderValue) => {
      const result = productFilterSchema.safeParse({ order: orderValue });
      expect(result.success).toBe(true);
    });

    it("defaults to 'desc' when omitted", () => {
      const result = productFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe("desc");
      }
    });

    it("fails on an invalid order value", () => {
      const result = productFilterSchema.safeParse({ order: "sideways" });
      expect(result.success).toBe(false);
    });
  });

  it("still enforces pagination constraints inherited from paginationSchema", () => {
    const result = productFilterSchema.safeParse({ limit: "500" });
    expect(result.success).toBe(false);
  });
});

describe("idParamSchema", () => {
  it("coerces a string route param into a number", () => {
    const result = idParamSchema.safeParse({ id: "42" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(42);
    }
  });

  it("fails when id is zero", () => {
    const result = idParamSchema.safeParse({ id: "0" });
    expect(result.success).toBe(false);
  });

  it("fails when id is negative", () => {
    const result = idParamSchema.safeParse({ id: "-5" });
    expect(result.success).toBe(false);
  });

  it("fails when id is not an integer", () => {
    const result = idParamSchema.safeParse({ id: "4.5" });
    expect(result.success).toBe(false);
  });

  it("fails when id is not numeric", () => {
    const result = idParamSchema.safeParse({ id: "abc" });
    expect(result.success).toBe(false);
  });

  it("fails when id is missing", () => {
    const result = idParamSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

//products
describe("productVariantSchema", () => {
  it("should validate a valid product variant", () => {
    const variant = {
      size_name: "Large",
      color: "Black",
      stock: 10,
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(true);
  });

  it("should reject empty size_name", () => {
    const variant = {
      size_name: "",
      color: "Black",
      stock: 10,
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(false);
  });

  it("should reject whitespace-only size_name", () => {
    const variant = {
      size_name: "   ",
      color: "Black",
      stock: 10,
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(false);
  });

  it("should reject size_name longer than 50 characters", () => {
    const variant = {
      size_name: "a".repeat(51),
      color: "Black",
      stock: 10,
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(false);
  });

  it("should reject empty color", () => {
    const variant = {
      size_name: "Large",
      color: "",
      stock: 10,
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(false);
  });

  it("should reject color longer than 50 characters", () => {
    const variant = {
      size_name: "Large",
      color: "a".repeat(51),
      stock: 10,
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(false);
  });

  it("should accept stock of 0", () => {
    const variant = {
      size_name: "Large",
      color: "Black",
      stock: 0,
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(true);
  });

  it("should reject negative stock", () => {
    const variant = {
      size_name: "Large",
      color: "Black",
      stock: -1,
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(false);
  });

  it("should reject decimal stock", () => {
    const variant = {
      size_name: "Large",
      color: "Black",
      stock: 10.5,
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(false);
  });

  it("should reject non-number stock", () => {
    const variant = {
      size_name: "Large",
      color: "Black",
      stock: "10",
    };

    const result = productVariantSchema.safeParse(variant);

    expect(result.success).toBe(false);
  });
});

describe("productVariantsSchema", () => {
  it("should validate an array of valid variants", () => {
    const variants = [
      {
        size_name: "Small",
        color: "Black",
        stock: 10,
      },
      {
        size_name: "Large",
        color: "White",
        stock: 20,
      },
    ];

    const result = productVariantsSchema.safeParse(variants);

    expect(result.success).toBe(true);
  });

  it("should allow an empty variants array", () => {
    const result = productVariantsSchema.safeParse([]);

    expect(result.success).toBe(true);
  });

  it("should reject duplicate size and color combinations", () => {
    const variants = [
      {
        size_name: "Large",
        color: "Black",
        stock: 10,
      },
      {
        size_name: "Large",
        color: "Black",
        stock: 20,
      },
    ];

    const result = productVariantsSchema.safeParse(variants);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: [1],
          message: "Duplicate size and color combination",
        })
      );
    }
  });

  it("should treat size and color combinations as case-insensitive", () => {
    const variants = [
      {
        size_name: "Large",
        color: "Black",
        stock: 10,
      },
      {
        size_name: "large",
        color: "black",
        stock: 20,
      },
    ];

    const result = productVariantsSchema.safeParse(variants);

    expect(result.success).toBe(false);
  });

  it("should allow same size with different colors", () => {
    const variants = [
      {
        size_name: "Large",
        color: "Black",
        stock: 10,
      },
      {
        size_name: "Large",
        color: "White",
        stock: 20,
      },
    ];

    const result = productVariantsSchema.safeParse(variants);

    expect(result.success).toBe(true);
  });

  it("should allow same color with different sizes", () => {
    const variants = [
      {
        size_name: "Small",
        color: "Black",
        stock: 10,
      },
      {
        size_name: "Large",
        color: "Black",
        stock: 20,
      },
    ];

    const result = productVariantsSchema.safeParse(variants);

    expect(result.success).toBe(true);
  });
});

describe("createProductSchema", () => {
  const validProduct = {
    sku: "SKU-001",
    name: "Black T-Shirt",
    description: "A black cotton t-shirt",
    price: 29.99,
    category_id: 1,
    variants: [
      {
        size_name: "Large",
        color: "Black",
        stock: 10,
      },
    ],
  };

  it("should validate a valid product", () => {
    const result = createProductSchema.safeParse(validProduct);

    expect(result.success).toBe(true);
  });

  it("should validate product without optional description", () => {
    const product = {
      ...validProduct,
      description: undefined,
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(true);
  });

  it("should validate product without optional variants", () => {
    const product = {
      ...validProduct,
      variants: undefined,
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(true);
  });

  it("should reject empty SKU", () => {
    const product = {
      ...validProduct,
      sku: "",
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject SKU longer than 50 characters", () => {
    const product = {
      ...validProduct,
      sku: "a".repeat(51),
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject product name shorter than 2 characters", () => {
    const product = {
      ...validProduct,
      name: "A",
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject product name longer than 255 characters", () => {
    const product = {
      ...validProduct,
      name: "a".repeat(256),
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject negative price", () => {
    const product = {
      ...validProduct,
      price: -10,
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should accept price of 0", () => {
    const product = {
      ...validProduct,
      price: 0,
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(true);
  });

  it("should reject infinite price", () => {
    const product = {
      ...validProduct,
      price: Infinity,
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject NaN price", () => {
    const product = {
      ...validProduct,
      price: NaN,
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject non-integer category_id", () => {
    const product = {
      ...validProduct,
      category_id: 1.5,
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject category_id of 0", () => {
    const product = {
      ...validProduct,
      category_id: 0,
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject negative category_id", () => {
    const product = {
      ...validProduct,
      category_id: -1,
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject non-number category_id", () => {
    const product = {
      ...validProduct,
      category_id: "1",
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject description longer than 5000 characters", () => {
    const product = {
      ...validProduct,
      description: "a".repeat(5001),
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject invalid variants", () => {
    const product = {
      ...validProduct,
      variants: [
        {
          size_name: "",
          color: "Black",
          stock: 10,
        },
      ],
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });

  it("should reject duplicate variants", () => {
    const product = {
      ...validProduct,
      variants: [
        {
          size_name: "Large",
          color: "Black",
          stock: 10,
        },
        {
          size_name: "large",
          color: "black",
          stock: 20,
        },
      ],
    };

    const result = createProductSchema.safeParse(product);

    expect(result.success).toBe(false);
  });
});

//review
describe("createReviewSchema", () => {
  const validReview = {
    product_id: 1,
    rating: 5,
    comment: "Excellent product!",
  };

  it("should validate a valid review", () => {
    const result = createReviewSchema.safeParse(validReview);

    expect(result.success).toBe(true);
  });

  it("should validate review without optional comment", () => {
    const review = {
      product_id: 1,
      rating: 5,
    };

    const result = createReviewSchema.safeParse(review);

    expect(result.success).toBe(true);
  });

  describe("product_id", () => {
    it("should reject product_id of 0", () => {
      const review = {
        ...validReview,
        product_id: 0,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should reject negative product_id", () => {
      const review = {
        ...validReview,
        product_id: -1,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should reject decimal product_id", () => {
      const review = {
        ...validReview,
        product_id: 1.5,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should reject non-number product_id", () => {
      const review = {
        ...validReview,
        product_id: "1",
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should accept a positive integer product_id", () => {
      const review = {
        ...validReview,
        product_id: 100,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(true);
    });
  });

  describe("rating", () => {
    it("should accept rating 1", () => {
      const review = {
        ...validReview,
        rating: 1,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(true);
    });

    it("should accept rating 5", () => {
      const review = {
        ...validReview,
        rating: 5,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(true);
    });

    it("should reject rating below 1", () => {
      const review = {
        ...validReview,
        rating: 0,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should reject rating above 5", () => {
      const review = {
        ...validReview,
        rating: 6,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should reject decimal rating", () => {
      const review = {
        ...validReview,
        rating: 4.5,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should reject non-number rating", () => {
      const review = {
        ...validReview,
        rating: "5",
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });
  });

  describe("comment", () => {
    it("should accept a valid comment", () => {
      const review = {
        ...validReview,
        comment: "Very good product.",
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(true);
    });

    it("should accept an empty string comment", () => {
      const review = {
        ...validReview,
        comment: "",
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(true);
    });

    it("should accept a comment with exactly 2000 characters", () => {
      const review = {
        ...validReview,
        comment: "a".repeat(2000),
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(true);
    });

    it("should reject a comment longer than 2000 characters", () => {
      const review = {
        ...validReview,
        comment: "a".repeat(2001),
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should reject non-string comment", () => {
      const review = {
        ...validReview,
        comment: 123,
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should trim whitespace from comment", () => {
      const review = {
        ...validReview,
        comment: "   Great product!   ",
      };

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.comment).toBe("Great product!");
      }
    });
  });

  describe("required fields", () => {
    it("should reject missing product_id", () => {
      const { product_id, ...review } = validReview;

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });

    it("should reject missing rating", () => {
      const { rating, ...review } = validReview;

      const result = createReviewSchema.safeParse(review);

      expect(result.success).toBe(false);
    });
  });
});