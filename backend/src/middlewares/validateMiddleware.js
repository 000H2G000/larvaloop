/**
 * Validates and replaces req.body / req.query / req.params with parsed Zod output.
 * ZodErrors reach errorMiddleware, which returns 400 VALIDATION_ERROR.
 */
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const key of ['params', 'query', 'body']) {
      if (!schemas[key]) continue;
      const parsed = schemas[key].parse(req[key] ?? {});
      // req.query is a getter in Express 5; define it so this also works after an upgrade.
      Object.defineProperty(req, key, { value: parsed, writable: true, configurable: true, enumerable: true });
    }
    next();
  } catch (err) {
    next(err);
  }
};
