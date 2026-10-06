const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const spExecute = require('../utils/spExecute');
const { signAccessToken } = require('../utils/tokenUtils');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const pool = require('../config/database');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

const authService = {
  async login(username, password, ipAddress, userAgent) {
    const spResult = await spExecute('sp_login', [username, ipAddress, userAgent]);
    if (!spResult.success) {
      throw new AppError(401, spResult.errorCode, spResult.errorMessage);
    }
    const user = spResult.data[0][0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    console.log("Entered password:", password);
   console.log("Stored hash:", user.password_hash);
   console.log("Password match:", passwordMatch);
    if (!passwordMatch) {
      let newFailCount = 1;
      try {
        const conn = await pool.getConnection();
        try {
          const [rows] = await conn.execute(
            'SELECT Failed_Login_Count FROM User_Master WHERE User_ID = ?', [user.user_id]
          );
          newFailCount = (rows[0]?.Failed_Login_Count || 0) + 1;
          if (newFailCount >= 5) {
            await conn.execute(
              'UPDATE User_Master SET Failed_Login_Count = ?, Lockout_Until = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE User_ID = ?',
              [newFailCount, user.user_id]
            );
            throw new AppError(401, 'AUTH_ACCOUNT_LOCKED', 'Account locked due to too many failed login attempts');
          }
          await conn.execute(
            'UPDATE User_Master SET Failed_Login_Count = ? WHERE User_ID = ?', [newFailCount, user.user_id]
          );
        } finally { conn.release(); }
      } catch (e) { if (e instanceof AppError) throw e; }
      throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid username or password');
    }
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        'UPDATE User_Master SET Failed_Login_Count = 0, Last_Login_At = NOW() WHERE User_ID = ?', [user.user_id]
      );
    } finally { conn.release(); }
    const accessToken = signAccessToken({ userId: user.user_id, role: user.role, fullName: user.full_name });
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = sha256(rawRefreshToken);
    const conn2 = await pool.getConnection();
    try {
      await conn2.execute(
        'INSERT INTO Refresh_Token (User_ID, Token_Hash, Issued_At, Expires_At, Device_Info) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR), ?)',
        [user.user_id, tokenHash, userAgent || null]
      );
    } finally { conn2.release(); }
    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { userId: user.user_id, fullName: user.full_name, role: user.role },
    };
  },

  async refresh(rawToken) {
    console.log('RAW TOKEN:', rawToken);
    console.log('RAW TOKEN LENGTH:', rawToken?.length);
    const tokenHash = sha256(rawToken);
    const spResult = await spExecute('sp_refresh_token', [tokenHash]);
    if (!spResult.success) {
      throw new AppError(401, spResult.errorCode, spResult.errorMessage);
    }
    const tokenData = spResult.data[0][0];
    const accessToken = signAccessToken({ userId: tokenData.user_id, role: tokenData.role, fullName: tokenData.full_name });
    const newRawToken = generateRefreshToken();
    const newHash = sha256(newRawToken);
    const conn = await pool.getConnection();
    try {
      await conn.execute('UPDATE Refresh_Token SET Is_Revoked = 1 WHERE Token_Hash = ?', [tokenHash]);
      await conn.execute(
        'INSERT INTO Refresh_Token (User_ID, Token_Hash, Issued_At, Expires_At) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))',
        [tokenData.user_id, newHash]
      );
    } finally { conn.release(); }
    console.log('[auth.service] refresh: new accessToken length:', accessToken?.length, 'first 20:', accessToken?.substring(0, 20));
    return { accessToken, refreshToken: newRawToken };
  },

  async logout(userId, rawToken) {
    const tokenHash = sha256(rawToken);
    const spResult = await spExecute('sp_logout', [userId, tokenHash]);
    if (!spResult.success) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Logout failed');
    }
  },
};

module.exports = authService;