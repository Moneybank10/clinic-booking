const pool = require('../config/db');

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function bookAppointment(req, res, next) {
  try {
    const slotId = parseId(req.body.slot_id);
    if (!slotId) {
      return res.status(400).json({ error: 'slot_id must be a positive integer' });
    }

    const { rows } = await pool.query(
      `INSERT INTO appointments (slot_id, patient_id)
       SELECT s.id, $2::int
       FROM slots s
       WHERE s.id = $1 AND s.start_time > now()
       RETURNING id, slot_id, status, booked_at`,
      [slotId, req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Slot not found or already in the past' });
    }
    res.status(201).json({ appointment: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Sorry, that slot has just been booked by someone else' });
    }
    next(err);
  }
}

async function myAppointments(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.status, a.booked_at, a.cancelled_at, a.cancel_reason,
              (a.cancelled_by IS NOT NULL AND a.cancelled_by <> a.patient_id) AS cancelled_by_clinic,
              s.start_time, s.end_time
       FROM appointments a
       JOIN slots s ON s.id = a.slot_id
       WHERE a.patient_id = $1
       ORDER BY s.start_time DESC`,
      [req.user.id]
    );
    res.json({ appointments: rows });
  } catch (err) {
    next(err);
  }
}

async function todaySchedule(req, res, next) {
  try {
    const tz = process.env.CLINIC_TIMEZONE || 'Africa/Lagos';
    const { rows } = await pool.query(
      `SELECT a.id, s.start_time, s.end_time,
              u.name AS patient_name, u.email AS patient_email
       FROM appointments a
       JOIN slots s ON s.id = a.slot_id
       JOIN users u ON u.id = a.patient_id
       WHERE a.status = 'booked'
         AND (s.start_time AT TIME ZONE $1::text)::date = (now() AT TIME ZONE $1::text)::date
       ORDER BY s.start_time`,
      [tz]
    );
    res.json({ appointments: rows });
  } catch (err) {
    next(err);
  }
}

async function cancelAppointment(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid appointment id' });
    }

    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) {
      return res.status(400).json({ error: 'A cancellation reason is required' });
    }
    if (reason.length > 500) {
      return res.status(400).json({ error: 'Reason must be 500 characters or fewer' });
    }

    const { rows } = await pool.query(
      `UPDATE appointments
       SET status = 'cancelled', cancelled_at = now(),
           cancelled_by = $2, cancel_reason = $3
       WHERE id = $1
         AND status = 'booked'
         AND ($4 = 'staff' OR patient_id = $2)
       RETURNING id, slot_id, status, cancelled_at, cancel_reason`,
      [id, req.user.id, reason, req.user.role]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'No active appointment found with that id' });
    }
    res.json({ appointment: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { bookAppointment, myAppointments, todaySchedule, cancelAppointment };