const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');

module.exports = async () => {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // Store URI so tests and teardown can find it
  process.env.MONGODB_URI = uri;
  // Also write to a file for cross-process access
  const fs = require('fs');
  fs.writeFileSync(path.join(__dirname, '.mongo-uri'), uri);
  global.__MONGOSERVER = mongoServer;
};
