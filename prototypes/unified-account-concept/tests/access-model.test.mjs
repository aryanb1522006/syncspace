import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_ACTIONS,
  canViewTeamEmail,
  getAccountCapabilities,
  getVisibleTeamContacts,
} from "../src/access-model.js";

const team = {
  owner: { id: "owner", name: "Owner", email: "owner@example.edu" },
  collaborators: [
    { id: "accepted", name: "Accepted", email: "accepted@example.edu", status: "accepted" },
    { id: "pending", name: "Pending", email: "pending@example.edu", status: "pending" },
    { id: "rejected", name: "Rejected", email: "rejected@example.edu", status: "rejected" },
  ],
};

test("one signed-in account receives both project actions", () => {
  assert.deepEqual(ACCOUNT_ACTIONS, ["post", "join"]);
  assert.deepEqual(getAccountCapabilities({ id: "student-1" }), {
    canPost: true,
    canJoin: true,
  });
});

test("signed-out visitors receive neither project action", () => {
  assert.deepEqual(getAccountCapabilities(null), {
    canPost: false,
    canJoin: false,
  });
});

test("owner and accepted collaborator can see each other's email", () => {
  assert.equal(canViewTeamEmail({ viewerId: "owner", team, personId: "accepted" }), true);
  assert.equal(canViewTeamEmail({ viewerId: "accepted", team, personId: "owner" }), true);
});

test("pending or unrelated accounts cannot see team email", () => {
  assert.equal(canViewTeamEmail({ viewerId: "pending", team, personId: "owner" }), false);
  assert.equal(canViewTeamEmail({ viewerId: "stranger", team, personId: "accepted" }), false);
  assert.equal(canViewTeamEmail({ viewerId: "accepted", team, personId: "pending" }), false);
});

test("visible contacts exclude pending and rejected applicants", () => {
  const contacts = getVisibleTeamContacts(team, "accepted");
  assert.deepEqual(
    contacts.map(({ id, email }) => ({ id, email })),
    [
      { id: "owner", email: "owner@example.edu" },
      { id: "accepted", email: "accepted@example.edu" },
    ],
  );
});

test("contact rows hide emails from a viewer outside the accepted team", () => {
  const contacts = getVisibleTeamContacts(team, "stranger");
  assert.ok(contacts.every((contact) => contact.email === null));
});
