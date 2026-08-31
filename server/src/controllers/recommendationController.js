import { getStudentRecommendationContext, getTeammateRecommendationContext } from '../models/recommendationModel.js';
import { computeMatchScore, computeSkillGap, isEligible, rankTeammates } from '../services/matchingEngine.js';
import { generateEmbedding } from '../services/embeddingService.js';
import { buildStudentProfileText, computeRecommendationScore } from '../services/recommendationScoring.js';
import { findSimilarProjectPairs, groupSimilarProjectsByProjectId } from '../services/similarProjectsService.js';
import { AppError } from '../utils/AppError.js';

const requestedLimit = (value) => Math.min(Math.max(Number(value) || 6, 1), 20);

export async function recommendProjects(req, res) {
  const context = await getStudentRecommendationContext(req.user.id, req.user.collegeId);
  if (!context) throw new AppError(404, 'Student profile not found');

  const eligibleProjects = context.projects.filter(
    (project) => Number(project.ownerId) !== req.user.id && isEligible(context.student, project)
  );

  // Existing behaviour preserved: computeMatchScore is unchanged, so
  // `match` on each recommendation keeps its original shape/meaning.
  const withExistingMatch = eligibleProjects.map((project) => ({
    ...project,
    match: computeMatchScore(
      context.student.skills,
      project.skills,
      context.student.interests,
      project.domain,
      context.student.availabilityHoursPerWeek,
      project.commitmentHoursPerWeek
    )
  }));

  // New: combined skill-overlap + semantic-cosine-similarity score.
  // The student's profile embedding is generated once per request (not
  // persisted, since bio/skills change more often than we'd want to
  // manage cache invalidation for); project description embeddings are
  // read from persisted storage, never regenerated here.
  const studentProfileText = buildStudentProfileText(context.student);
  const studentEmbedding = await generateEmbedding(studentProfileText);

  const withRecommendation = await Promise.all(
    withExistingMatch.map(async (project) => ({
      ...project,
      recommendation: await computeRecommendationScore({
        student: context.student,
        studentEmbedding,
        matchBreakdown: project.match.breakdown,
        project
      })
    }))
  );

  // New: duplicate/highly-similar project detection + differentiation,
  // computed over the same eligible-project set already fetched for this
  // request (scoped to the student's college) so no extra queries or
  // embedding regeneration are required.
  const similarPairs = findSimilarProjectPairs(withRecommendation);
  const similarByProjectId = groupSimilarProjectsByProjectId(withRecommendation, similarPairs);

  const recommendations = withRecommendation
    .sort((a, b) => b.recommendation.finalScore - a.recommendation.finalScore || b.match.score - a.match.score)
    .slice(0, requestedLimit(req.query.limit))
    .map((project) => {
      const similar = (similarByProjectId.get(project.id) ?? []).map((entry) => ({
        projectId: entry.project.id,
        title: entry.project.title,
        similarityScore: entry.similarityScore,
        differences: entry.differences
      }));
      return { ...project, similarProjects: similar };
    });

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
