#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = join(__dirname, '..', 'packages');

const PROFILES = {
  'bluetemberg-rules-git':                         { universal: true, profiles: [] },
  'bluetemberg-rules-security':                    { universal: true, profiles: [] },
  'bluetemberg-rules-docs':                        { universal: true, profiles: [] },
  'bluetemberg-guardrails-git':                    { universal: true, profiles: [] },
  'bluetemberg-skills-create-skill':               { universal: true, profiles: [] },
  'bluetemberg-rules-typescript':                  { universal: false, profiles: ['frontend', 'backend', 'fullstack'] },
  'bluetemberg-rules-devops':                      { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-rules-nextjs':                      { universal: false, profiles: ['frontend', 'fullstack'] },
  'bluetemberg-rules-context-engineering':         { universal: false, profiles: ['agentic'] },
  'bluetemberg-agents-frontend-specialist':        { universal: false, profiles: ['frontend', 'fullstack'] },
  'bluetemberg-agents-backend-specialist':         { universal: false, profiles: ['backend', 'fullstack'] },
  'bluetemberg-agents-test-specialist':            { universal: false, profiles: ['frontend', 'backend', 'fullstack'] },
  'bluetemberg-agents-docs-maintainer':            { universal: true,  profiles: [] },
  'bluetemberg-agents-code-reviewer':              { universal: false, profiles: ['frontend', 'backend', 'fullstack'] },
  'bluetemberg-agents-a11y-specialist':            { universal: false, profiles: ['frontend', 'fullstack'] },
  'bluetemberg-agents-security-specialist':        { universal: false, profiles: ['backend', 'fullstack', 'devops', 'pure-infra'] },
  'bluetemberg-agents-infrastructure-specialist':  { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-agents-devops-specialist':          { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-agents-ansible-specialist':         { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-agents-kubernetes-specialist':      { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-agents-sre-specialist':             { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-agents-agentic-specialist':         { universal: false, profiles: ['agentic'] },
  'bluetemberg-skills-patterns':                   { universal: false, profiles: ['frontend', 'backend', 'fullstack'] },
  'bluetemberg-skills-docs-upkeep':                { universal: true,  profiles: [] },
  'bluetemberg-skills-workspace-hygiene':          { universal: true,  profiles: [] },
  'bluetemberg-skills-react-patterns':             { universal: false, profiles: ['frontend', 'fullstack'] },
  'bluetemberg-skills-code-review':                { universal: false, profiles: ['frontend', 'backend', 'fullstack'] },
  'bluetemberg-skills-api-design':                 { universal: false, profiles: ['backend', 'fullstack'] },
  'bluetemberg-skills-security-audit':             { universal: false, profiles: ['backend', 'fullstack', 'devops', 'pure-infra'] },
  'bluetemberg-skills-ci-cd-best-practices':       { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-skills-migration-safety':           { universal: false, profiles: ['backend', 'fullstack'] },
  'bluetemberg-skills-stack-change-review':        { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-skills-infrastructure-drift-check': { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-skills-rollback-plan':              { universal: false, profiles: ['devops', 'pure-infra'] },
  'bluetemberg-skills-sub-agent-design':           { universal: false, profiles: ['agentic'] },
};

let updated = 0;

for (const dir of readdirSync(PACKAGES_DIR)) {
  const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
  if (!existsSync(pkgPath)) continue;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const meta = PROFILES[pkg.name];

  if (meta === undefined) {
    console.warn(`WARN: no profile entry for ${pkg.name}`);
    continue;
  }

  pkg.bluetemberg = meta;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  updated++;
}

console.log(`Updated ${updated} packages`);
