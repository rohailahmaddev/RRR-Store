export class ApiError extends Error {
  statusCode: number;
  code:string;
  data: null;
  errors: unknown[];

  constructor(
    statusCode:number,
    code:string,
    message = "Something went wrong",
    errors:unknown[] = [],
    stack = ""
) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
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