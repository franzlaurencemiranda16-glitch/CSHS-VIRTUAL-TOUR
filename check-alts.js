const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const regex = /<img[^>]*?alt="([^"]*)"[^>]*?>/g;
let m;
while((m = regex.exec(html)) !== null) {
  const line = html.substring(0, m.index).split('\n').length;
  console.log('Line ' + line + ': alt="' + m[1] + '"');
}
