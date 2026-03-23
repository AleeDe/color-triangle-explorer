const fs = require('fs');
let text = fs.readFileSync('src/components/TriangleColorInterpolation.tsx', 'utf8');

text = text.replace('<div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">', '<div className="flex flex-col-reverse lg:flex-row gap-6">');
text = text.replace('<div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">', '<div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[400px]">');
text = text.replace('<div className="flex flex-col gap-4">', '<div className="flex flex-col gap-4 w-full lg:w-[380px] shrink-0">');

fs.writeFileSync('src/components/TriangleColorInterpolation.tsx', text);
console.log('done');
