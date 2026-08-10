export const MATCH_WEIGHTS = Object.freeze({
  requiredSkills: 0.5,
  preferredSkills: 0.2,
  domainInterest: 0.15,
  availability: 0.15
});

const skillId = (skill) => Number(typeof skill === 'object' ? skill.skillId ?? skill.id : skill);
const skillSet = (skills = []) => new Set(skills.map(skillId));

const overlapRatio = (studentIds, projectSkills) => {
  if (!projectSkills.length) return 1;
  return projectSkills.filter((skill) => studentIds.has(skillId(skill))).length / projectSkills.length;
};

export function computeMatchScore(
  studentSkills,
  projectSkills,
  studentInterests,
  projectDomain,
  studentAvailability,
  projectCommitment,
  weights = MATCH_WEIGHTS
) {
  const studentIds = skillSet(studentSkills);
  const required = projectSkills.filter((skill) => skill.importance === 'required');
  const preferred = projectSkills.filter((skill) => skill.importance === 'preferred');
  const requiredSkillOverlapRatio = overlapRatio(studentIds, required);
  const preferredSkillOverlapRatio = overlapRatio(studentIds, preferred);
  const normalizedDomain = String(projectDomain).trim().toLowerCase();
  const domainInterestMatch = (studentInterests ?? []).some(
    (interest) => String(interest).trim().toLowerCase() === normalizedDomain
  ) ? 1 : 0;
  const availabilityRatio = projectCommitment > 0
    ? Math.min(Math.max(Number(studentAvailability) / Number(projectCommitment), 0), 1)
    : 1;

  const weightedScore =
    weights.requiredSkills * requiredSkillOverlapRatio +
    weights.preferredSkills * preferredSkillOverlapRatio +
    weights.domainInterest * domainInterestMatch +
    weights.availability * availabilityRatio;

  return {
    score: Math.round(weightedScore * 100),
    breakdown: {
      requiredSkillOverlapRatio,
      preferredSkillOverlapRatio,
      domainInterestMatch,
      availabilityRatio,
      contributions: {
        requiredSkills: Math.round(weights.requiredSkills * requiredSkillOverlapRatio * 100),
        preferredSkills: Math.round(weights.preferredSkills * preferredSkillOverlapRatio * 100),
        domainInterest: Math.round(weights.domainInterest * domainInterestMatch * 100),
        availability: Math.round(weights.availability * availabilityRatio * 100)
      }
    }
  };
}

export function computeSkillGap(projectSkills, currentTeamSkills) {
  const covered = skillSet(currentTeamSkills);
  return projectSkills
    .filter((skill) => !covered.has(skillId(skill)))
    .map((skill) => ({
      skillId: skillId(skill),
      name: skill.name,
      importance: skill.importance ?? 'required',
      weight: skill.importance === 'preferred' ? 1 : 2
    }))
    .sort((a, b) => b.weight - a.weight || String(a.name).localeCompare(String(b.name)));
}

export function computeCoverageScore(candidateSkills, weightedMissingSkills) {
  if (!weightedMissingSkills.length) return 1;
  const candidateIds = skillSet(candidateSkills);
  const totalWeight = weightedMissingSkills.reduce((sum, skill) => sum + skill.weight, 0);
  const coveredWeight = weightedMissingSkills.reduce(
    (sum, skill) => sum + (candidateIds.has(skillId(skill)) ? skill.weight : 0), 0
  );
  return coveredWeight / totalWeight;
}

export function rankTeammates(candidates, weightedMissingSkills) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      coverageScore: computeCoverageScore(candidate.skills, weightedMissingSkills)
    }))
    .sort((a, b) => b.coverageScore - a.coverageScore ||
      Number(b.availabilityHoursPerWeek ?? 0) - Number(a.availabilityHoursPerWeek ?? 0));
}

export function isEligible(student, project) {
  if (project.status !== 'open') return false;
  if (Number(project.memberCount ?? 0) >= Number(project.teamSize)) return false;
  if (new Date(project.deadline).getTime() <= Date.now()) return false;
  const projectId = Number(project.id);
  if ((student.applicationProjectIds ?? []).map(Number).includes(projectId)) return false;
  if ((student.membershipProjectIds ?? []).map(Number).includes(projectId)) return false;
  return true;
}
