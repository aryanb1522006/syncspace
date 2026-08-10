import { getStudentRecommendationContext, getTeammateRecommendationContext } from '../models/recommendationModel.js';
import { computeMatchScore, computeSkillGap, isEligible, rankTeammates } from '../services/matchingEngine.js';
import { AppError } from '../utils/AppError.js';

const requestedLimit = (value) => Math.min(Math.max(Number(value) || 6, 1), 20);

export async function recommendProjects(req, res) {
  const context = await getStudentRecommendationContext(req.user.id, req.user.collegeId);
  if (!context) throw new AppError(404, 'Student profile not found');

  const recommendations = context.projects
    .filter((project) => isEligible(context.student, project))
    .map((project) => ({
      ...project,
      match: computeMatchScore(
        context.student.skills,
        project.skills,
        context.student.interests,
        project.domain,
        context.student.availabilityHoursPerWeek,
        project.commitmentHoursPerWeek
      )
    }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, requestedLimit(req.query.limit));

  res.json({ recommendations });
}

export async function recommendTeammates(req, res) {
  const projectId = Number(req.params.projectId);
  const context = await getTeammateRecommendationContext(projectId, req.user.collegeId);
  if (!context) throw new AppError(404, 'Project not found');
  if (Number(context.project.owner_id) !== req.user.id) throw new AppError(403, 'Only the project owner can view teammate recommendations');

  const skillGap = computeSkillGap(context.project.skills, context.currentTeamSkills);
  const candidates = rankTeammates(
    context.candidates.filter((candidate) => !candidate.hasApplication && !candidate.isMember),
    skillGap
  )
    .slice(0, requestedLimit(req.query.limit))
    .map((candidate) => ({ ...candidate, coverageScore: Math.round(candidate.coverageScore * 100) }));

  res.json({ projectId, skillGap, candidates });
}
