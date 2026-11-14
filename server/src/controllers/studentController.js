import {
  canViewStudentContact,
  editStudentSkill,
  getSharedProfileLinks,
  getStudentById,
  getStudentByUserId,
  listSkillDictionary,
  replaceStudentSkills,
  updateStudent
} from '../models/studentModel.js';
import { listVisibleEvidence } from '../models/profileIntelligenceModel.js';
import { findApplicantForOwner } from '../models/applicationModel.js';
import { summarizeEvidence } from '../services/evidenceScoring.js';
import { storage } from '../services/storage.js';
import { AppError } from '../utils/AppError.js';

async function ownProfile(req, studentId) {
  const profile = await getStudentById(studentId);
  if (!profile) throw new AppError(404, 'Student profile not found');
  if (Number(profile.user_id) !== req.user.id) throw new AppError(403, 'You can only edit your own profile');
  return profile;
}

export async function getMe(req, res) {
  const profile = await getStudentByUserId(req.user.id);
  if (!profile) throw new AppError(404, 'Student profile not found');
  res.json({ student: await getStudentById(profile.id) });
}

export async function getStudent(req, res) {
  const student = await getStudentById(Number(req.params.id));
  return sendVisibleStudent(req, res, student);
}

export async function getStudentByUser(req, res) {
  const student = await getStudentByUserId(Number(req.params.userId));
  return sendVisibleStudent(req, res, student);
}

export async function getApplicantProfile(req, res) {
  res.set('Cache-Control', 'no-store');
  const studentId = await findApplicantForOwner(req.params.id, req.params.applicationId, req.user.id, req.user.collegeId);
  return sendVisibleStudent(req, res, await getStudentById(studentId), { applicationReview: true });
}

async function sendVisibleStudent(req, res, student, { applicationReview = false } = {}) {
  if (!student || Number(student.college_id) !== Number(req.user.collegeId)) throw new AppError(404, 'Student profile not found');
  const contactVisible = await canViewStudentContact(req.user.id, student.id, req.user.collegeId);
  // Evidence is private unless the student chose 'team' (teammates, the
  // same relationship that reveals contact details) or 'college'.
  const isSelf = Number(student.user_id) === req.user.id;
  const visibilities = isSelf ? ['private', 'team', 'college'] : contactVisible ? ['team', 'college'] : ['college'];
  const [evidence, sharedLinks] = await Promise.all([
    listVisibleEvidence(student.id, visibilities, { onProfileOnly: !isSelf }),
    applicationReview ? getSharedProfileLinks(student.id) : null
  ]);
  res.json({
    student: {
      id: student.id,
      userId: student.user_id,
      name: student.name,
      avatarUrl: student.avatar_url ?? null,
      department: student.department,
      year: student.year,
      bio: student.bio,
      interests: student.interests,
      availabilityHoursPerWeek: student.availability_hours_per_week,
      skills: student.skills,
      ...(contactVisible ? { email: student.email, linkedinUrl: student.linkedin_url ?? null } : {}),
      ...(sharedLinks && { githubUrl: sharedLinks.githubUrl, linkedinUrl: sharedLinks.linkedinUrl }),
      contactVisible,
      skillEvidence: summarizeEvidence(evidence).map(({ skillId, name, confidence, evidenceClass, sources, items }) => ({
        skillId, name, confidence, evidenceClass, sources,
        items: items.map(({ sourceRef, evidence: text, detectionMethod, lastVerifiedAt }) => ({ sourceRef, evidence: text, detectionMethod, lastVerifiedAt }))
      }))
    }
  });
}

export async function updateProfile(req, res) {
  const id = Number(req.params.id);
  await ownProfile(req, id);
  const changes = {
    name: req.body.name,
    department: req.body.department,
    year: req.body.year,
    bio: req.body.bio,
    interests: req.body.interests,
    availability_hours_per_week: req.body.availabilityHoursPerWeek,
    linkedin_url: req.body.linkedinUrl,
    share_profile_links: req.body.shareProfileLinks
  };
  res.json({ student: await updateStudent(id, changes) });
}

export async function downloadResume(req, res) {
  const id = Number(req.params.id);
  const profile = await ownProfile(req, id);
  if (!profile.resume_path) throw new AppError(404, 'Resume not found');
  const download = await storage.resolveDownload(profile.resume_path);
  if (download.type === 'redirect') return res.redirect(302, download.url);
  res.type('application/pdf').sendFile(download.path);
}

export async function updateSkills(req, res) {
  const id = Number(req.params.id);
  await ownProfile(req, id);
  res.json({ student: await replaceStudentSkills(id, req.body.skills) });
}

export async function addSkill(req, res) {
  const { id, skillId } = req.params;
  await ownProfile(req, id);
  res.json({ student: await editStudentSkill(id, skillId, false) });
}

export async function removeSkill(req, res) {
  const { id, skillId } = req.params;
  await ownProfile(req, id);
  res.json({ student: await editStudentSkill(id, skillId, true) });
}

export async function listSkills(req, res) {
  res.json({ skills: await listSkillDictionary() });
}
