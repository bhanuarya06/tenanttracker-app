const router = require('express').Router();
const ctrl = require('../controllers/propertyController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validation');
const v = require('../validators');

router.use(authenticate);

router.post('/', authorize('owner', 'admin'), validateBody(v.propertyCreate), asyncHandler(ctrl.createProperty));
router.get('/', authorize('owner', 'admin'), validateQuery(v.pagination), asyncHandler(ctrl.getProperties));
router.get('/stats', authorize('owner', 'admin'), asyncHandler(ctrl.getPropertyStats));
router.get('/:id', asyncHandler(ctrl.getPropertyById));
router.put('/:id', authorize('owner', 'admin'), validateBody(v.propertyUpdate), asyncHandler(ctrl.updateProperty));
router.delete('/:id', authorize('owner', 'admin'), asyncHandler(ctrl.deleteProperty));
router.get('/:id/units', authorize('owner', 'admin'), asyncHandler(ctrl.getAvailableUnits));

module.exports = router;
