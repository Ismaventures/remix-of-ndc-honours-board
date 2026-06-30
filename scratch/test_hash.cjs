const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function computeDropboxHash(filePath) {
  const BLOCK_SIZE = 4 * 1024 * 1024; // 4MB
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(BLOCK_SIZE);
  const blockHashes = [];
  
  let bytesRead = 0;
  while (true) {
    bytesRead = fs.readSync(fd, buffer, 0, BLOCK_SIZE, null);
    if (bytesRead === 0) break;
    
    const block = bytesRead === BLOCK_SIZE ? buffer : buffer.subarray(0, bytesRead);
    const hash = crypto.createHash('sha256').update(block).digest();
    blockHashes.push(hash);
  }
  fs.closeSync(fd);
  
  if (blockHashes.length === 0) {
    return crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex');
  }
  
  const combined = Buffer.concat(blockHashes);
  return crypto.createHash('sha256').update(combined).digest('hex');
}

const file = path.join(__dirname, '../local_media/courses/Course-16/AIR COMMODORE ALEX SABUNDU BADEH.png');
if (fs.existsSync(file)) {
  console.log('Calculating hash for:', file);
  console.log('Hash:', computeDropboxHash(file));
} else {
  console.log('File does not exist:', file);
}
