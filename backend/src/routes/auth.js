const router = require('express').Router();
const auth = require('../controllers/authController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const v = require('../validators');

router.post('/register', validateBody(v.userRegister), asyncHandler(auth.register));
router.post('/login', validateBody(v.userLogin), asyncHandler(auth.login));
router.post('/token/refresh', asyncHandler(auth.refreshToken));
router.post('/logout', authenticate, asyncHandler(auth.logout));
router.get('/profile', authenticate, asyncHandler(auth.getProfile));
router.put('/profile', authenticate, validateBody(v.userUpdate), asyncHandler(auth.updateProfile));
router.put('/change-password', authenticate, validateBody(v.changePassword), asyncHandler(auth.changePassword));
router.post('/forgot-password', validateBody(v.forgotPassword), asyncHandler(auth.forgotPassword));
router.post('/reset-password', validateBody(v.resetPassword), asyncHandler(auth.resetPassword));

module.exports = router;
