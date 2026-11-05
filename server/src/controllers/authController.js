const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (![name, email, password].every((v) => typeof v === 'string' && v.trim())) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'patient')
       RETURNING id, name, email, role`,
      [name.trim(), cleanEmail, passwordHash]
    );

    const user = rows[0];
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, role, password_hash
       FROM users WHERE LOWER(email) = $1`,
      [email.trim().toLowerCase()]
    );

    const user = rows[0];
    const valid = user && (await bcrypt.compare(password, user.password_hash));

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token: signToken(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };