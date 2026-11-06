require('dotenv').config();
const pool = require('../src/config/db');

async function main() {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE role = 'staff' ORDER BY id LIMIT 1`
  );
  if (!rows[0]) {
    console.error('No staff user found. Run createStaff.js first.');
    process.exitCode = 1;
    return;
  }
  const staffId = rows[0].id;

  let created = 0;
  for (let day = 1; day <= 3; day++) {
    for (let hour = 9; hour <= 11; hour++) {
      const start = new Date();
      start.setDate(start.getDate() + day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60 * 1000);

      const result = await pool.query(
        `INSERT INTO slots (start_time, end_time, created_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (start_time) DO NOTHING`,
        [start.toISOString(), end.toISOString(), staffId]
      );
      created += result.rowCount;
    }
  }
  console.log(`Created ${created} slots`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());