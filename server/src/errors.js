export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function notFound(req, res) {
  res.status(404).json({ message: 'Endpoint tidak ditemukan.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error?.name === 'ZodError') {
    return res.status(400).json({
      message: 'Data tidak valid.',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Ukuran file maksimal 5 MB.' });
  }

  if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'File harus dikirim pada field "file".' });
  }

  const status = Number(error?.status) || 500;
  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({
    message: status >= 500 ? 'Terjadi kesalahan pada server.' : error.message,
    details: error?.details || undefined,
  });
}
