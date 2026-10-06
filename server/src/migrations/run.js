const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const pool = require('../config/database');
const logger = require('../utils/logger');

async function run() {
  logger.info('Running migration 001: Add Bin Code and QR fields');
  try {
    await pool.query(`
      ALTER TABLE Bin_Master
        ADD COLUMN Bin_Code VARCHAR(20) NULL UNIQUE AFTER Bin_Number,
        ADD COLUMN QR_Value VARCHAR(20) NULL AFTER Bin_Code,
        ADD COLUMN QR_Image VARCHAR(255) NULL AFTER QR_Value
    `);
    logger.info('Migration 001 completed successfully');
  } catch (err) {
    if (err.errno === 1060) {
      logger.info('Migration 001 already applied (columns exist)');
    } else {
      logger.error('Migration 001 failed', { error: err.message });
      throw err;
    }
  } finally {
    await pool.end();
  }
}

run().catch(() => process.exit(1));
