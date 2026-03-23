const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

beforeAll(async () => {
  // Read URI from file written by globalSetup (cross-process)
  const uriFile = path.join(__dirname, '.mongo-uri');
  const uri = fs.readFileSync(uriFile, 'utf-8').trim();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
