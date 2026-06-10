const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');

const SSM_PREFIX = '/tenanttracker/';
const SSM_PARAMS = [
  'MONGODB_URI', 'JWT_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER',
  'SMTP_PASS', 'EMAIL_FROM', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET', 'RSA_PRIVATE_KEY', 'RSA_PUBLIC_KEY', 'RSA_KEY_ID',
];

// Cached across warm invocations
let serverlessHandler;

const loadSSMParams = async () => {
  const client = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const names = SSM_PARAMS.map(p => `${SSM_PREFIX}${p}`);
  for (let i = 0; i < names.length; i += 10) {
    const { Parameters } = await client.send(new GetParametersCommand({
      Names: names.slice(i, i + 10),
      WithDecryption: true,
    }));
    for (const param of Parameters) {
      process.env[param.Name.replace(SSM_PREFIX, '')] = param.Value;
    }
  }
};

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!serverlessHandler) {
    // Load SSM params FIRST — before requiring any app modules.
    // config.js is evaluated once when first required, so all process.env
    // values must be set before require('./app') is called.
    await loadSSMParams();

    const app = require('./app');
    const connectDB = require('./config/database');
    const serverlessExpress = require('@vendia/serverless-express');

    await connectDB();
    serverlessHandler = serverlessExpress({ app });
  }

  return serverlessHandler(event, context);
};
