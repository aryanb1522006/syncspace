export const ACCOUNT_ACTIONS = Object.freeze(["post", "join"]);

export function getAccountCapabilities(account) {
  const signedIn = Boolean(account?.id);

  return {
    canPost: signedIn,
    canJoin: signedIn,
  };
}

export function canViewTeamEmail({ viewerId, team, personId }) {
  if (!viewerId || !team || !personId) return false;

  const acceptedIds = new Set([
    team.owner?.id,
    ...(team.collaborators ?? [])
      .filter((member) => member.status === "accepted")
      .map((member) => member.id),
  ]);

  return acceptedIds.has(viewerId) && acceptedIds.has(personId);
}

export function getVisibleTeamContacts(team, viewerId) {
  if (!team) return [];

  const people = [
    team.owner ? { ...team.owner, role: "Owner" } : null,
    ...(team.collaborators ?? []).map((member) => ({ ...member, role: "Collaborator" })),
  ].filter(Boolean);

  return people
    .filter((person) => person.role === "Owner" || person.status === "accepted")
    .map((person) => ({
      ...person,
      email: canViewTeamEmail({ viewerId, team, personId: person.id }) ? person.email : null,
    }));
}
