export class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status code
   * @param {string} message Human readable message (safe to return to clients)
   * @param {object} [options]
   * @param {string} [options.code] Stable machine readable error code
   * @param {unknown} [options.details] Extra info, e.g. validation issues
   */
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Bad request', options) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', ...options });
  }

  static unauthorized(message = 'Authentication required', options) {
    return new ApiError(401, message, { code: 'UNAUTHORIZED', ...options });
  }

  static forbidden(message = 'You do not have permission to perform this action', options) {
    return new ApiError(403, message, { code: 'FORBIDDEN', ...options });
  }

  static notFound(message = 'Resource not found', options) {
    return new ApiError(404, message, { code: 'NOT_FOUND', ...options });
  }

  static conflict(message = 'Resource already exists', options) {
    return new ApiError(409, message, { code: 'CONFLICT', ...options });
  }

  static unprocessable(message = 'Unprocessable entity', options) {
    return new ApiError(422, message, { code: 'UNPROCESSABLE', ...options });
  }

  static badGateway(message = 'Upstream service error', options) {
    return new ApiError(502, message, { code: 'BAD_GATEWAY', ...options });
  }

  static serviceUnavailable(message = 'Service unavailable', options) {
    return new ApiError(503, message, { code: 'SERVICE_UNAVAILABLE', ...options });
  }
}
