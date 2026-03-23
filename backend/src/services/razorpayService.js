const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger');

let razorpayInstance = null;

const getInstance = () => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    return null;
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpayInstance;
};

const isConfigured = () => {
  return !!(config.razorpay.keyId && config.razorpay.keySecret);
};

const createOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  const instance = getInstance();
  if (!instance) {
    throw new Error('Razorpay not configured');
  }

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects paise
    currency,
    receipt,
    notes,
  };

  try {
    const order = await instance.orders.create(options);
    logger.info('Razorpay order created', { orderId: order.id, amount });
    return order;
  } catch (error) {
    logger.error('Razorpay order creation failed', { error: error.message });
    throw error;
  }
};

const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
};

const fetchPayment = async (paymentId) => {
  const instance = getInstance();
  if (!instance) throw new Error('Razorpay not configured');
  return instance.payments.fetch(paymentId);
};

module.exports = {
  isConfigured,
  createOrder,
  verifyPaymentSignature,
  fetchPayment,
};
