import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const evidenceSelect = `
  SELECT se.id, se.skill_id AS "skillId", s.name AS "skillName", se.raw_name AS "rawName",
    se.source, se.source_ref AS "sourceRef", se.evidence, se.detection_method AS "detectionMethod",
    se.confidence::float AS confidence, se.visibility, se.detected_at AS "detectedAt",
    se.last_verified_at AS "lastVerifiedAt"
  FROM skill_evidence se
  LEFT JOIN skills s ON s.id = se.skill_id`;

const connectionSelect = `
  SELECT id, student_id AS "studentId", source, provider_user_id AS "providerUserId", username,
    profile_url AS "profileUrl", access_token_ciphertext AS "accessTokenCiphertext", status,
    last_synced_at AS "lastSyncedAt", last_sync_error AS "lastSyncError", connected_at AS "connectedAt"
  FROM profile_connections`;

export async function getConnection(studentId, source) {
  const { rows } = await query(`${connectionSelect} WHERE student_id = $1 AND source = $2`, [studentId, source]);
  return rows[0] ?? null;
}

export async function listConnections(studentId) {
  const { rows } = await query(`${connectionSelect} WHERE student_id = $1`, [studentId]);
  return rows;
}

export async function saveGitHubConnection({ studentId, providerUserId, username, profileUrl, accessTokenCiphertext }) {
  try {
    const { rows: [connection] } = await query(
      `INSERT INTO profile_connections
         (student_id, source, provider_user_id, username, profile_url, access_token_ciphertext, status)
       VALUES ($1, 'github', $2, $3, $4, $5, 'active')
       ON CONFLICT (student_id, source) DO UPDATE SET
         provider_user_id = EXCLUDED.provider_user_id, username = EXCLUDED.username,
         profile_url = EXCLUDED.profile_url, access_token_ciphertext = EXCLUDED.access_token_ciphertext,
         status = 'active', last_sync_error = NULL, connected_at = NOW()
       RETURNING id`,
      [studentId, providerUserId, username, profileUrl, accessTokenCiphertext]
    );
    return connection;
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'This GitHub account is already connected to another SyncSpace profile.');
    throw error;
  }
}

/**
 * Replaces one source's evidence with the result of a fresh sync/import:
 * rows seen again are refreshed (keeping the student's visibility choice),
 * rows no longer found are deleted as outdated. NOW() is constant within
 * a transaction, so `last_verified_at < NOW()` selects exactly the rows
 * this sync did not touch.
 */
export function replaceSourceEvidence({ studentId, source, evidence, profileText }) {
  return withTransaction(async (client) => {
    if (source === 'linkedin_export') {
      await client.query(
        `INSERT INTO profile_connections (student_id, source) VALUES ($1, 'linkedin_export')
         ON CONFLICT (student_id, source) DO NOTHING`,
        [studentId]
      );
    }
    for (const item of evidence) {
      await client.query(
        `INSERT INTO skill_evidence
           (student_id, skill_id, raw_name, source, source_ref, evidence, detection_method, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (student_id, source, source_ref, detection_method, raw_name) DO UPDATE SET
           skill_id = EXCLUDED.skill_id, evidence = EXCLUDED.evidence,
           confidence = EXCLUDED.confidence, last_verified_at = NOW()`,
        [studentId, item.skillId, item.rawName, source, item.sourceRef, item.evidence, item.detectionMethod, item.confidence]
      );
    }
    await client.query(
      'DELETE FROM skill_evidence WHERE student_id = $1 AND source = $2 AND last_verified_at < NOW()',
      [studentId, source]
    );
    await client.query(
      `UPDATE profile_connections SET profile_text = $3, last_synced_at = NOW(), last_sync_error = NULL
       WHERE student_id = $1 AND source = $2`,
      [studentId, source, profileText]
    );
  });
}

export async function recordSyncError(studentId, source, message, { revoked = false } = {}) {
  await query(
    `UPDATE profile_connections SET last_sync_error = $3,
       status = CASE WHEN $4::boolean THEN 'revoked' ELSE status END,
       access_token_ciphertext = CASE WHEN $4::boolean THEN NULL ELSE access_token_ciphertext END
     WHERE student_id = $1 AND source = $2`,
    [studentId, source, String(message).slice(0, 500), revoked]
  );
}

/** Disconnects a source; optionally deletes all evidence it produced. */
export function deleteConnection(studentId, source, { deleteEvidence }) {
  return withTransaction(async (client) => {
    if (deleteEvidence) await client.query('DELETE FROM skill_evidence WHERE student_id = $1 AND source = $2', [studentId, source]);
    await client.query('DELETE FROM profile_connections WHERE student_id = $1 AND source = $2', [studentId, source]);
  });
}

export async function listEvidence(studentId) {
  const { rows } = await query(`${evidenceSelect} WHERE se.student_id = $1 ORDER BY se.confidence DESC, se.id`, [studentId]);
  return rows;
}

export async function listVisibleEvidence(studentId, visibilities) {
  const { rows } = await query(
    `${evidenceSelect} WHERE se.student_id = $1 AND se.skill_id IS NOT NULL AND se.visibility::text = ANY($2)
     ORDER BY se.confidence DESC, se.id`,
    [studentId, visibilities]
  );
  return rows;
}

export async function listDecisions(studentId) {
  const { rows } = await query(
    'SELECT skill_id AS "skillId", decision, decided_at AS "decidedAt" FROM skill_decisions WHERE student_id = $1',
    [studentId]
  );
  return rows;
}

export async function setEvidenceVisibility(studentId, evidenceIds, visibility) {
  const { rows } = await query(
    'UPDATE skill_evidence SET visibility = $3 WHERE student_id = $1 AND id = ANY($2::bigint[]) RETURNING id',
    [studentId, evidenceIds, visibility]
  );
  return rows.map((row) => Number(row.id));
}

export const skillReviewRepository = {
  transaction: (work) => withTransaction(async (client) => work({
    async listEvidenceForSkill(studentId, skillId) {
      const { rows } = await client.query('SELECT id FROM skill_evidence WHERE student_id = $1 AND skill_id = $2', [studentId, skillId]);
      return rows;
    },
    async addSkillIfMissing(studentId, skillId, proficiency) {
      const { rowCount } = await client.query(
        `INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES ($1, $2, $3)
         ON CONFLICT (student_id, skill_id) DO NOTHING`,
        [studentId, skillId, proficiency]
      );
      return rowCount > 0;
    },
    async saveDecision(studentId, skillId, decision) {
      await client.query(
        `INSERT INTO skill_decisions (student_id, skill_id, decision) VALUES ($1, $2, $3)
         ON CONFLICT (student_id, skill_id) DO UPDATE SET decision = EXCLUDED.decision, decided_at = NOW()`,
        [studentId, skillId, decision]
      );
    }
  }))
};
