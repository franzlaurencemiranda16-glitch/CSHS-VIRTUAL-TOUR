const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\cshs vmap\\index.html', 'utf8');

// Check C-EXPERTO logo - it should be alt="C-EXPERTO"
const re = /(<img[^>]*alt="C-EXPERTO"[^>]*src=")([^"]+)(")/;
const match = html.match(re);
if (match) {
  console.log('C-EXPERTO logo starts with:', match[2].substring(0, 60));
  console.log('C-EXPERTO logo length:', match[2].length);
  if (match[2].indexOf('iVBORw0KGgo') === 0) {
    console.log('WARNING: C-EXPERTO is a PNG (school seal) - corrupted!');
  } else if (match[2].indexOf('/9j/') === 0) {
    console.log('C-EXPERTO is a JPEG - checking if correct...');
    // Load original and compare
    const origB64 = fs.readFileSync('C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\cshs-seal-b64.txt', 'utf8');
    if (match[2] === 'data:image/png;base64,' + origB64) {
      console.log('C-EXPERTO is the SCHOOL SEAL - corrupted!');
    } else {
      console.log('C-EXPERTO appears to be a different JPEG - OK');
    }
  }
} else {
  console.log('C-EXPERTO tag not found');
}

// Also check: how many images are PNG vs JPEG now?
const pngCount = (html.match(/data:image\/png;base64,iVBORw0KGgo/g) || []).length;
const jpgCount = (html.match(/data:image\/jpeg;base64,/g) || []).length;
console.log('PNG images:', pngCount);
console.log('JPEG images:', jpgCount);
