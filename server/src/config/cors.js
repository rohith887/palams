
const cors = require('cors');
const logger = require('../utils/logger');

const rawOrigins = process.env.ALLOWED_ORIGIN;

if (!rawOrigins) {
  throw new Error('ALLOWED_ORIGIN environment variable is required');
}


const ALLOWED_ORIGINS = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

const corsMiddleware = cors(corsOptions);

logger.debug(`CORS configured for origins: ${ALLOWED_ORIGINS.join(', ')}`);

module.exports = corsMiddleware;