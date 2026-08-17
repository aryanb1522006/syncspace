export const validate = (schema, source = 'body') => (req, res, next) => {
  const parsed = schema.parse(req[source]);

  // Express 5 exposes req.query through a getter, so assigning a parsed object
  // back to req.query throws before the controller can run. Keep validated query
  // input separately; body and params remain writable.
  if (source === 'query') {
    req.validatedQuery = parsed;
  } else {
    req[source] = parsed;
  }
  next();
};
