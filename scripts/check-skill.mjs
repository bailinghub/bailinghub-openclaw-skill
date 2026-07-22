import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const skillDir = join(root, 'skills', 'bailinghub-executor');
const skillPath = join(skillDir, 'SKILL.md');
const runnerPath = join(skillDir, 'scripts', 'bailinghub-openclaw-executor.mjs');

const skill = await readFile(skillPath, 'utf8');
const runner = await readFile(runnerPath, 'utf8');

const failures = [];
const requirePattern = (pattern, message, source = skill) => {
  if (!pattern.test(source)) failures.push(message);
};

requirePattern(/^name:\s+bailinghub-executor$/m, 'Skill name must match its directory');
requirePattern(/agent governance/i, 'Description must include the agent-governance search intent');
requirePattern(/human approval/i, 'Description must include the human-approval search intent');
requirePattern(/audit trails/i, 'Description must include the audit-trail search intent');
requirePattern(/existing business systems/i, 'Description must name existing business systems');
requirePattern(/outbound executor/i, 'Description must name the outbound-executor role');
requirePattern(/self-hosted/i, 'Description must make the external BailingHub dependency clear');

for (const variable of ['BAILING_HUB_URL', 'BAILING_EXECUTOR_TOKEN', 'BAILING_TARGET']) {
  requirePattern(new RegExp(`- ${variable}\\b`), `Missing required env declaration: ${variable}`);
}

requirePattern(/delete childEnv\[key\]/, 'Runner must strip BAILING_* variables before starting OpenClaw', runner);
requirePattern(/shell:\s*false/, 'Runner must invoke OpenClaw without a shell', runner);
requirePattern(/claim_token/, 'Runner must report the dispatch claim token', runner);
requirePattern(/HTTP is allowed only for loopback tests/, 'Runner must fail closed on non-loopback HTTP', runner);

if (/\bTODO\b|\[TODO/.test(skill)) failures.push('SKILL.md still contains TODO content');
if (/OPENCLAW_FORWARD_BAILING_TOOLS/.test(skill + runner)) {
  failures.push('First release must not expose an opt-in path for forwarding BailingHub tool credentials');
}

for (const path of [
  join(skillDir, 'references', 'setup.md'),
  join(skillDir, 'references', 'security.md'),
  join(root, 'LICENSE'),
  join(root, 'SECURITY.md'),
]) {
  try {
    await access(path);
  } catch {
    failures.push(`Missing required file: ${path}`);
  }
}

if (failures.length) {
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write('Skill metadata, discoverability copy, and security invariants are consistent.\n');
