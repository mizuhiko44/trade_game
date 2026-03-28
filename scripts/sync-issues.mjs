import { execSync } from "node:child_process";
import fs from "node:fs";

const raw = fs.readFileSync("docs/issue-backlog.json", "utf-8");
const backlog = JSON.parse(raw);

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function getOpenIssues() {
  const out = run("gh issue list --state open --limit 200 --json number,title");
  return JSON.parse(out);
}

function createIssue(issue) {
  const title = `[${issue.id}] ${issue.title}`;
  const body = `${issue.body}\n\n---\nPriority: ${issue.priority}\nImportance: ${issue.importance}`;
  const labelFlags = issue.labels.map((l) => `--label ${JSON.stringify(l)}`).join(" ");
  run(`gh issue create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} ${labelFlags}`);
  console.log(`created: ${title}`);
}

function ensureLabels(issue) {
  for (const label of issue.labels) {
    try {
      run(`gh label create ${JSON.stringify(label)} --color BFD4F2 --description ${JSON.stringify("auto-generated")}`);
    } catch {
      // already exists
    }
  }
}

const openIssues = getOpenIssues();
for (const issue of backlog) {
  const title = `[${issue.id}] ${issue.title}`;
  const exists = openIssues.find((i) => i.title === title);
  if (exists) {
    console.log(`exists: ${title}`);
    continue;
  }
  ensureLabels(issue);
  createIssue(issue);
}
