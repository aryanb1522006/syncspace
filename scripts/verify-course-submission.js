import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredPaths = [
  ".github/workflows/course-docs.yml",
  "code/README.md",
  "course-submission-status.md",
  "docs/index.md",
  "docs/course/course-compliance.md",
  "docs/course/project-overview.md",
  "docs/course/requirements.md",
  "docs/course/design-and-uml.md",
  "docs/course/backlog.md",
  "docs/course/testing-and-evaluation.md",
  "journals/README.md",
  "mkdocs.yml",
  "project-proposal/main.tex",
  "project-report-prototype-stage/main.tex",
  "project-report-final/README.md",
];

const failures = [];
for (const relativePath of requiredPaths) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing required course artifact: ${relativePath}`);
  }
}

const journalRoot = path.join(root, "journals");
const memberJournals = fs.existsSync(journalRoot)
  ? fs
      .readdirSync(journalRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "TEMPLATE")
      .map((entry) => entry.name)
  : [];

if (memberJournals.length === 0) {
  failures.push("At least one non-template journal folder is required.");
}

for (const journal of memberJournals) {
  const journalPath = path.join(journalRoot, journal);
  const pages = fs.readdirSync(journalPath).filter((file) => file.endsWith(".md"));
  if (!pages.includes("index.md") || pages.length < 2) {
    failures.push(`${journal} requires index.md and at least one weekly Markdown entry.`);
  }
}

const proposalPath = path.join(root, "project-proposal", "main.tex");
let proposalWordCount = 0;
if (fs.existsSync(proposalPath)) {
  let proposal = fs.readFileSync(proposalPath, "utf8");
  const documentStart = proposal.indexOf("\\begin{document}");
  const documentEnd = proposal.indexOf("\\end{document}");
  if (documentStart >= 0 && documentEnd > documentStart) {
    proposal = proposal.slice(documentStart + "\\begin{document}".length, documentEnd);
  }
  proposal = proposal
    .replace(/%.*$/gm, " ")
    .replace(/\\(?:begin|end)\{[^}]+\}/g, " ")
    .replace(/\\[A-Za-z@]+(?:\[[^\]]*\])?/g, " ")
    .replace(/[{}&]/g, " ");
  proposalWordCount = (proposal.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) ?? []).length;
  if (proposalWordCount < 1000 || proposalWordCount > 1500) {
    failures.push(
      `Proposal is approximately ${proposalWordCount} words; official guidance targets roughly 1,000-1,500.`,
    );
  }
}

const markerPaths = [
  "course-submission-status.md",
  "project-proposal/main.tex",
  "project-report-prototype-stage/main.tex",
  ...memberJournals.map((journal) => `journals/${journal}/index.md`),
];
const manualMarkerCount = markerPaths.reduce((count, relativePath) => {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return count;
  const contents = fs.readFileSync(filePath, "utf8");
  return count + (contents.match(/TODO|ROLLNO|TEAM MEMBER|LAB INSTRUCTOR/g) ?? []).length;
}, 0);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log(`Course structure verified: ${requiredPaths.length} required artifacts present.`);
console.log(`Member journal folders found: ${memberJournals.join(", ")}.`);
console.log(`Approximate proposal word count: ${proposalWordCount}.`);
console.log(`Manual metadata markers remaining (reported, not hidden): ${manualMarkerCount}.`);
