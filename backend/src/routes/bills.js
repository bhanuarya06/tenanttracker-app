const router = require('express').Router();
const ctrl = require('../controllers/billController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validation');
const v = require('../validators');

router.use(authenticate);

router.post('/', authorize('owner', 'admin'), validateBody(v.billCreate), asyncHandler(ctrl.createBill));
router.get('/', validateQuery(v.pagination), asyncHandler(ctrl.getBills));
router.get('/summary', authorize('owner', 'admin'), asyncHandler(ctrl.getBillsSummary));
router.post('/generate', authorize('owner', 'admin'), asyncHandler(ctrl.generateRecurringBills));
router.get('/tenant/:tenantId', authorize('owner', 'admin'), asyncHandler(ctrl.getBillsByTenantId));
router.get('/:id', asyncHandler(ctrl.getBillById));
router.put('/:id', authorize('owner', 'admin'), validateBody(v.billUpdate), asyncHandler(ctrl.updateBill));
router.delete('/:id', authorize('owner', 'admin'), asyncHandler(ctrl.deleteBill));
router.post('/:id/send', authorize('owner', 'admin'), asyncHandler(ctrl.sendBill));

module.exports = router;
