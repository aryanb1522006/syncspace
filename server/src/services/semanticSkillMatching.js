// semanticSkillMatching.js
//
// Extends the existing exact skill-id matching (see matchingEngine.js,
// which is left untouched and still powers the existing /recommendations
// endpoint contract) with an additional semantic layer: two skills whose
// *names* embed closely together are treated as "related" even when their
// ids don't match exactly (e.g. a project asking for "Deep Learning" and a
// student who only listed "Machine Learning").
//
// This module never removes or overrides exact matches - it only adds
// information about skills that are semantically close but not identical.

import { cosineSimilarity, generateEmbedding } from './embeddingService.js';
import { env } from '../config/env.js';

const skillId = (skill) => Number(typeof skill === 'object' ? skill.skillId ?? skill.id : skill);
const skillName = (skill) => String(skill?.name ?? '').trim();

// Small in-process cache so repeated recommendation requests within the
// same process don't recompute embeddings for the same skill name over and
// over. Skill names are a small, mostly-fixed vocabulary (the `skills`
// dictionary table), so this cache stays small and bounded in practice.
const skillNameEmbeddingCache = new Map();

async function embedSkillName(name) {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (skillNameEmbeddingCache.has(key)) return skillNameEmbeddingCache.get(key);
  const embedding = await generateEmbedding(key);
  skillNameEmbeddingCache.set(key, embedding);
  return embedding;
}

/**
 * Compares a student's skills against a project's skills and returns:
 *  - exactMatches: project skills the student also has (same skillId)
 *  - semanticMatches: unmatched project skills that are semantically close
 *    to one of the student's skills, with the similarity score and which
 *    student skill it matched
 *  - unmatched: project skills with neither an exact nor a semantic match
 *
 * `threshold` (0-1 cosine similarity) is configurable via the
 * SEMANTIC_SKILL_THRESHOLD environment variable.
 */
export async function matchSkillsSemantically(studentSkills = [], projectSkills = [], threshold = env.semanticSkillThreshold) {
  const studentIds = new Set(studentSkills.map(skillId));
  const exactMatches = [];
  const remainingProjectSkills = [];

  for (const skill of projectSkills) {
    if (studentIds.has(skillId(skill))) exactMatches.push(skill);
    else remainingProjectSkills.push(skill);
  }

  const semanticMatches = [];
  const unmatched = [];

  if (remainingProjectSkills.length && studentSkills.length) {
    const studentEmbeddings = await Promise.all(
      studentSkills.map(async (skill) => ({ skill, embedding: await embedSkillName(skillName(skill)) }))
    );

    for (const projectSkill of remainingProjectSkills) {
      const projectEmbedding = await embedSkillName(skillName(projectSkill));
      let best = null;

      for (const { skill: studentSkill, embedding: studentEmbedding } of studentEmbeddings) {
        if (!studentEmbedding || !projectEmbedding) continue;
        const similarity = cosineSimilarity(studentEmbedding, projectEmbedding);
        if (!best || similarity > best.similarity) {
          best = { similarity, studentSkill };
        }
      }

      if (best && best.similarity >= threshold) {
        semanticMatches.push({
          skillId: skillId(projectSkill),
          name: skillName(projectSkill),
          importance: projectSkill.importance,
          relatedTo: skillName(best.studentSkill),
          similarity: Number(best.similarity.toFixed(3))
        });
      } else {
        unmatched.push(projectSkill);
      }
    }
  } else {
    unmatched.push(...remainingProjectSkills);
  }

  return { exactMatches, semanticMatches, unmatched, threshold };
}
