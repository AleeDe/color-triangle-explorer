const fs = require('fs');
let text = fs.readFileSync('src/components/TriangleColorInterpolation.tsx', 'utf8');

text = text.replace(/<svg\n              style=\{\{ touchAction: "none" \}\}\n              ref=\{svgRef\}\n              viewBox=\{\\\\$\{viewBox\.minX\} \$\{viewBox\.minY\} \$\{viewBox\.w\} \$\{viewBox\.h\}\\}\n              className="w-full cursor-crosshair select-none touch-none"\n              style=\{\{ aspectRatio: \\$\{viewBox\.w\} \/ \$\{viewBox\.h\}\, minHeight: 300, maxHeight: 500 \}\}\n            >/, '<svg\n              ref={svgRef}\n              viewBox={\ \ \ \}\n              className="w-full cursor-crosshair select-none touch-none"\n              style={{ touchAction: "none", aspectRatio: \ / \, minHeight: 300, maxHeight: 500 }}\n            >');

fs.writeFileSync('src/components/TriangleColorInterpolation.tsx', text);
console.log('done');
