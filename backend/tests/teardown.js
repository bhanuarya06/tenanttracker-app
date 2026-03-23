const path = require('path');
const fs = require('fs');

module.exports = async () => {
  // Clean up URI file
  const uriFile = path.join(__dirname, '.mongo-uri');
  if (fs.existsSync(uriFile)) fs.unlinkSync(uriFile);
  
  if (global.__MONGOSERVER) {
    await global.__MONGOSERVER.stop();
  }
};
