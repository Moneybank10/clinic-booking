const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  bookAppointment, myAppointments, todaySchedule, cancelAppointment,
} = require('../controllers/appointmentsController');

const router = express.Router();
router.use(authenticate);

router.post('/', requireRole('patient'), bookAppointment);
router.get('/mine', requireRole('patient'), myAppointments);
router.get('/today', requireRole('staff'), todaySchedule);
router.patch('/:id/cancel', cancelAppointment);

module.exports = router;