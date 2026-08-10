import { readFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';

const yamlFiles = [
  'compose.production.yml',
  '.github/workflows/ci.yml',
  'deploy/prometheus/prometheus.yml',
  'deploy/prometheus/alerts.yml',
  'deploy/alertmanager.example.yml'
];
const jsonFiles = ['package.json', 'server/package.json', 'client/package.json'];

const documents = new Map();
for (const file of yamlFiles) {
  const document = parseDocument(await readFile(file, 'utf8'));
  if (document.errors.length) {
    throw new Error(`${file}: ${document.errors.map((error) => error.message).join('; ')}`);
  }
  documents.set(file, document.toJS());
}

for (const file of jsonFiles) JSON.parse(await readFile(file, 'utf8'));

const compose = documents.get('compose.production.yml');
for (const service of ['postgres', 'minio', 'api', 'client', 'gateway']) {
  if (!compose.services?.[service]) throw new Error(`compose.production.yml is missing ${service}`);
}
const workflow = documents.get('.github/workflows/ci.yml');
if (!workflow.jobs?.verify?.services?.postgres) throw new Error('CI must provision PostgreSQL');

console.log(`Validated ${yamlFiles.length} YAML files, ${jsonFiles.length} package manifests, and required services.`);
