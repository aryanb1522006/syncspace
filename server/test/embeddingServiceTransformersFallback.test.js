// Exercises EMBEDDING_PROVIDER=transformers in isolation. Note: static
// `import` statements are hoisted above all other top-level code in ESM
// (regardless of source order), so setting process.env before a static
// import of embeddingService.js would NOT actually take effect in time -
// env.js would already have read the default. Using dynamic import()
// inside an async function avoids that hoisting trap.
//
// `node --test` runs each test file in its own process, so this doesn't
// affect the default 'hashing' provider used by every other test file.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.EMBEDDING_PROVIDER = 'transformers';
const { generateEmbedding, getEmbeddingModelName } = await import('../src/services/embeddingService.js');

test('transformers provider never throws and always returns a usable vector, even if the model cannot be loaded (missing package or blocked network)', async () => {
  // In CI/sandboxed environments this exercises the fallback path (no
  // Hugging Face network access); with real network access and the
  // optional @xenova/transformers package installed, this exercises the
  // real pretrained-model path instead. Either way, callers must never
  // see a thrown error or a hung promise here.
  const vector = await generateEmbedding('A peer tutoring platform for engineering students');
  assert.ok(Array.isArray(vector));
  assert.ok(vector.length > 0);
  assert.ok(vector.every((value) => Number.isFinite(value)));
});

test('getEmbeddingModelName reports the configured transformers model name regardless of fallback', () => {
  assert.equal(getEmbeddingModelName(), 'Xenova/all-MiniLM-L6-v2');
});
