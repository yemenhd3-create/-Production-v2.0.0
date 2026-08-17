import type { DesignDocument, DesignElementDocument } from '@shared/designDocument';
import { DEFAULT_PRODUCT_SCALE } from '@shared/types';

export type DesignHistoryOperation =
  | { type: 'set-template'; from: DesignDocument['template']; to: DesignDocument['template'] }
  | { type: 'set-visual-theme'; from: DesignDocument['visualTheme']; to: DesignDocument['visualTheme'] }
  | { type: 'set-product-scale'; from: number; to: number }
  | { type: 'set-element'; id: DesignElementDocument['id']; from: DesignElementDocument; to: DesignElementDocument };

export interface DesignHistoryEntry {
  id: number;
  label: string;
  operations: DesignHistoryOperation[];
}

/** سجل دلالي صغير؛ المصدر الأصلي للصورة لا يدخل هذا السجل إطلاقاً. */
export interface DesignHistoryDocument {
  schemaVersion: 1;
  base: DesignDocument;
  entries: DesignHistoryEntry[];
}

export interface DesignHistoryUndoResult {
  history: DesignHistoryDocument;
  removed?: DesignHistoryEntry;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const equal = (first: unknown, second: unknown) => stableStringify(first) === stableStringify(second);

function elementIndex(document: DesignDocument) {
  return new Map(document.elements.map((element) => [element.id, element]));
}

/** يحسب الفرق الدلالي فقط بين وثيقتين؛ لا ينسخ Canvas أو URL أو الصورة. */
export function diffDesignDocuments(before: DesignDocument, after: DesignDocument): DesignHistoryOperation[] {
  assertSafeDocument(before);
  assertSafeDocument(after);
  const operations: DesignHistoryOperation[] = [];
  if (before.template !== after.template) operations.push({ type: 'set-template', from: before.template, to: after.template });
  if ((before.visualTheme || 'classic') !== (after.visualTheme || 'classic')) operations.push({ type: 'set-visual-theme', from: before.visualTheme || 'classic', to: after.visualTheme || 'classic' });
  if (productScale(before) !== productScale(after)) operations.push({ type: 'set-product-scale', from: productScale(before), to: productScale(after) });

  const previous = elementIndex(before);
  for (const nextElement of after.elements) {
    const previousElement = previous.get(nextElement.id);
    if (!previousElement) throw new Error(`عنصر سجل التصميم مفقود: ${nextElement.id}`);
    if (!equal(previousElement, nextElement)) operations.push({ type: 'set-element', id: nextElement.id, from: clone(previousElement), to: clone(nextElement) });
  }
  return operations;
}

/** يطبق عملية واحدة بشرط تطابق الحالة السابقة؛ يمنع سجلًا متعارضًا أو عملية مكررة. */
export function applyDesignHistoryOperation(document: DesignDocument, operation: DesignHistoryOperation): DesignDocument {
  const next = clone(document);
  if (operation.type === 'set-template') {
    if (next.template !== operation.from) throw new Error('تعارض في قالب سجل التصميم.');
    next.template = operation.to;
    return next;
  }
  if (operation.type === 'set-visual-theme') {
    if ((next.visualTheme || 'classic') !== (operation.from || 'classic')) throw new Error('تعارض في نمط سجل التصميم.');
    next.visualTheme = operation.to || 'classic';
    return next;
  }
  if (operation.type === 'set-product-scale') {
    if (productScale(next) !== operation.from) throw new Error('تعارض في حجم قطعة سجل التصميم.');
    next.productScale = operation.to;
    return next;
  }
  const index = next.elements.findIndex((element) => element.id === operation.id);
  if (index < 0) throw new Error(`عنصر سجل التصميم غير موجود: ${operation.id}`);
  if (!equal(next.elements[index], operation.from)) throw new Error(`تعارض في عنصر سجل التصميم: ${operation.id}`);
  next.elements[index] = clone(operation.to);
  return next;
}

export function createDesignHistory(base: DesignDocument): DesignHistoryDocument {
  assertSafeDocument(base);
  return { schemaVersion: 1, base: clone(base), entries: [] };
}

export function appendDesignHistory(history: DesignHistoryDocument, before: DesignDocument, after: DesignDocument, label: string): DesignHistoryDocument {
  assertHistory(history);
  const operations = diffDesignDocuments(before, after);
  if (operations.length === 0) return clone(history);
  const next = clone(history);
  next.entries.push({ id: next.entries.length + 1, label: safeLabel(label), operations });
  return next;
}

/** يعيد تشغيل السجل من الأساس. أي تعارض يفشل صراحة ولا يعيد ناتجاً مضللاً. */
export function replayDesignHistory(history: DesignHistoryDocument): DesignDocument {
  assertHistory(history);
  let document = clone(history.base);
  for (const entry of history.entries) for (const operation of entry.operations) document = applyDesignHistoryOperation(document, operation);
  return document;
}

export function undoDesignHistory(history: DesignHistoryDocument): DesignHistoryUndoResult {
  assertHistory(history);
  if (!history.entries.length) return { history: clone(history) };
  const next = clone(history);
  const removed = next.entries.pop();
  return { history: next, removed };
}

export function redoDesignHistory(history: DesignHistoryDocument, entry: DesignHistoryEntry): DesignHistoryDocument {
  assertHistory(history);
  const next = clone(history);
  const expected = next.entries.length + 1;
  next.entries.push({ ...clone(entry), id: expected });
  // التأكد فوراً أن إعادة التشغيل لا تنتج تعارضاً.
  replayDesignHistory(next);
  return next;
}

/** حذف عملية من الوسط آمن فقط إن بقي السجل قابلاً للإعادة؛ وإلا يعيد خطأ تعارض صريح. */
export function removeDesignHistoryEntry(history: DesignHistoryDocument, id: number): DesignHistoryDocument {
  assertHistory(history);
  const next = clone(history);
  next.entries = next.entries.filter((entry) => entry.id !== id).map((entry, index) => ({ ...entry, id: index + 1 }));
  replayDesignHistory(next);
  return next;
}

/** بصمة حتمية للوثيقة، لا تدّعي تطابق بكسلات بين محركات Canvas أو أجهزة مختلفة. */
export function designDocumentFingerprint(document: DesignDocument): string {
  assertSafeDocument(document);
  const source = stableStringify(document);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `dd1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function serializeDesignHistory(history: DesignHistoryDocument): string {
  assertHistory(history);
  const json = stableStringify(history);
  assertNoUnsafeUrls(json);
  return json;
}

export function parseDesignHistory(raw: string): DesignHistoryDocument {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('تعذر قراءة سجل التصميم المحلي.'); }
  if (!isHistory(parsed)) throw new Error('بنية سجل التصميم غير صالحة.');
  const history = clone(parsed);
  assertHistory(history);
  replayDesignHistory(history);
  return history;
}

function assertHistory(history: DesignHistoryDocument) {
  if (!isHistory(history)) throw new Error('بنية سجل التصميم غير صالحة.');
  assertSafeDocument(history.base);
  assertNoUnsafeUrls(JSON.stringify(history));
}

function assertSafeDocument(document: DesignDocument) {
  if (document?.schemaVersion !== 1 || !Array.isArray(document.elements) || document.privacy?.includedImage || document.privacy?.includedPersonalFields || document.privacy?.networkUsed) throw new Error('وثيقة التصميم لا تحقق خصوصية السجل المحلي.');
  assertNoUnsafeUrls(JSON.stringify(document));
}

function isHistory(value: unknown): value is DesignHistoryDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DesignHistoryDocument>;
  return candidate.schemaVersion === 1 && Boolean(candidate.base) && Array.isArray(candidate.entries);
}

function safeLabel(label: string) {
  const result = label.trim().replace(/[\r\n]+/g, ' ').slice(0, 80);
  return result || 'تعديل التصميم';
}

function productScale(document: DesignDocument) { return document.productScale ?? DEFAULT_PRODUCT_SCALE; }

function assertNoUnsafeUrls(value: string) {
  if (/data:image\/|blob:|https?:\/\//i.test(value)) throw new Error('لا يسمح سجل التصميم بالصور أو الروابط أو الطلبات الشبكية.');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}
