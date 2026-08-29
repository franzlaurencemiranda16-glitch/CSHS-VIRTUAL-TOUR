const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\cshs vmap\\index.html', 'utf8');
const spideyB64 = fs.readFileSync('C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\spidey-avatar-b64.txt', 'utf8');
const correctSrc = 'data:image/jpeg;base64,' + spideyB64;

// Find the spidey-img tag - it has class="spidey-img" 
// The pattern: <img src="DATA" class="spidey-img"
const re = /(<img src=")([^"]+)(" class="spidey-img")/;
const match = html.match(re);
if (match) {
  console.log('Found spidey-img tag! Old src starts with:', match[2].substring(0, 60));
  console.log('Old src length:', match[2].length);
  const fixed = html.replace(re, '$1' + correctSrc + '$3');
  fs.writeFileSync('C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\cshs vmap\\index.html', fixed);
  console.log('Fixed spidey-img! New src starts with:', correctSrc.substring(0, 60));
  console.log('New src length:', correctSrc.length);
} else {
  console.log('ERROR: Could not find spidey-img tag');
  // Debug: find the line with spidey-img
  const lines = html.split('\n');
  lines.forEach(function(line, i) {
    if (line.indexOf('spidey-img') !== -1) {
      console.log('Line ' + (i+1) + ': ' + line.substring(0, 200));
    }
  });
}
