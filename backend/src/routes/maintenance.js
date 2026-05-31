const router = require('express').Router();
const ctrl = require('../controllers/maintenanceController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', authorize('tenant'), asyncHandler(ctrl.createRequest));
router.get('/', asyncHandler(ctrl.getRequests));
router.get('/:id', asyncHandler(ctrl.getRequestById));
router.put('/:id/status', authorize('owner', 'admin'), asyncHandler(ctrl.updateStatus));

module.exports = router;
