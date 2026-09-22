import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const requiredFiles = [
    'AGENTIC_DEVELOPMENT.md',
    '.agentic/work-item.template.md',
    '.agentic/context-map.template.md',
    '.agentic/session-checkpoint.template.md',
    '.agentic/package-ownership.md',
    '.agentic/agent-contracts.md',
    '.github/copilot-instructions.md',
    'ARCHITECTURE.md',
    'MODERNIZATION_PLAN.md',
    '.agents/skills/nango-agentic-workflow/SKILL.md',
    '.claude/agents/nango-mapper.md',
    '.claude/agents/nango-builder.md',
    '.claude/agents/nango-verifier.md',
    '.claude/agents/nango-reviewer.md'
];
const requiredScripts = ['lint', 'format:check', 'ts-build', 'test:unit', 'test:integration'];

const missingFiles = [];
for (const relativePath of requiredFiles) {
    try {
        await readFile(resolve(root, relativePath), 'utf8');
    } catch {
        missingFiles.push(relativePath);
    }
}

let packageJson;
try {
    packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
} catch (err) {
    console.error(`Unable to read package.json: ${err.message}`);
    process.exit(1);
}

const missingScripts = requiredScripts.filter((name) => !packageJson.scripts?.[name]);

if (missingFiles.length > 0 || missingScripts.length > 0) {
    if (missingFiles.length > 0) {
        console.error(`Missing agentic contract files:\n- ${missingFiles.join('\n- ')}`);
    }
    if (missingScripts.length > 0) {
        console.error(`Missing canonical verification scripts:\n- ${missingScripts.join('\n- ')}`);
    }
    process.exit(1);
}

console.log('Agentic development contract is present.');
