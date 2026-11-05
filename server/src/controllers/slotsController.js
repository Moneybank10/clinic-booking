const pool = require('../config/db');

function parseDate(value) {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function createSlot(req, res, next) {
  try {
    const start = parseDate(req.body.start_time);
    const end = parseDate(req.body.end_time);

    if (!start || !end) {
      return res.status(400).json({ error: 'start_time and end_time must be valid date-times (ISO 8601)' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'end_time must be after start_time' });
    }
    if (start <= new Date()) {
      return res.status(400).json({ error: 'Slots must start in the future' });
    }

    const { rows } = await pool.query(
      `INSERT INTO slots (start_time, end_time, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, start_time, end_time`,
      [start.toISOString(), end.toISOString(), req.user.id]
    );

    res.status(201).json({ slot: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A slot starting at that time already exists' });
    }
    next(err);
  }
}

async function listOpenSlots(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.start_time, s.end_time
       FROM slots s
       WHERE s.start_time > now()
         AND NOT EXISTS (
           SELECT 1 FROM appointments a
           WHERE a.slot_id = s.id AND a.status = 'booked'
         )
       ORDER BY s.start_time`
    );
    res.json({ slots: rows });
  } catch (err) {
    next(err);
  }
}

async function listAllSlots(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.start_time, s.end_time,
              a.id AS appointment_id, u.name AS patient_name
       FROM slots s
       LEFT JOIN appointments a ON a.slot_id = s.id AND a.status = 'booked'
       LEFT JOIN users u ON u.id = a.patient_id
       WHERE s.start_time > now()
       ORDER BY s.start_time`
    );
    res.json({ slots: rows });
  } catch (err) {
    next(err);
  }
}

async function deleteSlot(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid slot id' });
    }

    const { rowCount } = await pool.query('DELETE FROM slots WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'This slot has booking history and cannot be deleted' });
    }
    next(err);
  }
}

module.exports = { createSlot, listOpenSlots, listAllSlots, deleteSlot };