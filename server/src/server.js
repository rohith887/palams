
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = require('./config/app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  logger.info(`PBLMS API server started`, {
    port: PORT,
    environment: NODE_ENV,
    nodeVersion: process.version,
  });
});
function gracefulShutdown(signal) {
  logger.info(`${signal} received — initiating graceful shutdown`);
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit if graceful shutdown exceeds 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;