// skillReview.js
//
// Review workflow for skills suggested by GitHub / LinkedIn evidence.
//  - A suggestion is a dictionary skill with evidence that is neither on
//    the student's profile nor already decided.
//  - Approving GitHub evidence adds a missing skill and preserves existing ratings.
//  - Rejecting records the decision so re-syncs do not suggest it again;
//    it never removes a skill the student added themselves.
// The repository is injected (like teamWorkflow.js) so the rules are
// unit-testable without PostgreSQL.

import { combineConfidence, summarizeEvidence } from './evidenceScoring.js';
import { AppError } from '../utils/AppError.js';

const defaultSelectionThreshold = 0.1;

export async function decideSkillSuggestion(repository, { studentId, skillId, decision, proficiency }) {
  return repository.transaction(studentId, async (tx) => {
    const evidence = await tx.listEvidenceForSkill(studentId, skillId);
    if (!evidence.length) throw new AppError(404, 'No profile evidence was found for this skill');

    if (decision === 'approved') {
      if (!evidence.some((item) => item.source === 'github')) {
        throw new AppError(400, 'Add this skill manually from your profile.');
      }
      if (!Number.isInteger(proficiency) || proficiency < 1 || proficiency > 5) {
        throw new AppError(400, 'The skill could not be added. Refresh your profile and try again.');
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
 *   rejected    dismissed or removed after approval
 *   pending     awaiting the student's review
 *   unmatched   detected technology that is not in the skill dictionary
 */
export function buildSkillReview(evidenceRows, decisions, profileSkillIds) {
  const decided = new Set(decisions.map((row) => Number(row.skillId)));
  const onProfile = new Set(profileSkillIds.map(Number));
  return summarizeEvidence(evidenceRows).map((group) => {
    let status = 'unmatched';
    if (group.skillId) {
      status = onProfile.has(Number(group.skillId)) ? 'on_profile' : decided.has(Number(group.skillId)) ? 'rejected' : 'pending';
    }
    const selectedByDefault = status === 'pending' && group.sources.some((source) =>
      combineConfidence(group.items.filter((item) => item.source === source).map((item) => item.confidence)) > defaultSelectionThreshold
    );
    return { ...group, status, selectedByDefault };
  });
}
