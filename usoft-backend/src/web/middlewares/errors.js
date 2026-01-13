export function notFound(_req, res, _next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, _req, res, _next) {
  console.error('ERROR:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
}
