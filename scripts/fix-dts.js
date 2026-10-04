// vue-tsc keeps the extensionless './GCodePreview.vue' import, which node16/nodenext
// consumers cannot resolve. A '.vue.js' specifier maps to GCodePreview.vue.d.ts.
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'dist/index.d.ts';
const source = readFileSync(file, 'utf8');
const fixed = source.replace("'./GCodePreview.vue'", "'./GCodePreview.vue.js'");
if (fixed === source) throw new Error(`No './GCodePreview.vue' import found in ${file}`);
writeFileSync(file, fixed);
