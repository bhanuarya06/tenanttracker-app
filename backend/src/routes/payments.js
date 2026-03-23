const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validation');
const v = require('../validators');

router.use(authenticate);

// Owner records payments
router.post('/', authorize('owner', 'admin'), validateBody(v.paymentCreate), asyncHandler(ctrl.createPayment));
router.get('/', validateQuery(v.pagination), asyncHandler(ctrl.getPayments));
router.get('/stats', authorize('owner', 'admin'), asyncHandler(ctrl.getPaymentStats));
router.get('/:id', asyncHandler(ctrl.getPaymentById));
router.put('/:id', authorize('owner', 'admin'), validateBody(v.paymentUpdate), asyncHandler(ctrl.updatePayment));

// Tenant online payment (Razorpay)
router.post('/order', authorize('tenant'), asyncHandler(ctrl.createOrder));
router.post('/verify', authorize('tenant'), asyncHandler(ctrl.verifyPayment));

module.exports = router;
