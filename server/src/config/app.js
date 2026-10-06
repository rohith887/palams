const express = require('express');
const helmet = require('helmet');
const app = express();
const corsMiddleware = require('./cors');
app.use(corsMiddleware);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false,
}));

// ---------------------------------------------------------------------------
// 4. Body Parser — 1MB general limit (10MB for upload routes, set per-route)
//    Design spec section 12.3
// ---------------------------------------------------------------------------
const cookieParser = require('cookie-parser');
const { GENERAL_LIMIT } = require('../middleware/requestSizeLimit');
app.use(express.json({ limit: GENERAL_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: GENERAL_LIMIT }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// 5. Request Logger — Structured logging with request correlation IDs
//    Design spec section 11.1: Every request logged with UUID, method, URL,
//    user-agent, status code, and duration. Sensitive headers excluded.
// ---------------------------------------------------------------------------
const requestLogger = require('../middleware/requestLogger');
app.use(requestLogger);

// ---------------------------------------------------------------------------
// 5b. Static file serving for generated QR code images
// ---------------------------------------------------------------------------
const path = require('path');
app.use('/uploads/bin_qr', express.static(path.resolve(__dirname, '..', '..', 'uploads', 'bin_qr')));

// ---------------------------------------------------------------------------
// 6. Routes
// ---------------------------------------------------------------------------
const routes = require('../routes/index');
app.use('/api', routes);

// ---------------------------------------------------------------------------
// 7. Global Error Handler — Structured error handling with SP code mapping
//    Design spec section 11.5: AppError, MySQL errors, validation errors,
//    and uncaught errors all handled. Stack traces never exposed to clients.
// ---------------------------------------------------------------------------
const errorHandler = require('../middleware/errorHandler');
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Catch-all 404 handler for undefined routes
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${_req.method} ${_req.originalUrl} not found`,
    },
  });
});

module.exports = app;