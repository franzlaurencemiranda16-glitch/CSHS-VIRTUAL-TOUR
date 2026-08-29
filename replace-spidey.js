const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\cshs vmap\\index.html', 'utf8');
const newB64 = fs.readFileSync('C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\spidey-b64.txt', 'utf8');
const newSrc = 'data:image/png;base64,' + newB64;

// Replace the spidey-img src
const re = /(<img src=")([^"]+)(" class="spidey-img")/;
const match = html.match(re);
if (match) {
  console.log('Found spidey-img! Old src length:', match[2].length, 'New src length:', newSrc.length);
  const fixed = html.replace(re, '$1' + newSrc + '$3');
  fs.writeFileSync('C:\\Users\\Lenovo\\OneDrive\\Documents\\Default Project\\cshs vmap\\index.html', fixed);
  console.log('Replaced!');
} else {
  console.log('ERROR: spidey-img not found');
}
