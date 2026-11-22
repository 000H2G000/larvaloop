/**
 * Consistent success envelope:
 * { success: true, message, data, meta? }
 * Errors use { success: false, message, code, details? } (see errorMiddleware).
 */
export class ApiResponse {
  static send(res, { statusCode = 200, message = 'OK', data = null, meta } = {}) {
    const body = { success: statusCode < 400, message, data };
    if (meta !== undefined) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  static ok(res, data, message = 'OK', meta) {
    return ApiResponse.send(res, { statusCode: 200, message, data, meta });
  }

  static created(res, data, message = 'Created') {
    return ApiResponse.send(res, { statusCode: 201, message, data });
  }

  /** Paginated list: meta carries page, limit, total, totalPages. */
  static paginated(res, items, { page, limit, total }, message = 'OK') {
    return ApiResponse.send(res, {
      message,
      data: items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  }
}
