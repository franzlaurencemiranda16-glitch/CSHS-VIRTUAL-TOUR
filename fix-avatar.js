const fs = require('fs');
const htmlPath = 'C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\cshs vmap\\index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const newB64 = fs.readFileSync('C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\spidey-new-b64.txt', 'utf8');
const newSrc = 'data:image/png;base64,' + newB64;

// Find: '<img src="OLD_DATA" class="spidey-img"'
// Replace only the src attribute content between src=" and " class="spidey-img"
const re = /(<img src=")[^"]*?(" class="spidey-img")/;
const match = html.match(re);
if (match) {
  console.log('Found spidey-img tag');
  console.log('Old src prefix:', match[0].substring(10, 60));
  console.log('Old src length in match:', match[0].length);
  const fixed = html.replace(re, '$1' + newSrc + '$2');
  fs.writeFileSync(htmlPath, fixed);
  
  // Verify
  const verify = fs.readFileSync(htmlPath, 'utf8');
  const vMatch = verify.match(/class="spidey-img"/);
  if (vMatch) {
    const vIdx = verify.indexOf('class="spidey-img"');
    const vBefore = verify.substring(vIdx - 100, vIdx);
    console.log('VERIFIED - new src prefix:', vBefore.substring(vBefore.lastIndexOf('src="') + 5, vBefore.lastIndexOf('src="') + 55));
  }
  console.log('SUCCESS: Avatar replaced');
} else {
  console.log('ERROR: Could not find spidey-img tag');
  // Debug
  const idx = html.indexOf('spidey-img');
  console.log('spidey-img found at index:', idx);
  if (idx > -1) {
    console.log('Context:', html.substring(idx - 150, idx + 30));
  }
}
