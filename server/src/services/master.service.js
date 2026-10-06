const spExecute = require('../utils/spExecute');
const AppError = require('../utils/AppError');
const pool = require('../config/database');
const logger = require('../utils/logger');

const masterService = {
  // Bays
  async listBays(activeOnly = true) {
    const sql = activeOnly ? 'SELECT * FROM Bay_Master WHERE Is_Active = 1 ORDER BY Bay_Code' : 'SELECT * FROM Bay_Master ORDER BY Bay_Code';
    const [rows] = await pool.query(sql);
    return rows;
  },
  async createBay(data, adminId) {
    const sp = await spExecute('sp_manage_bay', ['CREATE', adminId, null, data.bayCode, data.bayName, data.locationDescription || null]);
    if (!sp.success) throw new AppError(409, sp.errorCode, sp.errorMessage);
    return sp.data[0][0];
  },
  async updateBay(bayId, data, adminId) {
    const sp = await spExecute('sp_manage_bay', ['UPDATE', adminId, bayId, null, data.bayName, data.locationDescription || null]);
    if (!sp.success) throw new AppError(404, sp.errorCode, sp.errorMessage);
  },
  async deactivateBay(bayId, adminId) {
    const sp = await spExecute('sp_manage_bay', ['DEACTIVATE', adminId, bayId, null, null, null]);
    if (!sp.success) throw new AppError(409, sp.errorCode, sp.errorMessage);
  },

  // Tanks
  async listTanks(bayId = null) {
    let sql = 'SELECT * FROM Tank_Master WHERE Is_Active = 1';
    const params = [];
    if (bayId) { sql += ' AND Bay_ID = ?'; params.push(bayId); }
    sql += ' ORDER BY Tank_Code';
    const [rows] = await pool.query(sql, params);
    return rows;
  },
  async createTank(data, adminId) {
    const sp = await spExecute('sp_manage_tank', ['CREATE', adminId, null, data.bayId, data.tankCode, data.tankName, data.tankCapacity || null]);
    if (!sp.success) throw new AppError(409, sp.errorCode, sp.errorMessage);
    return sp.data[0][0];
  },
  async updateTank(tankId, data, adminId) {
    const sp = await spExecute('sp_manage_tank', ['UPDATE', adminId, tankId, data.bayId, null, data.tankName, data.tankCapacity || null]);
    if (!sp.success) throw new AppError(404, sp.errorCode, sp.errorMessage);
  },
  async deactivateTank(tankId, adminId) {
    const sp = await spExecute('sp_manage_tank', ['DEACTIVATE', adminId, tankId, null, null, null, null]);
    if (!sp.success) throw new AppError(409, sp.errorCode, sp.errorMessage);
  },

  // Materials
  async listMaterials(activeOnly = true) {
    const sql = activeOnly ? 'SELECT * FROM Material_Master WHERE Is_Active = 1 ORDER BY Material_Code' : 'SELECT * FROM Material_Master ORDER BY Material_Code';
    const [rows] = await pool.query(sql);
    return rows;
  },
  async createMaterial(data, adminId) {
    const sp = await spExecute('sp_manage_material', ['CREATE', adminId, null, data.materialCode, data.materialName, data.materialCategory || null, data.hazardLevel, data.tempMin || null, data.tempMax || null, data.handlingInstructions || null]);
    if (!sp.success) throw new AppError(409, sp.errorCode, sp.errorMessage);
    return sp.data[0][0];
  },
  async updateMaterial(id, data, adminId) {
    const sp = await spExecute('sp_manage_material', ['UPDATE', adminId, id, null, data.materialName, data.materialCategory || null, data.hazardLevel, data.tempMin || null, data.tempMax || null, data.handlingInstructions || null]);
    if (!sp.success) throw new AppError(404, sp.errorCode, sp.errorMessage);
  },
  async deactivateMaterial(id, adminId) {
    const sp = await spExecute('sp_manage_material', ['DEACTIVATE', adminId, id, null, null, null, null, null, null, null]);
    if (!sp.success) throw new AppError(409, sp.errorCode, sp.errorMessage);
  },

  // Lookups
  async listBinTypes() {
    const [rows] = await pool.query('SELECT * FROM Bin_Type_Master WHERE Is_Active = 1 ORDER BY Type_Code');
    return rows;
  },
  async listBinCategories() {
    const [rows] = await pool.query('SELECT * FROM Bin_Category_Master WHERE Is_Active = 1 ORDER BY Category_Code');
    return rows;
  },
};

module.exports = masterService;