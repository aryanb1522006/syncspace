# Phase 14 - Profile skills and responsive polish

## Status

Complete in the repository and verified locally. Production deployment is pending a commit, push, and successful Appwrite redeploy.

## Delivered

- Replaced the fixed `3/5` skill label with an editable proficiency selector for every saved skill.
- Added a manual skill picker backed by the existing skill dictionary, including a 1-5 proficiency choice.
- Kept resume parsing as a second input path and made every resume suggestion reviewable with its own proficiency before saving.
- Persisted manual additions, proficiency changes, reviewed resume suggestions, and removals through the existing profile-skills API.
- Forced readable dark text on pale skill chips, skill controls, and lime primary buttons in both light and dark modes.
- Removed the duplicate create-project action from the My Projects right rail; the header and empty-state actions remain.
- Reduced mobile landing typography, spacing, project labels, and interactive-scene dimensions.
- Zoomed out and scaled the Three.js constellation at narrow widths so the animation fits the mobile viewport.

## Data behavior

Skill proficiency remains a numeric value from 1 through 5. Resume suggestions start at 3 only as a neutral default; the user must review the suggestion and can change it before saving. Manual skills are selected from the server-provided dictionary, which prevents duplicate or unsupported names from being written by the client.

## Verification

- Client tests: 12 passed.
- Production React build: passed.
- Automated UI coverage proves that a user can change an existing proficiency and add a dictionary skill manually while the resume path remains available.
- Desktop dark-mode browser QA confirmed dark text on pale skill chips and lime buttons.
- My Projects browser QA confirmed two visible `Create project` actions and no duplicate `Create a project` action in the right rail.
- Mobile browser QA at 390 x 844 confirmed no horizontal page overflow, a 370-pixel constellation, contained project labels, and reduced heading sizes.
- Browser console: no warnings or errors during the verified profile, project-dashboard, and mobile-landing journeys.

## Production checklist

- [ ] Commit and push Phase 14.
- [ ] Confirm Appwrite deploys the updated React bundle.
- [ ] Verify manual skill addition and proficiency updates with a real Thapar account.
- [ ] Upload a resume, review suggested proficiencies, and save the accepted skills.
- [ ] Check the profile and My Projects pages in both themes on the public site.
- [ ] Check the public landing page on a physical narrow-screen phone.

