import { AppError } from '../utils/AppError.js';

export async function decideApplication(repository, { applicationId, ownerId, decision }) {
  return repository.transaction(async (tx) => {
    const application = await tx.getApplicationForUpdate(applicationId);
    if (!application) throw new AppError(404, 'Application not found');
    if (Number(application.owner_id) !== Number(ownerId)) throw new AppError(403, 'Only the project owner can decide this application');
    if (application.status !== 'pending') throw new AppError(409, 'Application has already been decided');

    if (decision === 'rejected') {
      await tx.updateApplicationStatus(applicationId, decision);
      await tx.createNotification(application.student_user_id, `Your application to ${application.project_title} was not selected.`);
      return { applicationId, status: decision, teamId: null };
    }

    const team = await tx.getOrCreateTeam(application.project_id);
    const memberCount = await tx.countTeamMembers(team.id);
    if (memberCount >= Number(application.team_size)) throw new AppError(409, 'The project team is already full');

    await tx.addTeamMember(team.id, application.student_id);
    await tx.updateApplicationStatus(applicationId, 'accepted');
    const newCount = memberCount + 1;
    if (newCount >= Number(application.team_size)) await tx.updateProjectStatus(application.project_id, 'active');
    await tx.createNotification(application.student_user_id, `You joined ${application.project_title}. Your team workspace is ready.`);

    return { applicationId, status: 'accepted', teamId: Number(team.id), memberCount: newCount };
  });
}
