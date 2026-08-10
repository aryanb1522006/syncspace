export const validate = (schema, source = 'body') => (req, res, next) => {
  req[source] = schema.parse(req[source]);
  next();
};
