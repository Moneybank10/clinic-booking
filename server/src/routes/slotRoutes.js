const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { createSlot, listOpenSlots, listAllSlots, deleteSlot } = require('../controllers/slotsController');

const router = express.Router();
router.use(authenticate);

router.get('/', listOpenSlots);
router.get('/all', requireRole('staff'), listAllSlots);
router.post('/', requireRole('staff'), createSlot);
router.delete('/:id', requireRole('staff'), deleteSlot);

module.exports = router;