export class ApiError extends Error {
  statusCode: number;
  message:string;
  code:string | null;
  data: null ;
  errors: unknown[] | undefined;

  constructor(
    statusCode:number,
    message = "Something went wrong",
    code:string | null =null,
    errors:unknown[] = [],
    stack = ""
) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.code = code;
    this.data = null;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}