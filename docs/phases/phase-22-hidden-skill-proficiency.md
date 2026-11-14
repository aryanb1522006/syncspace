# Skills without visible proficiency ratings

Students add and review skills without choosing a numeric level. Show skill names in the profile editor, member profiles and the application inbox. GitHub/LinkedIn suggestions still require explicit approval; resume suggestions still require review before saving. Evidence confidence percentages and matching scores retain their existing meanings.

Keep the existing API and database contract: proficiency remains an integer from 1 to 5. New manual skills, reviewed resume additions and approved connected-source suggestions send 3 internally. Existing values are preserved when adding/removing skills or approving evidence for an existing skill. There is no bulk update of existing users and no schema migration.

The project and teammate matching code is unchanged: it uses skill identifiers/overlap and other profile context rather than proficiency. Privacy, disconnect and OAuth behavior are unchanged.

Validation: 138 server tests with real isolated PostgreSQL and 49 client tests pass with zero failures/skips. Client regressions exercise manual add/remove with existing ratings and unsaved profile edits preserved, explicit resume review with internal defaults, one-click evidence approval and rejection/visibility controls, member skill names and owner application acceptance. Production build, config/course checks and whitespace checks pass. Local real-API desktop and 390px mobile review shows compact chips and no rating selectors or horizontal overflow; viewport override restored. Scoped diff review confirms no server/schema/matching changes.

Release through the normal frontend deployment after exact-source CI passes. This change needs no provider settings, Render environment changes or database migration. Roll back the frontend commit if necessary; all stored skill data remains compatible with the previous UI.
