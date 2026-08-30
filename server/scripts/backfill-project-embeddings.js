// Safe backfill for projects created before description embeddings/
// summaries existed, or whose stored embedding was produced by an older
// embedding model than the one currently configured.
//
// Usage:
//   node scripts/backfill-project-embeddings.js
// or:
//   npm run db:backfill:embeddings

import { pool } from '../src/config/db.js';
import { getEmbeddingModelName } from '../src/services/embeddingService.js';
import { backfillProjectDerivedFields, listProjectsNeedingEmbeddingBackfill } from '../src/models/projectModel.js';

async function run() {
  const currentModel = getEmbeddingModelName();
  const projects = await listProjectsNeedingEmbeddingBackfill(currentModel);

  if (!projects.length) {
    console.log(`No projects need backfilling (all already use embedding model "${currentModel}").`);
    return;
  }

  console.log(`Backfilling ${projects.length} project(s) with embedding model "${currentModel}"...`);
  for (const project of projects) {
    await backfillProjectDerivedFields(project);
    console.log(`  - project ${project.id} done`);
  }
  console.log('Backfill complete.');
}

run()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exitCode = 1;
  });
