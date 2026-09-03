// similarProjectsService.js
//
// Identifies pairs of projects whose ORIGINAL descriptions are highly
// similar (paraphrases, near-duplicates) using persisted description
// embeddings and cosine similarity - not exact string comparison, so
// paraphrased descriptions ("AI powered attendance system using facial
// recognition" vs "Smart student attendance platform based on face
// recognition") are still recognized as similar.
//
// Similar projects are never merged, hidden, or deleted automatically.
// Instead this module returns groups/pairs plus a differentiation object
// built only from structured data already present on the projects
// (title, skills, domain, project lead, team composition, timeline) so
// the frontend can explain to the user *why* two similar-sounding
// projects are actually different, rather than simply labelling them
// "duplicates".
//
// NOTE ON "MENTOR": SyncSpace is a peer-led platform - projects have an
// owning student (`ownerName`), not a separate faculty/mentor record.
// `lead` below surfaces that owner as the closest existing analog to a
// "mentor" field. If a real mentor/advisor concept is added to the schema
// later, wire it in here alongside `lead`.

import { cosineSimilarity } from './embeddingService.js';
import { env } from '../config/env.js';

function skillNameSet(project) {
  return new Set((project.skills ?? []).map((skill) => String(skill.name)));
}

function sameValue(a, b) {
  return a === b || (a == null && b == null);
}

function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return null;
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Builds a differentiation object from structured project data already in
 * the database. Never invents information - only reports set differences
 * between the two projects' existing fields.
 */
export function differentiateProjects(projectA, projectB, similarityScore) {
  const skillsA = skillNameSet(projectA);
  const skillsB = skillNameSet(projectB);

  const onlyInA = [...skillsA].filter((name) => !skillsB.has(name));
  const onlyInB = [...skillsB].filter((name) => !skillsA.has(name));
  const shared = [...skillsA].filter((name) => skillsB.has(name));

  const sameDomain = String(projectA.domain).trim().toLowerCase() === String(projectB.domain).trim().toLowerCase();

  const teamSizeA = projectA.teamSize ?? null;
  const teamSizeB = projectB.teamSize ?? null;
  const memberCountA = projectA.memberCount ?? null;
  const memberCountB = projectB.memberCount ?? null;

  const deadlineA = projectA.deadline ?? null;
  const deadlineB = projectB.deadline ?? null;

  const leadA = projectA.ownerName ?? null;
  const leadB = projectB.ownerName ?? null;

  return {
    similarityScore: Number(similarityScore.toFixed(3)),
    differences: {
      technologies: { onlyInFirst: onlyInA, onlyInSecond: onlyInB, shared },
      skills: { onlyInFirst: onlyInA, onlyInSecond: onlyInB, shared },
      domain: sameDomain
        ? { same: true, value: projectA.domain }
        : { same: false, first: projectA.domain, second: projectB.domain },
      focus: {
        firstTitle: projectA.title,
        secondTitle: projectB.title,
        distinctSkillCount: { first: onlyInA.length, second: onlyInB.length }
      },
      // Distinguishing metadata: helps a student tell two similar-sounding
      // projects apart even when their descriptions and skills overlap.
      lead: {
        same: sameValue(leadA, leadB),
        first: leadA,
        second: leadB
      },
      teamComposition: {
        same: teamSizeA === teamSizeB,
        first: { teamSize: teamSizeA, memberCount: memberCountA },
        second: { teamSize: teamSizeB, memberCount: memberCountB }
      },
      timeline: {
        same: sameValue(deadlineA, deadlineB),
        first: deadlineA,
        second: deadlineB,
        daysApart: daysBetween(deadlineA, deadlineB)
      }
    }
  };
}

/**
 * Finds all pairs within `projects` whose description embeddings exceed
 * the configured similarity threshold. Projects without a persisted
 * embedding yet are skipped (rather than embedding on demand) so
 * recommendation requests never trigger unnecessary embedding
 * regeneration - see the backfill script for populating missing
 * embeddings.
 */
export function findSimilarProjectPairs(projects, threshold = env.duplicateSimilarityThreshold) {
  const withEmbeddings = projects.filter((project) => Array.isArray(project.descriptionEmbedding) && project.descriptionEmbedding.some(Boolean));
  const pairs = [];

  for (let i = 0; i < withEmbeddings.length; i += 1) {
    for (let j = i + 1; j < withEmbeddings.length; j += 1) {
      const a = withEmbeddings[i];
      const b = withEmbeddings[j];
      const similarity = cosineSimilarity(a.descriptionEmbedding, b.descriptionEmbedding);
      if (similarity >= threshold) {
        pairs.push({
          projectId: a.id,
          similarProjectId: b.id,
          similarityScore: Number(similarity.toFixed(3)),
          ...differentiateProjects(a, b, similarity)
        });
      }
    }
  }

  return pairs;
}

/**
 * Swaps a two-sided { first, second, ...rest } shaped diff so it reads
 * correctly from the other project's perspective. `same`/computed fields
 * like `daysApart` are symmetric and left untouched.
 */
function swapTwoSided(field) {
  return { ...field, first: field.second, second: field.first };
}

/**
 * Maps similarity pairs to a per-project lookup: projectId -> list of
 * { project, similarityScore, differences } for projects similar to it,
 * so callers can attach a "similar projects" list to each recommendation.
 * The `differences` object is computed once per pair as (first vs second);
 * when attaching it to the second project's list, every first/second-shaped
 * field is swapped so it always reads correctly from the perspective of
 * the project it's attached to.
 */
function swapDifferences(differences) {
  const swapSetDiff = (setDiff) => ({
    onlyInFirst: setDiff.onlyInSecond,
    onlyInSecond: setDiff.onlyInFirst,
    shared: setDiff.shared
  });

  return {
    technologies: swapSetDiff(differences.technologies),
    skills: swapSetDiff(differences.skills),
    domain: differences.domain.same
      ? differences.domain
      : { same: false, first: differences.domain.second, second: differences.domain.first },
    focus: {
      firstTitle: differences.focus.secondTitle,
      secondTitle: differences.focus.firstTitle,
      distinctSkillCount: {
        first: differences.focus.distinctSkillCount.second,
        second: differences.focus.distinctSkillCount.first
      }
    },
    lead: swapTwoSided(differences.lead),
    teamComposition: swapTwoSided(differences.teamComposition),
    timeline: swapTwoSided(differences.timeline)
  };
}

export function groupSimilarProjectsByProjectId(projects, pairs) {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const grouped = new Map();

  const addEntry = (fromId, toId, entry) => {
    if (!grouped.has(fromId)) grouped.set(fromId, []);
    grouped.get(fromId).push({ project: byId.get(toId), ...entry });
  };

  for (const pair of pairs) {
    const { projectId, similarProjectId, similarityScore, differences } = pair;
    addEntry(projectId, similarProjectId, { similarityScore, differences });
    addEntry(similarProjectId, projectId, { similarityScore, differences: swapDifferences(differences) });
  }

  return grouped;
}
