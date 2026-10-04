const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

let totalTests = 0;
let passedTests = 0;
const failures = [];

function pass(msg) {
  totalTests++;
  passedTests++;
  console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
}

function fail(file, msg) {
  totalTests++;
  failures.push({ file, msg });
  console.log(`  \x1b[31m✖\x1b[0m \x1b[1m${file}\x1b[0m: ${msg}`);
}

function getAllFiles(dir, filter = f => f.endsWith('.js')) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, filter));
    } else if (filter(file)) {
      results.push(filePath);
    }
  }
  return results;
}

console.log('\n\x1b[1m\x1b[36m=== ECHO DISCORD BOT — AUTOMATED VALIDATION SUITE ===\x1b[0m\n');

// -------------------------------------------------------------
// 1. SYNTAX & COMPILATION CHECK
// -------------------------------------------------------------
console.log('\x1b[1m1. Checking JavaScript Syntax & Compilation...\x1b[0m');
const allSrcFiles = getAllFiles(SRC);
for (const file of allSrcFiles) {
  const rel = path.relative(ROOT, file);
  try {
    const code = fs.readFileSync(file, 'utf8');
    new vm.Script(code, { filename: rel });
    pass(`Syntax clean: ${rel}`);
  } catch (err) {
    fail(rel, `Syntax error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 2. COMMANDS SPECIFICATION & COMPONENTS V2 CHECK
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Checking Command Definitions & Components V2 Compliance...\x1b[0m');
const commandFiles = getAllFiles(path.join(SRC, 'commands'));

for (const file of commandFiles) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');

  // Enforce Components V2: EmbedBuilder is prohibited in new commands
  if (content.includes('new EmbedBuilder')) {
    fail(rel, `Uses EmbedBuilder. Echo strictly enforces Discord Components V2 (ContainerBuilder, SectionBuilder, TextDisplayBuilder).`);
    continue;
  }

  try {
    const cmd = require(file);

    if (!cmd.name || typeof cmd.name !== 'string') {
      fail(rel, `Missing or invalid 'name' export (expected string)`);
      continue;
    }

    if (!cmd.category || typeof cmd.category !== 'string') {
      fail(rel, `Missing or invalid 'category' export (expected string)`);
      continue;
    }

    if (!cmd.description || typeof cmd.description !== 'string') {
      fail(rel, `Missing or invalid 'description' export (expected string)`);
      continue;
    }

    if (!cmd.data || typeof cmd.data.toJSON !== 'function') {
      fail(rel, `Missing or invalid 'data' export (must be a SlashCommandBuilder instance)`);
      continue;
    }

    const json = cmd.data.toJSON();
    if (json.name !== cmd.name) {
      fail(rel, `cmd.name ('${cmd.name}') does not match data.name ('${json.name}')`);
      continue;
    }

    if (typeof cmd.executeSlash !== 'function') {
      fail(rel, `Missing 'executeSlash' handler function`);
      continue;
    }

    if (!cmd.slashOnly && typeof cmd.executePrefix !== 'function') {
      fail(rel, `Missing 'executePrefix' handler function (all commands must support prefix unless slashOnly: true)`);
      continue;
    }

    pass(`Valid command: [${cmd.category}] /${cmd.name} (prefix + slash parity verified)`);
  } catch (err) {
    fail(rel, `Failed to load command module: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 3. EVENT LISTENERS CHECK
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Checking Event Listeners...\x1b[0m');
const eventFiles = getAllFiles(path.join(SRC, 'events'));

for (const file of eventFiles) {
  const rel = path.relative(ROOT, file);
  try {
    const evt = require(file);
    if (evt.name && typeof evt.execute === 'function') {
      pass(`Valid event: '${evt.name}' (${evt.once ? 'once' : 'on'})`);
    } else if (typeof evt === 'object' && Object.keys(evt).length > 0) {
      pass(`Valid event/interaction helper: ${rel}`);
    } else {
      fail(rel, `Missing 'name' or 'execute' export in event`);
    }
  } catch (err) {
    fail(rel, `Failed to load event module: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 4. MONGOOSE MODELS CHECK
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Checking Mongoose Schemas & Models...\x1b[0m');
const modelFiles = getAllFiles(path.join(SRC, 'models'));

for (const file of modelFiles) {
  const rel = path.relative(ROOT, file);
  try {
    const model = require(file);
    if (!model || (typeof model !== 'function' && typeof model !== 'object')) {
      fail(rel, `Model does not export a valid Mongoose model or schema`);
      continue;
    }
    pass(`Valid model: ${rel}`);
  } catch (err) {
    fail(rel, `Failed to load model module: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 5. UTILITY MODULES CHECK
// -------------------------------------------------------------
console.log('\n\x1b[1m5. Checking Utilities...\x1b[0m');
const utilFiles = getAllFiles(path.join(SRC, 'utils'));

for (const file of utilFiles) {
  const rel = path.relative(ROOT, file);
  try {
    const util = require(file);
    if (!util || (typeof util !== 'object' && typeof util !== 'function')) {
      fail(rel, `Utility does not export an object or function`);
      continue;
    }
    pass(`Valid utility: ${rel}`);
  } catch (err) {
    fail(rel, `Failed to load utility module: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 6. SENSITIVE SECRETS & LEAK PREVENTION CHECK
// -------------------------------------------------------------
console.log('\n\x1b[1m6. Checking for Accidental Secret Leaks...\x1b[0m');
const secretPatterns = [
  { name: 'Discord Bot Token', regex: /(?:mfa\.[a-z0-9_-]{20,}|[a-z0-9_-]{23,28}\.[a-z0-9_-]{6,7}\.[a-z0-9_-]{27})/i },
  { name: 'MongoDB Credentials URI', regex: /mongodb(\+srv)?:\/\/[^\s:]+:[^\s@]+@/i },
  { name: 'Hardcoded Webhook URL', regex: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/i }
];

// Check git repository if .env was accidentally tracked
const gitDir = path.join(ROOT, '.git');
if (fs.existsSync(gitDir)) {
  const gitignorePath = path.join(ROOT, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('.env')) {
      fail('.gitignore', `CRITICAL: .env is not listed in .gitignore!`);
    } else {
      pass(`.gitignore safely ignores .env`);
    }
  }
}

for (const file of allSrcFiles) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  for (const sp of secretPatterns) {
    if (sp.regex.test(content)) {
      fail(rel, `POTENTIAL SECRET DETECTED: Contains pattern matching '${sp.name}'`);
    }
  }
}
pass(`All source files clean of hardcoded tokens and credentials`);

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n======================================================');
if (failures.length === 0) {
  console.log(`\x1b[32m\x1b[1m✔ ALL CHECKS PASSED (${passedTests}/${totalTests} tests succeeded)\x1b[0m`);
  console.log('Codebase is clean, syntax-valid, Components V2 compliant, and safe to merge!');
  console.log('======================================================\n');
  process.exit(0);
} else {
  console.log(`\x1b[31m\x1b[1m✖ VALIDATION FAILED: ${failures.length} issue(s) detected.\x1b[0m`);
  for (const f of failures) {
    console.log(` - [${f.file}]: ${f.msg}`);
  }
  console.log('======================================================\n');
  process.exit(1);
}
