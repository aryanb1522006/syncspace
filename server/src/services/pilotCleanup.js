export const SEEDED_DEMO_PROJECT_TITLES = Object.freeze([
  'GreenGrid',
  'StudyCircle',
  'BuildLog',
  'PocketPulse'
]);

export const SEEDED_DEMO_OWNER_DOMAINS = Object.freeze([
  'northstar.edu',
  'riverdale.edu'
]);

export const QA_PROJECT_TITLES = Object.freeze([
  '[QA] Phase 8 Live Check'
]);

export const SMOKE_PROJECT_PREFIX = 'Smoke Project ';
export const SMOKE_OWNER_DOMAIN = 'smoke.syncspace.test';

export function isKnownPilotTestProject({ title, ownerEmail }) {
  const normalizedEmail = String(ownerEmail ?? '').trim().toLowerCase();
  const ownerDomain = normalizedEmail.split('@').at(-1);

  if (QA_PROJECT_TITLES.includes(title)) return true;

  if (title?.startsWith(SMOKE_PROJECT_PREFIX)) {
    return ownerDomain === SMOKE_OWNER_DOMAIN;
  }

  return SEEDED_DEMO_PROJECT_TITLES.includes(title) &&
    SEEDED_DEMO_OWNER_DOMAINS.includes(ownerDomain);
}

export function pilotCleanupQueryParameters() {
  return [
    [...SEEDED_DEMO_PROJECT_TITLES],
    [...SEEDED_DEMO_OWNER_DOMAINS],
    [...QA_PROJECT_TITLES],
    `${SMOKE_PROJECT_PREFIX}%`,
    SMOKE_OWNER_DOMAIN
  ];
}

export const PILOT_CLEANUP_WHERE_SQL = `
  (
    p.title = ANY($1::text[])
    AND split_part(lower(u.email), '@', 2) = ANY($2::text[])
  )
  OR p.title = ANY($3::text[])
  OR (
    p.title LIKE $4
    AND split_part(lower(u.email), '@', 2) = $5
  )`;
