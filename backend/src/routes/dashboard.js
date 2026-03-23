const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('owner', 'admin'), asyncHandler(ctrl.getOwnerDashboard));

module.exports = router;
