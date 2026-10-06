const bcrypt = require('bcrypt');
const spExecute = require('../utils/spExecute');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const pool = require('../config/database');

const VALID_ROLES = ['Administrator', 'Loader', 'Unloader', 'Cleaner', 'QA_Inspector'];
const SALT_ROUNDS = 12;
const PAGE_SIZE_DEFAULT = 25;

function computeStatus(row) {
  if (row.Is_Active === 0 || row.Is_Active === false) return 'Inactive';
  if (row.Lockout_Until && new Date(row.Lockout_Until) > new Date()) return 'Locked';
  return 'Active';
}

function mapRow(row) {
  return {
    User_ID: row.User_ID,
    Employee_ID: row.Employee_ID || null,
    Full_Name: row.Full_Name,
    Username: row.Username,
    Role: row.Role,
    Department: row.Department || null,
    Designation: row.Designation || null,
    Email: row.Email || null,
    Phone: row.Phone || null,
    Is_Active: row.Is_Active,
    Status: computeStatus(row),
    Last_Login_At: row.Last_Login_At || null,
    Created_At: row.Created_At,
    Created_By: row.Created_By,
    Created_By_Name: row.Created_By_Name || null,
    Updated_At: row.Updated_At || null,
  };
}

async function writeAudit(actorUserId, actionType, targetEntity, targetId, oldValue, newValue, ipAddress, userAgent) {
  try {
    await spExecute('sp_insert_audit_log', [
      actorUserId, actionType, targetEntity, targetId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress || null, userAgent || null,
    ]);
  } catch (err) {
    logger.warn('Failed to write audit log', { actionType, targetEntity, targetId, error: err.message });
  }
}

const userService = {
  async listUsers({ search, role, status, sortBy, sortOrder, page, pageSize }) {
    page = Math.max(1, parseInt(page, 10) || 1);
    pageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (page - 1) * pageSize;

    const params = [];
    const where = [];

    if (search) {
      where.push('(u.Employee_ID LIKE ? OR u.Full_Name LIKE ? OR u.Username LIKE ? OR u.Email LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    if (role && VALID_ROLES.includes(role)) {
      where.push('u.Role = ?');
      params.push(role);
    }

    if (status) {
      if (status === 'Active') {
        where.push('(u.Is_Active = 1 AND (u.Lockout_Until IS NULL OR u.Lockout_Until <= NOW()))');
      } else if (status === 'Inactive') {
        where.push('u.Is_Active = 0');
      } else if (status === 'Locked') {
        where.push('(u.Is_Active = 1 AND u.Lockout_Until > NOW())');
      }
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const allowedSorts = { name: 'u.Full_Name', employee_id: 'u.Employee_ID', role: 'u.Role', created_date: 'u.Created_At', status: 'u.Is_Active' };
    const sortColumn = allowedSorts[sortBy] || 'u.Created_At';
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) AS cnt FROM User_Master u ${whereClause}`;
    const [countRows] = await pool.query(countSql, params);
    const totalCount = countRows[0]?.cnt || 0;

    const dataSql = `
      SELECT u.*, creator.Full_Name AS Created_By_Name
      FROM User_Master u
      LEFT JOIN User_Master creator ON creator.User_ID = u.Created_By
      ${whereClause}
      ORDER BY ${sortColumn} ${direction}
      LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const [rows] = await pool.query(dataSql, params);
    return {
      rows: rows.map(mapRow),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  },

  async getUserById(userId) {
    const [rows] = await pool.query(
      `SELECT u.*, creator.Full_Name AS Created_By_Name
       FROM User_Master u
       LEFT JOIN User_Master creator ON creator.User_ID = u.Created_By
       WHERE u.User_ID = ?`,
      [userId],
    );
    if (rows.length === 0) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    return mapRow(rows[0]);
  },

  async createUser(data, adminUserId, ipAddress, userAgent) {
    const { employeeId, username, password, fullName, role, email, phone, department, designation } = data;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const sp = await spExecute('sp_manage_user', [
      adminUserId, 'CREATE', null, username, passwordHash, fullName, role, null,
    ]);

    if (!sp.success) {
      throw new AppError(409, sp.errorCode, sp.errorMessage);
    }

    const newUserId = sp.data?.[0]?.[0]?.user_id;
    if (!newUserId) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to retrieve new user ID');

    if (employeeId || email || phone || department || designation) {
      const updates = [];
      const updateParams = [];
      if (employeeId !== undefined && employeeId !== null) { updates.push('Employee_ID = ?'); updateParams.push(employeeId); }
      if (email !== undefined && email !== null) { updates.push('Email = ?'); updateParams.push(email); }
      if (phone !== undefined && phone !== null) { updates.push('Phone = ?'); updateParams.push(phone); }
      if (department !== undefined && department !== null) { updates.push('Department = ?'); updateParams.push(department); }
      if (designation !== undefined && designation !== null) { updates.push('Designation = ?'); updateParams.push(designation); }

      if (updates.length > 0) {
        updateParams.push(newUserId);
        try {
          await pool.query(
            `UPDATE User_Master SET ${updates.join(', ')}, Updated_At = NOW(), Updated_By = ? WHERE User_ID = ?`,
            [
                ...updateParams.slice(0, -1),
                adminUserId,
                newUserId
            ],
          );
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            throw new AppError(409, 'DUPLICATE_ENTRY', 'Employee ID or Email already exists');
          }
          throw err;
        }
      }
    }

    await writeAudit(adminUserId, 'CREATE', 'User_Master', newUserId, null,
      { username, fullName, role, employeeId, email, department, designation }, ipAddress, userAgent);

    return this.getUserById(newUserId);
  },

  async updateUser(userId, data, adminUserId, ipAddress, userAgent) {
    const existing = await this.getUserById(userId);

    const sp = await spExecute('sp_manage_user', [
      adminUserId, 'UPDATE', userId,
      null, null,
      data.fullName || null,
      data.role || null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : null,
    ]);

    if (!sp.success) {
      const statusCode = sp.errorCode === 'NOT_FOUND' ? 404 : 409;
      throw new AppError(statusCode, sp.errorCode, sp.errorMessage);
    }

    const profileUpdates = [];
    const profileParams = [];
    if (data.employeeId !== undefined) { profileUpdates.push('Employee_ID = ?'); profileParams.push(data.employeeId); }
    if (data.email !== undefined) { profileUpdates.push('Email = ?'); profileParams.push(data.email); }
    if (data.phone !== undefined) { profileUpdates.push('Phone = ?'); profileParams.push(data.phone); }
    if (data.department !== undefined) { profileUpdates.push('Department = ?'); profileParams.push(data.department); }
    if (data.designation !== undefined) { profileUpdates.push('Designation = ?'); profileParams.push(data.designation); }

    if (profileUpdates.length > 0) {
      profileParams.push(adminUserId, userId);
      try {
        await pool.query(
          `UPDATE User_Master SET ${profileUpdates.join(', ')}, Updated_At = NOW(), Updated_By = ? WHERE User_ID = ?`,
          profileParams,
        );
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          throw new AppError(409, 'DUPLICATE_ENTRY', 'Employee ID or Email already exists');
        }
        throw err;
      }
    }

    await writeAudit(adminUserId, 'UPDATE', 'User_Master', userId,
      { fullName: existing.Full_Name, role: existing.Role, email: existing.Email, department: existing.Department },
      { fullName: data.fullName || existing.Full_Name, role: data.role || existing.Role, email: data.email ?? existing.Email, department: data.department ?? existing.Department },
      ipAddress, userAgent);

    return this.getUserById(userId);
  },

  async deactivateUser(userId, adminUserId, ipAddress, userAgent) {
    const existing = await this.getUserById(userId);

    const sp = await spExecute('sp_manage_user', [
      adminUserId, 'UPDATE', userId, null, null, null, null, 0,
    ]);

    if (!sp.success) {
      throw new AppError(404, sp.errorCode, sp.errorMessage);
    }

    await writeAudit(adminUserId, 'DEACTIVATE', 'User_Master', userId,
      { isActive: existing.Is_Active }, { isActive: 0 }, ipAddress, userAgent);
  },

  async activateUser(userId, adminUserId, ipAddress, userAgent) {
    const existing = await this.getUserById(userId);

    await pool.query(
      'UPDATE User_Master SET Is_Active = 1, Failed_Login_Count = 0, Lockout_Until = NULL, Updated_At = NOW(), Updated_By = ? WHERE User_ID = ?',
      [adminUserId, userId],
    );

    await writeAudit(adminUserId, 'ACTIVATE', 'User_Master', userId,
      { isActive: existing.Is_Active }, { isActive: 1 }, ipAddress, userAgent);
  },

  async resetPassword(userId, adminUserId, ipAddress, userAgent) {
    const existing = await this.getUserById(userId);

    const tempPassword = 'Pblms@' + Math.random().toString(36).slice(2, 8) + '!';
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await pool.query(
      'UPDATE User_Master SET Password_Hash = ?, Updated_At = NOW(), Updated_By = ? WHERE User_ID = ?',
      [passwordHash, adminUserId, userId],
    );

    await writeAudit(adminUserId, 'PASSWORD_RESET', 'User_Master', userId,
      null, { forcePasswordChange: true }, ipAddress, userAgent);

    return { tempPassword, userId };
  },

  async deleteUser(userId, adminUserId, ipAddress, userAgent) {
    const existing = await this.getUserById(userId);

    const [refRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM (
        SELECT Bin_ID FROM Bin_Master WHERE Created_By = ?
        UNION ALL SELECT Bay_ID FROM Bay_Master WHERE Created_By = ?
        UNION ALL SELECT Tank_ID FROM Tank_Master WHERE Created_By = ?
        UNION ALL SELECT Material_ID FROM Material_Master WHERE Created_By = ?
        UNION ALL SELECT Record_ID FROM Loading_Record WHERE Loader_User_ID = ?
        UNION ALL SELECT Record_ID FROM Unloading_Record WHERE Unloader_User_ID = ?
        UNION ALL SELECT Record_ID FROM Cleaning_Record WHERE Cleaner_User_ID = ?
        UNION ALL SELECT Record_ID FROM QA_Record WHERE QA_Inspector_User_ID = ?
      ) refs`,
      [userId, userId, userId, userId, userId, userId, userId, userId],
    );

    if (refRows[0]?.cnt > 0) {
      throw new AppError(409, 'USER_HAS_REFERENCES',
        'Cannot delete user with existing operational references. Deactivate instead.');
    }

    const [auditRows] = await pool.query('SELECT COUNT(*) AS cnt FROM Audit_Log WHERE Actor_User_ID = ?', [userId]);
    if (auditRows[0]?.cnt > 0) {
      throw new AppError(409, 'USER_HAS_AUDIT_TRAIL',
        'Cannot delete user with audit trail. Deactivate instead.');
    }

    await pool.query('DELETE FROM User_Master WHERE User_ID = ?', [userId]);

    await writeAudit(adminUserId, 'DELETE', 'User_Master', userId,
      { username: existing.Username, fullName: existing.Full_Name }, null, ipAddress, userAgent);
  },

  async getRoleOptions() {
    return VALID_ROLES.map(r => ({ value: r, label: r === 'QA_Inspector' ? 'QA Inspector' : r }));
  },
};

module.exports = userService;
