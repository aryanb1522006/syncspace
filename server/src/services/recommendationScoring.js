// recommendationScoring.js
//
// Combines the EXISTING skill-overlap calculation (matchingEngine.js,
// unchanged) with a new semantic cosine-similarity signal into a single
// configurable "finalScore" used to rank project recommendations.
//
//   skillScore  = normalized (0-1) skill overlap, reusing the existing
//                 required/preferred overlap ratios already computed by
//                 computeMatchScore's breakdown - required skills weigh
//                 more than preferred ones, matching the existing product
//                 behaviour.
//
//   cosineScore = normalized (0-1) cosine similarity between the
//                 student's profile text (bio + interests + skill names)
//                 and the project's ORIGINAL description embedding
//                 (persisted on the project, not recomputed per request).
//
//   finalScore  = SKILL_SCORE_WEIGHT * skillScore + COSINE_SCORE_WEIGHT * cosineScore
//
// Weights default to 0.5 / 0.5 and are configurable via the
// SKILL_SCORE_WEIGHT / COSINE_SCORE_WEIGHT environment variables so the
// balance between "you have the right skills" and "your profile reads
// semantically similar to this project" can be tuned without a code
// change.
//
// All component scores are normalized to 0-1 internally, then scaled to
// 0-100 (rounded) to stay visually consistent with the existing
// `match.score` field already returned by the API.

import { cosineSimilarity, generateEmbedding, normalizeCosine } from './embeddingService.js';
import { matchSkillsSemantically } from './semanticSkillMatching.js';
import { env } from '../config/env.js';

const SKILL_REQUIRED_WEIGHT = 0.7;
const SKILL_PREFERRED_WEIGHT = 0.3;

/**
 * Builds the text used to represent a student's profile for cosine
 * similarity against project descriptions: their bio, stated interests,
 * and the names of the skills they've listed.
 */
export function buildStudentProfileText(student) {
  const skillNames = (student?.skills ?? []).map((skill) => skill.name).filter(Boolean);
  const interests = student?.interests ?? [];
  return [student?.bio, interests.join(' '), skillNames.join(' ')].filter(Boolean).join('. ');
}

/**
 * skillScore: normalized 0-1 skill overlap score, derived from the same
 * required/preferred overlap ratios the existing matchingEngine already
 * computes (see computeMatchScore's `breakdown`), so the existing skill
 * matching logic is reused rather than reimplemented.
 */
export function computeSkillScore(matchBreakdown) {
  const required = matchBreakdown?.requiredSkillOverlapRatio ?? 0;
  const preferred = matchBreakdown?.preferredSkillOverlapRatio ?? 0;
  return SKILL_REQUIRED_WEIGHT * required + SKILL_PREFERRED_WEIGHT * preferred;
}

/**
 * cosineScore: normalized 0-1 cosine similarity between the student's
 * profile embedding and the project's persisted description embedding.
 * Returns 0 (rather than throwing) when either embedding is unavailable,
 * e.g. a project that hasn't been backfilled yet.
 */
export function computeCosineScore(studentEmbedding, projectDescriptionEmbedding) {
  if (!studentEmbedding || !projectDescriptionEmbedding) return 0;
  const similarity = cosineSimilarity(studentEmbedding, projectDescriptionEmbedding);
  return normalizeCosine(similarity);
}

/**
 * Combines skillScore and cosineScore into the final weighted score using
 * configurable weights. Both inputs and the output are on a 0-1 scale.
 */
export function computeFinalScore(skillScore, cosineScore, weights = {}) {
  const skillWeight = weights.skillScoreWeight ?? env.skillScoreWeight;
  const cosineWeight = weights.cosineScoreWeight ?? env.cosineScoreWeight;
  const weightSum = skillWeight + cosineWeight;
  if (!weightSum) return 0;
  // Re-normalize so mis-configured weights that don't sum to 1 still
  // produce a score on a 0-1 scale rather than silently over/under-weighting.
  return (skillWeight * skillScore + cosineWeight * cosineScore) / weightSum;
}

/**
 * Computes the full combined recommendation payload for a single project:
 * exact/semantic skill matches plus the skillScore / cosineScore /
 * finalScore trio, all normalized to 0-1 then scaled to 0-100 to match the
 * existing `match.score` presentation.
 */
export async function computeRecommendationScore({
  student,
  studentEmbedding,
  matchBreakdown,
  project
}) {
  const { exactMatches, semanticMatches, unmatched } = await matchSkillsSemantically(
    student.skills,
    project.skills
  );

  const skillScore = computeSkillScore(matchBreakdown);
  const cosineScore = computeCosineScore(studentEmbedding, project.descriptionEmbedding);
  const finalScore = computeFinalScore(skillScore, cosineScore);

  return {
    finalScore: Math.round(finalScore * 100),
    skillScore: Math.round(skillScore * 100),
    cosineScore: Math.round(cosineScore * 100),
    matchedSkills: exactMatches.map((skill) => ({ skillId: skill.skillId ?? skill.id, name: skill.name })),
    relatedSkills: semanticMatches,
    unmatchedSkills: unmatched.map((skill) => ({ skillId: skill.skillId ?? skill.id, name: skill.name })),
    summary: project.descriptionSummary ?? null
  };
}

export { generateEmbedding };
