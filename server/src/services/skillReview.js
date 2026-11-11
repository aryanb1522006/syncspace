// skillReview.js
//
// Review workflow for skills suggested by GitHub / LinkedIn evidence.
//  - A suggestion is a dictionary skill with evidence that is neither on
//    the student's profile nor already decided.
//  - Approving REQUIRES a student-chosen proficiency (never inferred) and
//    only ADDS the skill when it is missing: a manually entered skill and
//    its proficiency are never overwritten.
//  - Rejecting records the decision so re-syncs do not suggest it again;
//    it never removes a skill the student added themselves.
// The repository is injected (like teamWorkflow.js) so the rules are
// unit-testable without PostgreSQL.

import { summarizeEvidence } from './evidenceScoring.js';
import { AppError } from '../utils/AppError.js';

export async function decideSkillSuggestion(repository, { studentId, skillId, decision, proficiency }) {
  return repository.transaction(async (tx) => {
    const evidence = await tx.listEvidenceForSkill(studentId, skillId);
    if (!evidence.length) throw new AppError(404, 'No profile evidence was found for this skill');

    if (decision === 'approved') {
      if (!Number.isInteger(proficiency) || proficiency < 1 || proficiency > 5) {
        throw new AppError(400, 'Choose your proficiency (1-5) before approving a skill');
      }
      const added = await tx.addSkillIfMissing(studentId, skillId, proficiency);
      await tx.saveDecision(studentId, skillId, 'approved');
      return { skillId, decision, addedToProfile: added };
    }

    await tx.saveDecision(studentId, skillId, 'rejected');
    return { skillId, decision, addedToProfile: false };
  });
}

/**
 * Combines evidence rows, decisions and the student's current skills into
 * the review list shown on the profile page. Each entry's status is:
 *   on_profile  already one of the student's skills (evidence backs it)
 *   approved / rejected  decided earlier
 *   pending     awaiting the student's review
 *   unmatched   detected technology that is not in the skill dictionary
 */
export function buildSkillReview(evidenceRows, decisions, profileSkillIds) {
  const decided = new Map(decisions.map((row) => [Number(row.skillId), row.decision]));
  const onProfile = new Set(profileSkillIds.map(Number));
  return summarizeEvidence(evidenceRows).map((group) => {
    let status = 'unmatched';
    if (group.skillId) {
      status = onProfile.has(Number(group.skillId)) ? 'on_profile' : decided.get(Number(group.skillId)) ?? 'pending';
    }
    return { ...group, status };
  });
}
