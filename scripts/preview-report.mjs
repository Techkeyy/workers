// Renders test/fixtures/report.sample.json to workers-out-preview/report.html. No Kane, no Playwright.
import { readFileSync } from 'node:fs';
import { writeReport } from '../src/report.js';
const report = JSON.parse(readFileSync(new URL('../test/fixtures/report.sample.json', import.meta.url), 'utf8'));
console.log(writeReport('workers-out-preview', report));
