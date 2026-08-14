export class ApiError extends Error {
  statusCode: number;
  data: null;
  errors: unknown[];

  constructor(
    statusCode:number,
    message = "Something went wrong",
    errors:unknown[] = [],
    stack = ""
) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}