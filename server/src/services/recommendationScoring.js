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
//   cosineScore = cosine similarity (clamped to 0-1) between the
//                 student's profile text (bio + interests + skill names)
//                 and the project's persisted description embedding
//                 (built from the description summary - see
//                 projectDerivedFields.js - not recomputed per request).
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

import { cosineSimilarity, generateEmbedding } from './embeddingService.js';
import { matchSkillsSemantically } from './semanticSkillMatching.js';
import { env } from '../config/env.js';

const SKILL_REQUIRED_WEIGHT = 0.7;
const SKILL_PREFERRED_WEIGHT = 0.3;

/**
 * Builds the text used to represent a student's profile for cosine
 * similarity against project descriptions: their bio, stated interests,
 * the names of the skills they've listed, and text from connected
 * GitHub / LinkedIn sources (public repository descriptions, headline).
 */
export function buildStudentProfileText(student) {
  const skillNames = (student?.skills ?? []).map((skill) => skill.name).filter(Boolean);
  const interests = student?.interests ?? [];
  return [student?.bio, interests.join(' '), skillNames.join(' '), student?.externalProfileText]
    .filter(Boolean).join('. ');
}

/**
 * skillScore: normalized 0-1 skill overlap score, derived from the same
 * required/preferred overlap ratios the existing matchingEngine already
 * computes (see computeMatchScore's `breakdown`), so the existing skill
 * matching logic is reused rather than reimplemented.
 */
export function computeSkillScore(matchBreakdown) {
  const required = matchBreakdown?.requiredSkillOverlapRatio;
  const preferred = matchBreakdown?.preferredSkillOverlapRatio;
  const weightedSum = (required === null || required === undefined ? 0 : SKILL_REQUIRED_WEIGHT * required)
    + (preferred === null || preferred === undefined ? 0 : SKILL_PREFERRED_WEIGHT * preferred);
  const applicableWeight = (required === null || required === undefined ? 0 : SKILL_REQUIRED_WEIGHT)
    + (preferred === null || preferred === undefined ? 0 : SKILL_PREFERRED_WEIGHT);
  return applicableWeight > 0 ? weightedSum / applicableWeight : 0;
}

/**
 * cosineScore: 0-1 cosine similarity between the student's profile
 * embedding and the project's persisted description embedding.
 * Negative similarity (opposing text) is clamped to 0 rather than
 * rescaled with (s + 1) / 2: the rescale would award 0.5 to an empty
 * profile or completely unrelated text, inflating every finalScore.
 * Returns 0 (rather than throwing) when either embedding is unavailable,
 * e.g. a project that hasn't been backfilled yet.
 */
export function computeCosineScore(studentEmbedding, projectDescriptionEmbedding) {
  if (!studentEmbedding || !projectDescriptionEmbedding) return 0;
  const similarity = cosineSimilarity(studentEmbedding, projectDescriptionEmbedding);
  return Math.min(1, Math.max(0, similarity));
}

/**
 * The skill/cosine weights actually applied by computeFinalScore,
 * re-normalized to sum to 1, so clients can explain the final score.
 */
export function effectiveScoreWeights(weights = {}) {
  const skillWeight = weights.skillScoreWeight ?? env.skillScoreWeight;
  const cosineWeight = weights.cosineScoreWeight ?? env.cosineScoreWeight;
  const weightSum = skillWeight + cosineWeight;
  if (!weightSum) return { skillScore: 0, cosineScore: 0 };
  return { skillScore: skillWeight / weightSum, cosineScore: cosineWeight / weightSum };
}

/**
 * Combines skillScore and cosineScore into the final weighted score using
 * configurable weights. Both inputs and the output are on a 0-1 scale.
 */
export function computeFinalScore(skillScore, cosineScore, weights = {}) {
  // Re-normalized so mis-configured weights that don't sum to 1 still
  // produce a score on a 0-1 scale rather than silently over/under-weighting.
  const effective = effectiveScoreWeights(weights);
  return effective.skillScore * skillScore + effective.cosineScore * cosineScore;
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
  // Where each matched skill is evidenced (GitHub, LinkedIn export); an
  // empty list means the skill is self-declared on SyncSpace.
  const evidenceBySkill = new Map((student.skills ?? []).map((skill) => [
    Number(skill.skillId ?? skill.id), skill.evidenceSources ?? []
  ]));

  return {
    finalScore: Math.round(finalScore * 100),
    skillScore: Math.round(skillScore * 100),
    cosineScore: Math.round(cosineScore * 100),
    weights: effectiveScoreWeights(),
    matchedSkills: exactMatches.map((skill) => ({
      skillId: skill.skillId ?? skill.id,
      name: skill.name,
      evidenceSources: evidenceBySkill.get(Number(skill.skillId ?? skill.id)) ?? []
    })),
    relatedSkills: semanticMatches,
    unmatchedSkills: unmatched.map((skill) => ({ skillId: skill.skillId ?? skill.id, name: skill.name })),
    summary: project.descriptionSummary ?? null
  };
}

export { generateEmbedding };