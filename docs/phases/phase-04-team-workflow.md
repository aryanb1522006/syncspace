# Phase 4 — Applications and team workspace API

## Delivered

- Student application endpoint with deadline, capacity, duplicate, membership, project-status, and college checks.
- Owner-only application inbox and transactional accept/reject decisions.
- Team creation on first acceptance and atomic `team_members` insertion on accept.
- Capacity recheck while the application and team are locked; the project becomes active when full.
- Team workspace read endpoint with members and tasks.
- Task create/update with team-access checks and assignee-membership validation.
- Notification list/read endpoints designed for simple client polling.
- Notifications for new applications, acceptances, and rejections.

## Critical transaction

`application pending → owner decision → team lock/create → capacity check → member insert → application accepted → notification`

All steps occur inside one PostgreSQL transaction. A failure rolls the entire decision back, preventing accepted applications without memberships.

## Verification

- A repository-backed workflow integration test proves: pending application → accept → team created → member inserted → task assignable to that member.
- Separate checks verify owner-only decisions and one-time decision semantics.
- Existing auth, matching, extraction, and workflow tests remain green.
- Live SQL transaction verification remains deferred because PostgreSQL is unavailable in this environment.

## Polling contract

The frontend may call `GET /api/notifications` on an interval. No WebSocket or second service was introduced.
