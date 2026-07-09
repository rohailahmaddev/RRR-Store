
export const isAdmin = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res
      .status(403)
      .json(new ApiResponse(403, "Access denied. Admins only."));
  }
  next();
});