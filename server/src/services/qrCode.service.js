const QRCode = require('qrcode');
const path = require('path');
const pool = require('../config/database');
const logger = require('../utils/logger');

const QR_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'bin_qr');
const QR_URL_PREFIX = '/uploads/bin_qr';

const qrCodeService = {
  async generateNextBinCode() {
    const [rows] = await pool.query(
      `SELECT GREATEST(
        MAX(CAST(SUBSTRING(COALESCE(Bin_Code, 'BIN000000'), 4) AS UNSIGNED)),
        MAX(CAST(SUBSTRING(COALESCE(QR_Code_Value, 'BIN000000'), 4) AS UNSIGNED))
      ) AS max_seq FROM Bin_Master`
    );
    const nextSeq = (rows[0]?.max_seq || 0) + 1;
    return `BIN${String(nextSeq).padStart(6, '0')}`;
  },

  async generateQrCode(binCode) {
    const filename = `${binCode}.png`;
    const filepath = path.join(QR_DIR, filename);

    await QRCode.toFile(filepath, binCode, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    logger.info('QR code generated', { binCode, filepath });
    return `${QR_URL_PREFIX}/${filename}`;
  },
};

module.exports = qrCodeService;
