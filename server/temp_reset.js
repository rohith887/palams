const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync('admin123', salt);

const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({host:'localhost',port:3306,database:'pblms',user:'root',password:'root',connectionLimit:1});
  await pool.query('UPDATE User_Master SET Password_Hash = ?, Failed_Login_Count = 0, Lockout_Until = NULL WHERE User_ID = 1', [hash]);
  console.log('Password updated to admin123 with hash:', hash);
  await pool.end();
})();
