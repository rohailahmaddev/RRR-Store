class ApiResponse {
  constructor(
    statusCode,
    message = "Request successful",
    data=null,
) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 300;
  }
}

export default ApiResponse;