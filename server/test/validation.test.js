import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { validate } from '../src/middleware/validation.js';

test('query validation works with the read-only Express 5 query getter', () => {
  const req = {};
  Object.defineProperty(req, 'query', {
    get: () => ({ skill: '  React  ' }),
    configurable: true
  });

  const middleware = validate(
    z.object({ skill: z.string().trim().optional().default('') }),
    'query'
  );

  let continued = false;
  middleware(req, {}, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.deepEqual(req.validatedQuery, { skill: 'React' });
  assert.deepEqual(req.query, { skill: '  React  ' });
});

test('body validation still replaces request body with parsed values', () => {
  const req = { body: { count: '3' } };
  const middleware = validate(z.object({ count: z.coerce.number().int() }));

  middleware(req, {}, () => {});

  assert.deepEqual(req.body, { count: 3 });
});
