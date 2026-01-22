import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

const root = process.cwd();
const schemaPath = path.join(root, 'DOCS', 'PHASE5_METRICS_SCHEMA.json');
const dataPath = path.join(root, 'DOCS', 'PHASE5_METRICS_REPORT.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const ajv = new Ajv({ allErrors: true, strict: false });

const schema = readJson(schemaPath);
const data = readJson(dataPath);
const validate = ajv.compile(schema);

if (!validate(data)) {
  console.error('Phase 5 metrics report validation failed.');
  console.error(validate.errors);
  process.exit(1);
}

console.log('Phase 5 metrics report validation succeeded.');
