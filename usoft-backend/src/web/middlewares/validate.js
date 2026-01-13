export const validate = schema => (req, res, next) => {
  const data = ['GET','DELETE'].includes(req.method) ? req.query : req.body;
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });
  if (['GET','DELETE'].includes(req.method)) req.query = value; else req.body = value;
  next();
};
