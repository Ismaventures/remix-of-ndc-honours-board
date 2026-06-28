const path = require('path');

const APP_PATH = '/Users/Kingsolo/projects/remix-of-ndc-honours-board/dist-electron/mac-arm64/NDCHonoursBoard.app/Contents/Resources/app.asar';

const urls = [
  'file:///Users/Kingsolo/projects/remix-of-ndc-honours-board/dist-electron/mac-arm64/NDCHonoursBoard.app/Contents/Resources/app.asar/dist/index.html',
  'file:///Users/Kingsolo/projects/remix-of-ndc-honours-board/dist-electron/mac-arm64/NDCHonoursBoard.app/Contents/Resources/app.asar/dist/assets/index-BVhwlv1N.js',
  'file:///Users/Kingsolo/projects/remix-of-ndc-honours-board/dist-electron/mac-arm64/NDCHonoursBoard.app/Contents/Resources/app.asar/dist/assets/index-DzOmRInz.css',
  'file:///Users/Kingsolo/projects/remix-of-ndc-honours-board/dist-electron/mac-arm64/NDCHonoursBoard.app/Contents/Resources/app.asar/dist/images/ndc-crest.png',
  'file:///images/ndc-crest.png',
  'file:///images/nigerian-air-force-emblem.png'
];

urls.forEach(url => {
  try {
    let filePath = decodeURIComponent(new URL(url).pathname);
    const publicAssetMatch = filePath.match(/(?:^|[/\\])(images[/\\].*|placeholder\.svg|favicon\.ico|robots\.txt)$/i);
    let resolvedPath = filePath;
    let intercepted = false;
    
    if (publicAssetMatch) {
      const assetRelative = publicAssetMatch[1].replace(/\\/g, '/');
      resolvedPath = path.join(APP_PATH, 'dist', assetRelative);
      intercepted = true;
    }
    
    console.log(`URL: ${url}`);
    console.log(`-> filePath: ${filePath}`);
    console.log(`-> Intercepted: ${intercepted}`);
    console.log(`-> Resolved: ${resolvedPath}\n`);
  } catch (err) {
    console.error(`Error processing ${url}:`, err.message);
  }
});
