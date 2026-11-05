const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health/db', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT now() AS time');
    res.json({ db: 'connected', time: rows[0].time });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);

const slotRoutes = require('./routes/slotRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

app.use('/api/slots', slotRoutes);
app.use('/api/appointments', appointmentRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;