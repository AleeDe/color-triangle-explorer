const fs = require('fs');
let text = fs.readFileSync('src/components/TriangleColorInterpolation.tsx', 'utf8');

text = text.replace('<svg\n              style={{ touchAction: "none" }}', '<svg');

fs.writeFileSync('src/components/TriangleColorInterpolation.tsx', text);
console.log('done');
