const nodemailer = require('nodemailer');
const config = require('./config');
const logger = require('../utils/logger');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!config.email.user || !config.email.pass) {
    logger.warn('Email not configured — SMTP_USER and SMTP_PASS required');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  return transporter;
};

module.exports = { getTransporter };
