const fs = require('fs');
let text = fs.readFileSync('src/components/TriangleColorInterpolation.tsx', 'utf8');

text = text.replace('onMouseDown={onMouseDown(VERTEX_LABELS[i] as "A" | "B" | "C")}', 'onMouseDown={handlePointerDown(VERTEX_LABELS[i] as "A" | "B" | "C")} onTouchStart={handlePointerDown(VERTEX_LABELS[i] as "A" | "B" | "C")}');
text = text.replace('className="cursor-grab"', 'className="cursor-grab touch-none"');

text = text.replace('onMouseDown={onMouseDown("P")}', 'onMouseDown={handlePointerDown("P")} onTouchStart={handlePointerDown("P")}');
text = text.replace('className="cursor-grab"', 'className="cursor-grab touch-none"');

text = text.replace('hr + 4 * viewBox.scale', 'hr + 20 * viewBox.scale');
text = text.replace('(HANDLE_R + 6) * viewBox.scale', '(HANDLE_R + 20) * viewBox.scale');

fs.writeFileSync('src/components/TriangleColorInterpolation.tsx', text);
console.log('done');
