import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const output = 'AI_PROJECT_READING_PACKET.txt';
const starterOutput = 'AI_PROJECT_STARTER_PACKET.txt';
const sourceIndexOutput = 'AI_PROJECT_SOURCE_INDEX.txt';
const includedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.txt', '.css', '.html', '.yml', '.yaml']);
const excludedNames = new Set([output, starterOutput, sourceIndexOutput, 'pnpm-lock.yaml']);
const excludedSegments = new Set(['node_modules', 'dist', '.git', '.manus-logs']);
const secretPath = /(^|\/)(\.env(?:\..*)?|.*\.pem|.*\.key|.*secret.*)$/i;

function extension(file) {
  const dot = file.lastIndexOf('.');
  return dot === -1 ? '' : file.slice(dot);
}

function isIncluded(file) {
  const normalized = file.replaceAll('\\', '/');
  if (excludedNames.has(normalized.split('/').at(-1))) return false;
  if (normalized.split('/').some(segment => excludedSegments.has(segment))) return false;
  if (secretPath.test(normalized)) return false;
  return includedExtensions.has(extension(normalized));
}

function redact(text) {
  return text
    .replace(/((?:DEVELOPER_SECRET|JWT_SECRET|DATABASE_URL|[A-Z0-9_]*(?:API_KEY|TOKEN|PASSWORD|SECRET))\s*[:=]\s*["']?)([^\s"',;]+)/g, '$1[REDACTED]')
    .replace(/(Authorization\s*:\s*["']?Bearer\s+)([^\s"',;]+)/gi, '$1[REDACTED]')
    .replace(/(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, '[REDACTED_GITHUB_TOKEN]');
}

const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .map(file => file.trim())
  .filter(Boolean)
  .filter(isIncluded)
  .sort((first, second) => first.localeCompare(second));

const repositoryRawRoot = 'https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main';
const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const starterFiles = [
  'AI_CONTEXT.md',
  'todo.md',
  'README.md',
  'package.json',
  'tsconfig.json',
  'drizzle/schema.ts',
  'shared/types.ts',
  'client/src/App.tsx',
  'server/routers.ts',
].filter(file => listed.includes(file));

const header = [
  '# AI PROJECT READING PACKET — READ ONLY',
  '',
  'الغرض: حزمة UTF-8 نصية لمن لا يستطيع فتح ZIP أو تصفح GitHub مباشرة.',
  'المستودع المرجعي: https://github.com/yemenhd3-create/-Production-v2.0.0/tree/main',
  'الفرع المرجعي: main',
  `SHA المرجعي عند إنشاء الحزمة: ${baseCommit}`,
  'قاعدة الأمان: هذا الملف لا يمنح أي صلاحية كتابة. لا يحتوي على node_modules أو ملفات ثنائية أو ملفات بيئة، وتطبق عليه تنقية احترازية للقيم السرية.',
  'اقرأ AI_CONTEXT.md وtodo.md وREADME.md أولاً. عند الحاجة إلى ملف غير موجود هنا، اطلب رابط GitHub Raw لذلك الملف بدلاً من التخمين.',
  '',
  `عدد الملفات النصية المضمّنة: ${listed.length}`,
  '',
  '## فهرس الملفات',
  ...listed.map(file => `- ${file}`),
  '',
  '## محتوى الملفات',
  '',
].join('\n');

function renderFiles(files) {
  return files.map(file => {
  const path = join(root, file);
  const content = redact(readFileSync(path, 'utf8'));
  return `\n===== FILE: ${relative(root, path).replaceAll('\\', '/')} =====\n${content}\n===== END FILE =====\n`;
  }).join('');
}

writeFileSync(join(root, output), `${header}${renderFiles(listed)}`, 'utf8');

const starterHeader = [
  '# AI PROJECT STARTER PACKET — READ ONLY',
  '',
  'هذه نسخة صغيرة للبدء عندما يكون الملف الكامل أكبر من حد القراءة لدى المساعد.',
  'اقرأها أولاً، ثم استخدم AI_PROJECT_SOURCE_INDEX.txt للوصول إلى الملفات الدقيقة اللازمة للمهمة.',
  `المستودع: ${repositoryRawRoot.replace('raw.githubusercontent.com', 'github.com').replace('/main', '/tree/main')}`,
  `SHA المرجعي عند إنشاء الحزمة: ${baseCommit}`,
  '',
  `عدد الملفات الأساسية: ${starterFiles.length}`,
  '',
  '## محتوى البدء',
  '',
].join('\n');
writeFileSync(join(root, starterOutput), `${starterHeader}${renderFiles(starterFiles)}`, 'utf8');

const sourceIndex = [
  '# AI PROJECT SOURCE INDEX — READ ONLY',
  '',
  'فهرس صغير لملفات المشروع النصية مع روابط GitHub Raw. استخدمه عندما لا تستطيع قراءة الحزمة الكاملة دفعة واحدة.',
  `SHA المرجعي عند إنشاء الحزمة: ${baseCommit}`,
  'ابدأ بـ AI_CONTEXT.md وtodo.md وREADME.md ثم افتح الملفات القريبة من المهمة فقط.',
  '',
  ...listed.map(file => `- ${file}\n  ${repositoryRawRoot}/${file.split('/').map(encodeURIComponent).join('/')}`),
  '',
].join('\n');
writeFileSync(join(root, sourceIndexOutput), sourceIndex, 'utf8');

console.log(`Created ${output} with ${listed.length} text files.`);
console.log(`Created ${starterOutput} with ${starterFiles.length} core files.`);
console.log(`Created ${sourceIndexOutput} with ${listed.length} raw links.`);
