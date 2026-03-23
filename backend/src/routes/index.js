const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/', require('./oauth2'));
router.use('/api/properties', require('./properties'));
router.use('/api/tenants', require('./tenants'));
router.use('/api/bills', require('./bills'));
router.use('/api/payments', require('./payments'));
router.use('/api/dashboard', require('./dashboard'));
router.use('/api/uploads', require('./uploads'));

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
