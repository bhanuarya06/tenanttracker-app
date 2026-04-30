const cron = require('node-cron');
const { generateBillsForMonth } = require('../services/billGenerationService');
const logger = require('../utils/logger');

function initBillCron() {
  // Fires at 00:00 on the 1st of every month, IST
  cron.schedule('0 0 1 * *', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    logger.info(`[CRON] Generating draft bills for ${month}/${year}`);
    try {
      const results = await generateBillsForMonth(month, year);
      logger.info('[CRON] Bill generation complete', results);
    } catch (err) {
      logger.error('[CRON] Bill generation failed', { message: err.message });
    }
  }, { timezone: 'Asia/Kolkata' });

  logger.info('[CRON] Bill auto-generation scheduled: 1st of every month at midnight IST');
}

module.exports = { initBillCron };
