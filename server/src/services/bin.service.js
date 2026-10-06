const spExecute = require('../utils/spExecute');
const AppError = require('../utils/AppError');
const pool = require('../config/database');
const qrCodeService = require('./qrCode.service');

const binService = {
  async listBins(filters = {}) {
    let sql = `SELECT b.*, bt.Type_Name AS Bin_Type_Name, bc.Category_Name AS Bin_Category_Name
               FROM Bin_Master b
               LEFT JOIN Bin_Type_Master bt ON b.Bin_Type_ID = bt.Bin_Type_ID
               LEFT JOIN Bin_Category_Master bc ON b.Bin_Category_ID = bc.Bin_Category_ID
               WHERE 1=1`;
    const params = [];
    if (filters.status) { sql += ' AND b.Current_Status = ?'; params.push(filters.status); }
    if (filters.binTypeId) { sql += ' AND b.Bin_Type_ID = ?'; params.push(filters.binTypeId); }
    if (filters.binCategoryId) { sql += ' AND b.Bin_Category_ID = ?'; params.push(filters.binCategoryId); }
    if (filters.isActive !== undefined) { sql += ' AND b.Is_Active = ?'; params.push(filters.isActive); }
    if (filters.bayId) { sql += ' AND b.Current_Bay_ID = ?'; params.push(filters.bayId); }
    if (filters.search) { sql += ' AND b.Bin_Code LIKE ?'; params.push(`%${filters.search}%`); }
    sql += ' ORDER BY COALESCE(b.Bin_Code, b.Bin_Number)';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async getBin(binId) {
    const [rows] = await pool.query(
      `SELECT b.*, bt.Type_Name AS Bin_Type_Name, bc.Category_Name AS Bin_Category_Name,
              lr.Loading_ID, lr.Material_ID, mm.Material_Name AS Loading_Material_Name,
              lr.Batch_Number, lr.Quantity_Loaded, lr.Unit_Of_Measure,
              lr.Loader_User_ID, ul.Full_Name AS Loaded_By_Name,
              lr.Loading_Start_At, lr.Loading_Completed_At,
              ur.Unloading_ID, ur.Unloader_User_ID, uu.Full_Name AS Unloaded_By_Name,
              ur.Unloading_Start_At, ur.Unloading_Completed_At, ur.Unloading_Condition,
              cr.Cleaning_ID, cr.Cleaner_User_ID, uc.Full_Name AS Cleaned_By_Name,
              cr.Cleaning_Start_At, cr.Cleaning_Completed_At
       FROM Bin_Master b
       LEFT JOIN Bin_Type_Master bt ON b.Bin_Type_ID = bt.Bin_Type_ID
       LEFT JOIN Bin_Category_Master bc ON b.Bin_Category_ID = bc.Bin_Category_ID
       LEFT JOIN Loading_Record lr ON lr.Loading_ID = (SELECT Loading_ID FROM Loading_Record WHERE Bin_ID = b.Bin_ID ORDER BY Loading_ID DESC LIMIT 1)
       LEFT JOIN Material_Master mm ON lr.Material_ID = mm.Material_ID
       LEFT JOIN User_Master ul ON lr.Loader_User_ID = ul.User_ID
       LEFT JOIN Unloading_Record ur ON ur.Unloading_ID = (SELECT Unloading_ID FROM Unloading_Record WHERE Bin_ID = b.Bin_ID ORDER BY Unloading_ID DESC LIMIT 1)
       LEFT JOIN User_Master uu ON ur.Unloader_User_ID = uu.User_ID
       LEFT JOIN Cleaning_Record cr ON cr.Cleaning_ID = (SELECT Cleaning_ID FROM Cleaning_Record WHERE Bin_ID = b.Bin_ID ORDER BY Cleaning_ID DESC LIMIT 1)
       LEFT JOIN User_Master uc ON cr.Cleaner_User_ID = uc.User_ID
       WHERE b.Bin_ID = ?`, [binId]
    );
    if (rows.length === 0) throw new AppError(404, 'BIN_NOT_FOUND', 'Bin not found');
    return rows[0];
  },

  async registerBin(data, adminId) {
    const binCode = await qrCodeService.generateNextBinCode();
    // Auto-generate Bin Number from the same sequence as Bin_Code
    // Bin_Code = BIN000001  →  Bin_Number = BIN-000001
    const sequenceNumber = binCode.replace(/^BIN/i, '');
    const binNumber = `BIN-${sequenceNumber}`;

    console.log('[TRACE registerBin] Generated Bin_Number:', binNumber, 'Bin_Code:', binCode);
    console.log('[TRACE registerBin] SP params:', { adminId, binNumber, binCode, binTypeId: data.binTypeId, binCategoryId: data.binCategoryId, capacity: data.capacity, capacityUnit: data.capacityUnit });

    const sp = await spExecute('sp_register_bin', [
      adminId, binNumber, binCode, data.binTypeId,
      data.binCategoryId, data.capacity, data.capacityUnit,
    ]);
    console.log('[TRACE registerBin] SP result:', JSON.stringify(sp));
    if (!sp.success) throw new AppError(409, sp.errorCode, sp.errorMessage);

    const bin = sp.data[0][0];
    const binId = bin.bin_id; // SP returns SELECT LAST_INSERT_ID() AS bin_id

    const qrImage = await qrCodeService.generateQrCode(binCode);

    await pool.query(
      'UPDATE Bin_Master SET QR_Image = ? WHERE Bin_ID = ?',
      [qrImage, binId]
    );

    return {
      Bin_ID: binId,
      Bin_Number: binNumber,
      Bin_Code: binCode,
      QR_Value: binCode,
      QR_Image: qrImage,
      Current_Status: 'Awaiting_Loading',
    };
  },

  async updateBin(binId, data, adminId) {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT Current_Status FROM Bin_Master WHERE Bin_ID = ?', [binId]);
      if (rows.length === 0) throw new AppError(404, 'BIN_NOT_FOUND', 'Bin not found');
      if (rows[0].Current_Status !== 'Awaiting_Loading') throw new AppError(409, 'BIN_NOT_MODIFIABLE_IN_CURRENT_STATUS', 'Bin can only be modified in Awaiting_Loading status');
      await conn.query('UPDATE Bin_Master SET Bin_Type_ID = ?, Bin_Category_ID = ?, Capacity = ?, Capacity_Unit = ? WHERE Bin_ID = ?',
        [data.binTypeId, data.binCategoryId, data.capacity, data.capacityUnit, binId]);
    } finally { conn.release(); }
  },

  async deactivateBin(binId, adminId) {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT Current_Status FROM Bin_Master WHERE Bin_ID = ?', [binId]);
      if (rows.length === 0) throw new AppError(404, 'BIN_NOT_FOUND', 'Bin not found');
      if (rows[0].Current_Status !== 'Awaiting_Loading') throw new AppError(409, 'BIN_NOT_MODIFIABLE_IN_CURRENT_STATUS', 'Bin can only be deactivated in Awaiting_Loading status');
      await conn.query('UPDATE Bin_Master SET Is_Active = 0 WHERE Bin_ID = ?', [binId]);
    } finally { conn.release(); }
  },

  async scanBin(qrCode, userId) {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT b.Bin_ID, b.Bin_Number, b.QR_Code_Value, b.Current_Status, b.Is_Active,
                b.Capacity, b.Capacity_Unit, b.Row_Version,
                b.Requires_Admin_Review, b.Consecutive_Fail_Count,
                b.Bin_Code, b.QR_Value, b.QR_Image,
                bt.Type_Name AS Bin_Type_Name, bc.Category_Name AS Bin_Category_Name,
                lr.Loading_ID, lr.Material_ID, mm.Material_Name AS Loading_Material_Name,
                lr.Batch_Number, lr.Quantity_Loaded, lr.Unit_Of_Measure,
                lr.Loader_User_ID, ul.Full_Name AS Loaded_By_Name,
                lr.Loading_Start_At, lr.Loading_Completed_At,
                ur.Unloading_ID, ur.Unloader_User_ID, uu.Full_Name AS Unloaded_By_Name,
                ur.Unloading_Start_At, ur.Unloading_Completed_At, ur.Unloading_Condition,
                cr.Cleaning_ID, cr.Cleaner_User_ID, uc.Full_Name AS Cleaned_By_Name,
                cr.Cleaning_Start_At, cr.Cleaning_Completed_At
         FROM Bin_Master b
         LEFT JOIN Bin_Type_Master bt ON b.Bin_Type_ID = bt.Bin_Type_ID
         LEFT JOIN Bin_Category_Master bc ON b.Bin_Category_ID = bc.Bin_Category_ID
         LEFT JOIN Loading_Record lr ON lr.Loading_ID = (SELECT Loading_ID FROM Loading_Record WHERE Bin_ID = b.Bin_ID ORDER BY Loading_ID DESC LIMIT 1)
         LEFT JOIN Material_Master mm ON lr.Material_ID = mm.Material_ID
         LEFT JOIN User_Master ul ON lr.Loader_User_ID = ul.User_ID
         LEFT JOIN Unloading_Record ur ON ur.Unloading_ID = (SELECT Unloading_ID FROM Unloading_Record WHERE Bin_ID = b.Bin_ID ORDER BY Unloading_ID DESC LIMIT 1)
         LEFT JOIN User_Master uu ON ur.Unloader_User_ID = uu.User_ID
         LEFT JOIN Cleaning_Record cr ON cr.Cleaning_ID = (SELECT Cleaning_ID FROM Cleaning_Record WHERE Bin_ID = b.Bin_ID ORDER BY Cleaning_ID DESC LIMIT 1)
         LEFT JOIN User_Master uc ON cr.Cleaner_User_ID = uc.User_ID
         WHERE b.Bin_Code = ? OR b.QR_Code_Value = ?`,
        [qrCode, qrCode]
      );

      if (rows.length === 0) throw new AppError(404, 'BIN_NOT_FOUND', 'No bin found with this QR code');
      const bin = rows[0];

      if (!bin.Is_Active) throw new AppError(400, 'BIN_INACTIVE', 'This bin is no longer active');
      if (bin.Current_Status === 'Retired') throw new AppError(400, 'BIN_RETIRED', 'This bin has been retired');

      const [lockRows] = await conn.query(
        `SELECT l.Locked_By_User_ID, u.Full_Name AS locked_by_name, l.Operation_Type
         FROM Lock_Table l
         JOIN User_Master u ON u.User_ID = l.Locked_By_User_ID
         WHERE l.Bin_ID = ? AND l.Expires_At > NOW()`,
        [bin.Bin_ID]
      );
      if (lockRows.length > 0) {
        const lock = lockRows[0];
        if (lock.Locked_By_User_ID !== userId) {
          throw new AppError(409, 'BIN_OPERATION_IN_PROGRESS',
            `Bin is currently locked by ${lock.locked_by_name} for ${lock.Operation_Type}`);
        }
        bin._activeLock = lock;
      }

      return bin;
    } finally { conn.release(); }
  },

  async getCurrentLoading(binId) {
    const [rows] = await pool.query(
      `SELECT l.Loading_ID, l.Material_ID, m.Material_Name, l.Batch_Number,
              l.Quantity_Loaded, l.Unit_Of_Measure, l.Expected_Unloading_Date,
              l.Loading_Start_At, l.Is_Current
       FROM Loading_Record l
       LEFT JOIN Material_Master m ON l.Material_ID = m.Material_ID
       WHERE l.Bin_ID = ? AND l.Is_Current = 1
       ORDER BY l.Loading_ID DESC LIMIT 1`,
      [binId],
    );
    if (rows.length === 0) return null;
    return rows[0];
  },

  async getBinByCode(binCode) {
    const [rows] = await pool.query(
      `SELECT b.*, bt.Type_Name AS Bin_Type_Name, bc.Category_Name AS Bin_Category_Name
       FROM Bin_Master b
       LEFT JOIN Bin_Type_Master bt ON b.Bin_Type_ID = bt.Bin_Type_ID
       LEFT JOIN Bin_Category_Master bc ON b.Bin_Category_ID = bc.Bin_Category_ID
       WHERE b.Bin_Code = ?`,
      [binCode]
    );
    if (rows.length === 0) throw new AppError(404, 'BIN_NOT_FOUND', 'Bin not found with this code');
    return rows[0];
  },

  async regenerateQr(binId) {
    const [rows] = await pool.query('SELECT Bin_ID, Bin_Code FROM Bin_Master WHERE Bin_ID = ?', [binId]);
    if (rows.length === 0) throw new AppError(404, 'BIN_NOT_FOUND', 'Bin not found');
    const bin = rows[0];
    if (!bin.Bin_Code) throw new AppError(400, 'BIN_NO_CODE', 'Bin does not have a Bin Code');

    const qrImage = await qrCodeService.generateQrCode(bin.Bin_Code);
    await pool.query('UPDATE Bin_Master SET QR_Image = ? WHERE Bin_ID = ?', [qrImage, binId]);
    return { Bin_ID: bin.Bin_ID, Bin_Code: bin.Bin_Code, QR_Value: bin.Bin_Code, QR_Image: qrImage };
  },
};

module.exports = binService;
