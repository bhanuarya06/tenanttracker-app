const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/', require('./oauth2'));
router.use('/properties', require('./properties'));
router.use('/tenants', require('./tenants'));
router.use('/bills', require('./bills'));
router.use('/payments', require('./payments'));
router.use('/dashboard', require('./dashboard'));
router.use('/uploads', require('./uploads'));

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
