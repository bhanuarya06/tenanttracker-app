const router = require('express').Router();
const ctrl = require('../controllers/tenantController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validation');
const v = require('../validators');

router.use(authenticate);

// Tenant self-service
router.get('/me/dashboard', authorize('tenant'), asyncHandler(ctrl.getTenantDashboard));

// Owner tenant management
router.post('/', authorize('owner', 'admin'), validateBody(v.tenantCreate), asyncHandler(ctrl.createTenant));
router.get('/', authorize('owner', 'admin'), validateQuery(v.pagination), asyncHandler(ctrl.getTenants));
router.get('/expiring-leases', authorize('owner', 'admin'), asyncHandler(ctrl.getExpiringLeases));
router.get('/:id', asyncHandler(ctrl.getTenantById));
router.put('/:id', authorize('owner', 'admin'), validateBody(v.tenantUpdate), asyncHandler(ctrl.updateTenant));
router.delete('/:id', authorize('owner', 'admin'), asyncHandler(ctrl.deleteTenant));
router.post('/:id/notes', authorize('owner', 'admin'), asyncHandler(ctrl.addTenantNote));

module.exports = router;
