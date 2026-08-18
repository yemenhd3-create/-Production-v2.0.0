import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

describe('حزمة وصول المساعدين الخارجيين', () => {
  it('تحتوي قالب المهمة على عقد التسليم والخصوصية ومسارات العمل المحلية', () => {
    const template = read('EXTERNAL_ASSISTANT_TASK_TEMPLATE_AR.txt');

    expect(template).toContain('لا تعدّل هذا الملف ولا أي ملف من الملفات الأربعة');
    expect(template).toContain('سيعطيك المطور الرئيسي في كل جولة نص مهمة مستقل جاهزاً للنسخ');
    expect(template).toContain('المهمة لا تُكتب داخل هذا الملف');
    expect(template).toContain('PATCH.diff');
    expect(template).toContain('DELIVERY_MANIFEST.json');
    expect(template).toContain('الوضع المحلي/دون إنترنت');
    expect(template).toContain('وضع الإنترنت الاختياري');
    expect(template).toContain('لا تضع أي مفتاح API');
    expect(template).toContain('AI_PROJECT_READING_PACKET.txt');
    expect(template).toContain('AI_PROJECT_STARTER_PACKET.txt');
    expect(template).toContain('AI_PROJECT_SOURCE_INDEX.txt');
  });

  it('يجمع مسار القراءة النصي ملفات المشروع ويستبعد صيغ الأسرار الظاهرة', () => {
    const packet = read('AI_PROJECT_READING_PACKET.txt');

    expect(packet).toContain('# AI PROJECT READING PACKET — READ ONLY');
    expect(packet).toContain('===== FILE: AI_CONTEXT.md =====');
    expect(packet).toContain('===== FILE: EXTERNAL_ASSISTANT_TASK_TEMPLATE_AR.txt =====');
    expect(packet).not.toMatch(/(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/);
    expect(packet).not.toMatch(/(?:DEVELOPER_SECRET|JWT_SECRET|DATABASE_URL)\s*[:=]\s*["']?(?!\[REDACTED\])[A-Za-z0-9_./:@-]{16,}/);
  });
});
