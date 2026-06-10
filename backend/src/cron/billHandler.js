const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const connectDB = require('../config/database');
const { generateBillsForMonth } = require('../services/billGenerationService');
const logger = require('../utils/logger');

const SSM_PREFIX = '/tenanttracker/';
const SSM_PARAMS = [
  'MONGODB_URI', 'JWT_SECRET', 'SMTP_HOST', 'SMTP_PORT',
  'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM',
];

let initialized = false;

const loadSSMParams = async () => {
  const client = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const { Parameters } = await client.send(new GetParametersCommand({
    Names: SSM_PARAMS.map(p => `${SSM_PREFIX}${p}`),
    WithDecryption: true,
  }));
  for (const param of Parameters) {
    process.env[param.Name.replace(SSM_PREFIX, '')] = param.Value;
  }
};

// Invoked by EventBridge Scheduler on the 1st of every month (replaces node-cron in Lambda)
module.exports.handler = async () => {
  if (!initialized) {
    await loadSSMParams();
    await connectDB();
    initialized = true;
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  logger.info(`[EventBridge] Generating bills for ${month}/${year}`);
  const results = await generateBillsForMonth(month, year);
  logger.info('[EventBridge] Bill generation complete', results);
  return results;
};
