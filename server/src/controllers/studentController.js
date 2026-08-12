import pdf from 'pdf-parse';
import {
  canViewStudentContact,
  getStudentById,
  getStudentByUserId,
  listSkillDictionary,
  replaceStudentSkills,
  setResumePath,
  updateStudent
} from '../models/studentModel.js';
import { extractSkills } from '../services/skillExtraction.js';
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

async function sendVisibleStudent(req, res, student) {
  if (!student || Number(student.college_id) !== Number(req.user.collegeId)) throw new AppError(404, 'Student profile not found');
  const contactVisible = await canViewStudentContact(req.user.id, student.id, req.user.collegeId);
  res.json({
    student: {
      id: student.id,
      userId: student.user_id,
      name: student.name,
      department: student.department,
      year: student.year,
      bio: student.bio,
      interests: student.interests,
      availabilityHoursPerWeek: student.availability_hours_per_week,
      skills: student.skills,
      ...(contactVisible ? { email: student.email } : {}),
      contactVisible
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
    availability_hours_per_week: req.body.availabilityHoursPerWeek
  };
  res.json({ student: await updateStudent(id, changes) });
}

export async function uploadResume(req, res) {
  const id = Number(req.params.id);
  const profile = await ownProfile(req, id);
  if (!req.file) throw new AppError(400, 'A PDF resume is required');

  let savedReference;
  try {
    const buffer = await storage.readUpload(req.file);
    const parsed = await pdf(buffer);
    const dictionary = await listSkillDictionary();
    const proposedSkills = extractSkills(parsed.text, dictionary);
    savedReference = await storage.saveUpload(req.file);
    await setResumePath(id, savedReference);
    if (profile.resume_path && profile.resume_path !== savedReference) {
      storage.deleteReference(profile.resume_path).catch((error) => {
        req.log?.warn({ err: error, studentId: id }, 'Could not remove replaced resume object');
      });
    }
    const resumePath = `/api/students/${id}/resume`;
    res.json({ resumePath, proposedSkills, message: 'Review these skills before saving them.' });
  } catch (error) {
    if (savedReference) await storage.deleteReference(savedReference).catch(() => {});
    await storage.discardUpload(req.file);
    if (error instanceof AppError) throw error;
    throw new AppError(400, 'The PDF could not be read');
  }
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

export async function listSkills(req, res) {
  res.json({ skills: await listSkillDictionary() });
}
