import fs from 'node:fs';
const file=process.argv[2];if(!file)throw new Error('Usage: tsx scripts/performance/report.mts <local-report.json>');
const raw=fs.readFileSync(file,'utf8');if(raw.length>64000000)throw new Error('Performance report is too large');
const report=JSON.parse(raw);
if(report?.version!==1||typeof report.source!=='string'||!Array.isArray(report.samples)||!report.summary||typeof report.summary!=='object')throw new Error('Unsupported performance report');
console.log(JSON.stringify({source:report.source,scenario:report.scenario,durationMs:report.durationMs,capacity:report.capacity,overflow:report.overflow,incomplete:report.incomplete,invalidEnds:report.invalidEnds,environment:report.environment},null,2));
console.table(Object.entries(report.summary).map(([span,values])=>({span,...values as object})));
console.log('CPU submission only. Nested totals overlap. Visibility, sample counts and per-run variation matter.');
