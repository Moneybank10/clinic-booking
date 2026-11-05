require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const BASE = `http://localhost:${process.env.PORT || 5000}`;
const stamp = Date.now();
const PW = 'Password123';
const staffEmail = `smoke_staff_${stamp}@test.com`;
const aEmail = `smoke_a_${stamp}@test.com`;
const bEmail = `smoke_b_${stamp}@test.com`;

let passed = 0;
let failed = 0;

function check(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // some responses (like 204) have no body
  }
  return { status: res.status, data };
}

const iso = (date) => date.toISOString();
const base = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
base.setSeconds(0, 0);
const at = (minutes) => new Date(base.getTime() + minutes * 60 * 1000);

async function cleanup() {
  const like = 'smoke_%@test.com';
  await pool.query(
    'DELETE FROM appointments WHERE patient_id IN (SELECT id FROM users WHERE email LIKE $1)',
    [like]
  );
  await pool.query(
    'DELETE FROM slots WHERE created_by IN (SELECT id FROM users WHERE email LIKE $1)',
    [like]
  );
  await pool.query('DELETE FROM users WHERE email LIKE $1', [like]);
}

async function run() {
  console.log('\n[Server]');
  try {
    const h = await api('GET', '/api/health');
    check('server is running', h.status === 200);
  } catch {
    console.log('  Cannot reach the server. Start it with "npm run dev" in another terminal first.');
    process.exitCode = 1;
    return;
  }
  const db = await api('GET', '/api/health/db');
  check('database connection works', db.status === 200, `(got ${db.status})`);

  // Staff accounts are created directly in the database, like tech support would
  const hash = await bcrypt.hash(PW, 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Smoke Staff', $1, $2, 'staff')`,
    [staffEmail, hash]
  );

  console.log('\n[Auth]');
  let r = await api('POST', '/api/auth/register', {
    body: { name: 'Smoke A', email: aEmail, password: PW, role: 'staff' },
  });
  check('register patient A returns 201', r.status === 201, `(got ${r.status})`);
  check('role cannot be self-assigned', r.data?.user?.role === 'patient');
  check('register returns a token', !!r.data?.token);
  const tokenA = r.data?.token;

  r = await api('POST', '/api/auth/register', {
    body: { name: 'Smoke B', email: bEmail, password: PW },
  });
  check('register patient B returns 201', r.status === 201, `(got ${r.status})`);
  const tokenB = r.data?.token;

  r = await api('POST', '/api/auth/register', {
    body: { name: 'Dup', email: aEmail.toUpperCase(), password: PW },
  });
  check('duplicate email (different case) returns 409', r.status === 409, `(got ${r.status})`);

  r = await api('POST', '/api/auth/register', {
    body: { name: 'Weak', email: `smoke_c_${stamp}@test.com`, password: 'short' },
  });
  check('short password returns 400', r.status === 400, `(got ${r.status})`);

  r = await api('POST', '/api/auth/login', { body: { email: aEmail, password: 'wrong-password' } });
  check('login with wrong password returns 401', r.status === 401, `(got ${r.status})`);

  r = await api('POST', '/api/auth/login', { body: { email: staffEmail, password: PW } });
  check('staff login returns 200 with token', r.status === 200 && !!r.data?.token, `(got ${r.status})`);
  check('login response does not leak the password hash', !JSON.stringify(r.data).includes('password_hash'));
  const tokenStaff = r.data?.token;

  r = await api('GET', '/api/auth/me', { token: tokenA });
  check('/me with token returns the right user', r.status === 200 && r.data?.user?.email === aEmail);
  r = await api('GET', '/api/auth/me');
  check('/me without token returns 401', r.status === 401, `(got ${r.status})`);
  r = await api('GET', '/api/auth/me', { token: 'not.a.token' });
  check('/me with a garbage token returns 401', r.status === 401, `(got ${r.status})`);

  console.log('\n[Permissions]');
  r = await api('POST', '/api/slots', {
    token: tokenA,
    body: { start_time: iso(at(0)), end_time: iso(at(30)) },
  });
  check('patient cannot create slots (403)', r.status === 403, `(got ${r.status})`);
  r = await api('POST', '/api/appointments', { token: tokenStaff, body: { slot_id: 1 } });
  check('staff cannot book appointments (403)', r.status === 403, `(got ${r.status})`);
  r = await api('GET', '/api/slots');
  check('listing slots without a token returns 401', r.status === 401, `(got ${r.status})`);
  r = await api('GET', '/api/appointments/today', { token: tokenA });
  check('patient cannot view the staff schedule (403)', r.status === 403, `(got ${r.status})`);

  console.log('\n[Slots]');
  r = await api('POST', '/api/slots', {
    token: tokenStaff,
    body: { start_time: iso(at(0)), end_time: iso(at(30)) },
  });
  check('staff creates slot A (201)', r.status === 201, `(got ${r.status})`);
  const slotA = r.data?.slot;

  r = await api('POST', '/api/slots', {
    token: tokenStaff,
    body: { start_time: iso(at(60)), end_time: iso(at(90)) },
  });
  check('staff creates slot B (201)', r.status === 201, `(got ${r.status})`);
  const slotB = r.data?.slot;

  r = await api('POST', '/api/slots', {
    token: tokenStaff,
    body: { start_time: iso(at(0)), end_time: iso(at(30)) },
  });
  check('duplicate slot start returns 409', r.status === 409, `(got ${r.status})`);

  r = await api('POST', '/api/slots', {
    token: tokenStaff,
    body: { start_time: iso(at(120)), end_time: iso(at(100)) },
  });
  check('end before start returns 400', r.status === 400, `(got ${r.status})`);

  r = await api('POST', '/api/slots', {
    token: tokenStaff,
    body: { start_time: iso(new Date(Date.now() - 3600 * 1000)), end_time: iso(at(0)) },
  });
  check('slot in the past returns 400', r.status === 400, `(got ${r.status})`);

  r = await api('POST', '/api/slots', {
    token: tokenStaff,
    body: { start_time: 'not a date', end_time: 'nope' },
  });
  check('invalid dates return 400', r.status === 400, `(got ${r.status})`);

  r = await api('GET', '/api/slots', { token: tokenA });
  check(
    'open slots include slot A and slot B',
    r.status === 200 &&
      r.data.slots.some((s) => s.id === slotA?.id) &&
      r.data.slots.some((s) => s.id === slotB?.id)
  );

  console.log('\n[Booking and double-booking]');
  r = await api('POST', '/api/appointments', { token: tokenA, body: { slot_id: slotA?.id } });
  check('patient A books slot A (201)', r.status === 201, `(got ${r.status})`);
  const apptA = r.data?.appointment;

  r = await api('POST', '/api/appointments', { token: tokenB, body: { slot_id: slotA?.id } });
  check('patient B booking the same slot returns 409', r.status === 409, `(got ${r.status})`);

  r = await api('GET', '/api/slots', { token: tokenB });
  check('slot A no longer appears as open', !r.data?.slots?.some((s) => s.id === slotA?.id));

  r = await api('POST', '/api/appointments', { token: tokenA, body: { slot_id: 999999 } });
  check('booking a non-existent slot returns 404', r.status === 404, `(got ${r.status})`);

  r = await api('POST', '/api/appointments', { token: tokenA, body: { slot_id: 'abc' } });
  check('invalid slot_id returns 400', r.status === 400, `(got ${r.status})`);

  const [r1, r2] = await Promise.all([
    api('POST', '/api/appointments', { token: tokenA, body: { slot_id: slotB?.id } }),
    api('POST', '/api/appointments', { token: tokenB, body: { slot_id: slotB?.id } }),
  ]);
  const codes = [r1.status, r2.status].sort();
  check(
    'two simultaneous bookings: exactly one 201 and one 409',
    codes[0] === 201 && codes[1] === 409,
    `(got ${codes.join(', ')})`
  );

  r = await api('GET', '/api/appointments/mine', { token: tokenA });
  check(
    'patient A sees their appointments',
    r.status === 200 && r.data.appointments.some((a) => a.id === apptA?.id && a.status === 'booked')
  );

  console.log('\n[Cancelling]');
  r = await api('PATCH', `/api/appointments/${apptA?.id}/cancel`, {
    token: tokenB,
    body: { reason: 'Not mine' },
  });
  check("patient B cannot cancel patient A's appointment (404)", r.status === 404, `(got ${r.status})`);

  r = await api('PATCH', `/api/appointments/${apptA?.id}/cancel`, { token: tokenA, body: {} });
  check('cancelling without a reason returns 400', r.status === 400, `(got ${r.status})`);

  r = await api('PATCH', `/api/appointments/${apptA?.id}/cancel`, {
    token: tokenA,
    body: { reason: 'Feeling better' },
  });
  check('patient A cancels their own appointment (200)', r.status === 200, `(got ${r.status})`);
  check('status is now cancelled', r.data?.appointment?.status === 'cancelled');

  r = await api('PATCH', `/api/appointments/${apptA?.id}/cancel`, {
    token: tokenA,
    body: { reason: 'Again' },
  });
  check('cancelling twice returns 404', r.status === 404, `(got ${r.status})`);

  r = await api('GET', '/api/slots', { token: tokenB });
  check('cancelled slot becomes open again', r.data?.slots?.some((s) => s.id === slotA?.id));

  r = await api('POST', '/api/appointments', { token: tokenB, body: { slot_id: slotA?.id } });
  check('patient B can now book the freed slot (201)', r.status === 201, `(got ${r.status})`);
  const apptB = r.data?.appointment;

  r = await api('PATCH', `/api/appointments/${apptB?.id}/cancel`, {
    token: tokenStaff,
    body: { reason: 'Doctor unavailable' },
  });
  check('staff can cancel any appointment (200)', r.status === 200, `(got ${r.status})`);

  r = await api('GET', '/api/appointments/mine', { token: tokenB });
  const cancelled = r.data?.appointments?.find((a) => a.id === apptB?.id);
  check('patient B sees it as cancelled by the clinic with the reason',
    cancelled?.status === 'cancelled' &&
    cancelled?.cancelled_by_clinic === true &&
    cancelled?.cancel_reason === 'Doctor unavailable');

  console.log('\n[Staff views]');
  r = await api('GET', '/api/slots/all', { token: tokenStaff });
  check(
    'staff sees slots with patient names on booked ones',
    r.status === 200 && r.data.slots.some((s) => s.id === slotB?.id && s.patient_name)
  );

  // Note: this check can fail if you run the test in the last 2 minutes before midnight (clinic time)
  const soon = new Date(Date.now() + 2 * 60 * 1000);
  soon.setSeconds(0, 0);
  r = await api('POST', '/api/slots', {
    token: tokenStaff,
    body: { start_time: iso(soon), end_time: iso(new Date(soon.getTime() + 30 * 60 * 1000)) },
  });
  const slotToday = r.data?.slot;
  check('staff creates a slot for later today (201)', r.status === 201, `(got ${r.status})`);

  r = await api('POST', '/api/appointments', { token: tokenB, body: { slot_id: slotToday?.id } });
  const apptToday = r.data?.appointment;
  check('patient B books the slot for today (201)', r.status === 201, `(got ${r.status})`);

  r = await api('GET', '/api/appointments/today', { token: tokenStaff });
  check(
    "today's schedule includes that appointment",
    r.status === 200 && r.data.appointments.some((a) => a.id === apptToday?.id)
  );

  console.log('\n[Deleting slots]');
  r = await api('DELETE', `/api/slots/${slotA?.id}`, { token: tokenStaff });
  check('slot with booking history cannot be deleted (409)', r.status === 409, `(got ${r.status})`);

  r = await api('POST', '/api/slots', {
    token: tokenStaff,
    body: { start_time: iso(at(180)), end_time: iso(at(210)) },
  });
  const slotC = r.data?.slot;
  r = await api('DELETE', `/api/slots/${slotC?.id}`, { token: tokenA });
  check('patient cannot delete slots (403)', r.status === 403, `(got ${r.status})`);
  r = await api('DELETE', `/api/slots/${slotC?.id}`, { token: tokenStaff });
  check('staff deletes a never-booked slot (204)', r.status === 204, `(got ${r.status})`);
  r = await api('DELETE', `/api/slots/${slotC?.id}`, { token: tokenStaff });
  check('deleting it again returns 404', r.status === 404, `(got ${r.status})`);
}

run()
  .catch((err) => {
    console.error('\nTest script crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error('Cleanup failed:', err.message);
    }
    await pool.end();
    console.log(`\nResult: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exitCode = 1;
  });