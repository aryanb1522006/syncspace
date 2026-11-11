import { env } from '../config/env.js';
import {
  deleteConnection,
  getConnection,
  listConnections,
  listDecisions,
  listEvidence,
  recordSyncError,
  replaceSourceEvidence,
  saveGitHubConnection,
  setEvidenceVisibility,
  skillReviewRepository
} from '../models/profileIntelligenceModel.js';
import { getStudentByUserId, listSkillDictionary } from '../models/studentModel.js';
import { analyzeRepositories } from '../services/githubAnalyzer.js';
import {
  buildAuthorizeUrl,
  createConnectState,
  createGitHubClient,
  exchangeOAuthCode,
  GitHubRevokedError,
  revokeOAuthGrant,
  verifyConnectState
} from '../services/githubClient.js';
import { parseLinkedInExport } from '../services/linkedinExport.js';
import { buildSkillReview, decideSkillSuggestion } from '../services/skillReview.js';
import { decryptToken, encryptToken } from '../services/tokenCrypto.js';
import { AppError } from '../utils/AppError.js';

async function currentStudent(req) {
  const student = await getStudentByUserId(req.user.id);
  if (!student) throw new AppError(404, 'Student profile not found');
  return student;
}

function requireGitHubConfigured() {
  if (!env.githubOAuthConfigured) {
    throw new AppError(503, 'GitHub connection is not configured on this SyncSpace server.');
  }
}

const publicConnection = (connection) => connection && {
  source: connection.source,
  username: connection.username,
  profileUrl: connection.profileUrl,
  status: connection.status,
  connectedAt: connection.connectedAt,
  lastSyncedAt: connection.lastSyncedAt,
  lastSyncError: connection.lastSyncError
};

async function overview(student) {
  const [connections, evidence, decisions] = await Promise.all([
    listConnections(student.id), listEvidence(student.id), listDecisions(student.id)
  ]);
  const bySource = new Map(connections.map((connection) => [connection.source, connection]));
  return {
    github: { configured: env.githubOAuthConfigured, connection: publicConnection(bySource.get('github')) ?? null },
    linkedin: { connection: publicConnection(bySource.get('linkedin_export')) ?? null },
    skills: buildSkillReview(evidence, decisions, student.skills.map((skill) => skill.id))
  };
}

async function syncGitHub(student, connection) {
  try {
    const token = decryptToken(connection.accessTokenCiphertext, env.tokenEncryptionKey);
    const client = createGitHubClient({ token });
    // Re-read the login from GitHub: usernames can change; the numeric id cannot.
    const user = await client.getAuthenticatedUser();
    if (String(user.id) !== String(connection.providerUserId)) throw new GitHubRevokedError();
    const repos = await client.listPublicRepositories(user.login, env.githubMaxRepos);
    const data = await client.collectRepositoryData(repos);
    const dictionary = await listSkillDictionary();
    const { evidence, profileText } = analyzeRepositories(data, dictionary);
    await replaceSourceEvidence({ studentId: student.id, source: 'github', evidence, profileText });
  } catch (error) {
    await recordSyncError(student.id, 'github', error.message, { revoked: error instanceof GitHubRevokedError });
    throw error;
  }
}

export async function getOverview(req, res) {
  res.json(await overview(await currentStudent(req)));
}

export async function getGitHubAuthorizeUrl(req, res) {
  requireGitHubConfigured();
  const state = createConnectState(req.user.id, env.jwtSecret);
  res.json({ url: buildAuthorizeUrl({ clientId: env.githubClientId, redirectUri: env.githubRedirectUri, state }) });
}

export async function exchangeGitHubCode(req, res) {
  requireGitHubConfigured();
  verifyConnectState(req.body.state, req.user.id, env.jwtSecret);

  const student = await currentStudent(req);
  const token = await exchangeOAuthCode({
    code: req.body.code,
    clientId: env.githubClientId,
    clientSecret: env.githubClientSecret,
    redirectUri: env.githubRedirectUri
  });
  const user = await createGitHubClient({ token }).getAuthenticatedUser();
  await saveGitHubConnection({
    studentId: student.id,
    providerUserId: String(user.id),
    username: user.login,
    profileUrl: user.html_url,
    accessTokenCiphertext: encryptToken(token, env.tokenEncryptionKey)
  });
  await syncGitHub(student, await getConnection(student.id, 'github'));
  res.json(await overview(student));
}

export async function syncGitHubNow(req, res) {
  requireGitHubConfigured();
  const student = await currentStudent(req);
  const connection = await getConnection(student.id, 'github');
  if (!connection) throw new AppError(404, 'GitHub is not connected');
  if (connection.status !== 'active' || !connection.accessTokenCiphertext) throw new GitHubRevokedError();
  await syncGitHub(student, connection);
  res.json(await overview(student));
}

export async function disconnectGitHub(req, res) {
  const student = await currentStudent(req);
  const connection = await getConnection(student.id, 'github');
  if (!connection) throw new AppError(404, 'GitHub is not connected');
  if (env.githubOAuthConfigured && connection.accessTokenCiphertext) {
    try {
      await revokeOAuthGrant({
        token: decryptToken(connection.accessTokenCiphertext, env.tokenEncryptionKey),
        clientId: env.githubClientId,
        clientSecret: env.githubClientSecret
      });
    } catch (error) {
      // The local token is deleted regardless; the student can also revoke
      // SyncSpace under GitHub Settings -> Applications.
      req.log?.warn({ err: error }, 'GitHub grant revocation failed');
    }
  }
  await deleteConnection(student.id, 'github', { deleteEvidence: req.validatedQuery?.deleteEvidence === 'true' });
  res.json(await overview(student));
}

export async function importLinkedIn(req, res) {
  if (!req.file) throw new AppError(400, 'Choose your LinkedIn data export ZIP');
  const student = await currentStudent(req);
  const { evidence, profileText, sectionsFound } = parseLinkedInExport(req.file.buffer, await listSkillDictionary());
  await replaceSourceEvidence({ studentId: student.id, source: 'linkedin_export', evidence, profileText });
  res.json({ ...(await overview(student)), import: { sectionsFound, evidenceCount: evidence.length } });
}

export async function deleteLinkedIn(req, res) {
  const student = await currentStudent(req);
  // The import IS the data, so removing it always deletes its evidence.
  await deleteConnection(student.id, 'linkedin_export', { deleteEvidence: true });
  res.json(await overview(student));
}

export async function decideSkill(req, res) {
  const student = await currentStudent(req);
  const result = await decideSkillSuggestion(skillReviewRepository, {
    studentId: student.id,
    skillId: req.params.skillId,
    decision: req.body.decision,
    proficiency: req.body.proficiency
  });
  res.json({ result, ...(await overview(await currentStudent(req))) });
}

export async function updateEvidenceVisibility(req, res) {
  const student = await currentStudent(req);
  const updated = await setEvidenceVisibility(student.id, req.body.evidenceIds, req.body.visibility);
  if (!updated.length) throw new AppError(404, 'Evidence not found');
  res.json(await overview(student));
}
