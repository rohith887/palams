const pool = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const qaQueueService = {
  async getQueue({
    materialId, bayId, priority, fromDate, toDate, search,
    sortBy = 'oldest', sortOrder = 'ASC', page = 1, pageSize = 25,
  }) {
    if (pageSize && ![25, 50, 100].includes(pageSize)) pageSize = 25;
    if (!page || page < 1) page = 1;

    logger.debug('QA Queue service: fetching queue', {
      materialId, bayId, priority, fromDate, toDate, search, sortBy, sortOrder, page, pageSize,
    });

    const where = ['b.Current_Status IN (?,?) AND b.Is_Active = 1'];
    const params = ['Awaiting_QA', 'Awaiting_Reinspection'];

    if (materialId) { where.push('lr.Material_ID = ?'); params.push(materialId); }
    if (bayId) { where.push('b.Current_Bay_ID = ?'); params.push(bayId); }
    if (priority) {
      if (priority === 'High') where.push('b.Current_Status = ?');
      else if (priority === 'Normal') where.push('b.Current_Status = ?');
      params.push(priority === 'High' ? 'Awaiting_Reinspection' : 'Awaiting_QA');
    }
    if (fromDate) { where.push('cr.Cleaning_Completed_At >= ?'); params.push(fromDate); }
    if (toDate) { where.push('cr.Cleaning_Completed_At <= ?'); params.push(toDate); }
    if (search) { where.push('b.Bin_Number LIKE ?'); params.push(`%${search}%`); }

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countSql = `
      SELECT COUNT(*) AS cnt
      FROM Bin_Master b
      LEFT JOIN Loading_Record lr ON lr.Bin_ID = b.Bin_ID AND lr.Is_Current = 1
      LEFT JOIN Cleaning_Record cr ON cr.Bin_ID = b.Bin_ID AND cr.Cleaning_ID = (
        SELECT MAX(cr2.Cleaning_ID) FROM Cleaning_Record cr2 WHERE cr2.Bin_ID = b.Bin_ID
      )
      ${whereClause}`;

    const [countRows] = await pool.query(countSql, params);
    const totalCount = countRows[0]?.cnt || 0;

    let orderClause;
    switch (sortBy) {
      case 'newest': orderClause = 'cr.Cleaning_Completed_At DESC'; break;
      case 'priority': orderClause = `CASE b.Current_Status WHEN 'Awaiting_Reinspection' THEN 1 ELSE 2 END, cr.Cleaning_Completed_At ASC`; break;
      case 'bin_number': orderClause = 'b.Bin_Number ASC'; break;
      case 'oldest':
      default: orderClause = 'cr.Cleaning_Completed_At ASC'; break;
    }

    const offset = (page - 1) * pageSize;

    const dataSql = `
      SELECT
        b.Bin_ID, b.Bin_Number, b.Current_Status, b.Row_Version,
        bay.Bay_ID, bay.Bay_Code, bay.Bay_Name,
        tank.Tank_ID, tank.Tank_Code, tank.Tank_Name,
        lr.Material_ID, mm.Material_Name, mm.Material_Code, lr.Batch_Number,
        cr.Cleaning_ID, cr.Cleaning_Method, cr.Cleaning_Completed_At,
        cleaner.User_ID AS Cleaner_User_ID, cleaner.Full_Name AS Cleaner_Name,
        lr.Quantity_Loaded, lr.Unit_Of_Measure,
        TIMESTAMPDIFF(MINUTE, cr.Cleaning_Completed_At, NOW()) AS waiting_minutes,
        CASE b.Current_Status WHEN 'Awaiting_Reinspection' THEN 'High' ELSE 'Normal' END AS priority
      FROM Bin_Master b
      LEFT JOIN Bay_Master bay ON bay.Bay_ID = b.Current_Bay_ID
      LEFT JOIN Tank_Master tank ON tank.Tank_ID = b.Current_Tank_ID
      LEFT JOIN Loading_Record lr ON lr.Bin_ID = b.Bin_ID AND lr.Is_Current = 1
      LEFT JOIN Material_Master mm ON mm.Material_ID = lr.Material_ID
      LEFT JOIN Cleaning_Record cr ON cr.Bin_ID = b.Bin_ID AND cr.Cleaning_ID = (
        SELECT MAX(cr2.Cleaning_ID) FROM Cleaning_Record cr2 WHERE cr2.Bin_ID = b.Bin_ID
      )
      LEFT JOIN User_Master cleaner ON cleaner.User_ID = cr.Cleaner_User_ID
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?`;

    const dataParams = [...params, pageSize, offset];
    const [rows] = await pool.query(dataSql, dataParams);

    return { rows, totalCount, page, pageSize };
  },
};

module.exports = qaQueueService;
