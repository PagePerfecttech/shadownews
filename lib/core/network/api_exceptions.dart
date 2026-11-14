class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic details;

  ApiException({
    required this.message,
    this.statusCode,
    this.details,
  });

  @override
  String toString() => 'ApiException: [$statusCode] $message';
}

class NetworkException extends ApiException {
  NetworkException({super.message = 'No Internet Connection'})
      : super(statusCode: 0);
}

class UnauthorizedException extends ApiException {
  UnauthorizedException({super.message = 'Unauthorized Access'})
      : super(statusCode: 401);
}

class ServerException extends ApiException {
  ServerException({super.message = 'Internal Server Error', int? statusCode})
      : super(statusCode: statusCode ?? 500);
}
