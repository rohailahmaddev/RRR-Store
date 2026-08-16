export class ApiResponse <T>{
  statusCode:number;
  data: T | null;
  message: string;
  success:boolean;

  constructor(
    statusCode:number,
    message = "Request successful",
    data=null,
) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 300;
  }
}