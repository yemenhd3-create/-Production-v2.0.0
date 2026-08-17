# دليل وصول المتنافسين إلى المشروع

هذا الدليل هو نقطة الدخول الموحدة لأي نموذج يدخل تحدي أمن وتحمل المشروع. استخدم المستودع العام باعتباره المصدر الأساسي، ولا تطلب ZIP جديداً ما دام فرع `main` متاحاً.

## الوصول السريع

| الغرض | الرابط أو الأمر |
|---|---|
| المستودع الحي (آخر نسخة) | [GitHub — main](https://github.com/yemenhd3-create/-Production-v2.0.0/tree/main) |
| تنزيل/قراءة الكود | `git clone --depth 1 https://github.com/yemenhd3-create/-Production-v2.0.0.git` |
| سياق المشروع | [AI_CONTEXT.md](https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/AI_CONTEXT.md) |
| سجل التغييرات | [CHANGELOG.md](https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/CHANGELOG.md) |
| تقرير الأمن والتحميل | [SECURITY_LOAD_DISCOVERY_REPORT.md](https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/docs/SECURITY_LOAD_DISCOVERY_REPORT.md) |
| الحزم وأوامر الفحص | [package.json](https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/package.json) |
| مخطط البيانات | [drizzle/schema.ts](https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/drizzle/schema.ts) |
| واجهة API | [server/routers.ts](https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/server/routers.ts) |
| بوابة Express | [server/_core/index.ts](https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/server/_core/index.ts) |
| مسار الصورة الثقيل | [server/tryOn.ts](https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/server/tryOn.ts) |
| معاينة الاستخدام فقط | [رابط Render الحي](https://production-v2-0-0.onrender.com) |

## ترتيب القراءة المطلوب

ابدأ بـ`AI_CONTEXT.md` ثم تقرير الأمن والتحميل، وبعده `package.json` وschema وrouters. لا تبدأ بافتراض أن التقرير يصف كل مشكلة؛ هو سياق ومؤشرات فقط. على المتنافس اكتشاف نقطة ضعف حقيقية وإثباتها بنفسه داخل نسخة محلية أو بيئة اختبار.

## أوامر الفحص المسموح بها

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
pnpm perf:check
pnpm mobile:check
```

إذا تعذر تشغيل أمر بسبب بيئة المتنافس، يذكره صراحةً كـ`NOT VERIFIED` ولا يدّعي نجاحه.

## حدود الوصول والسلامة

لا يملك المتنافس تفويضاً لاستخدام أو محاولة كشف أي سر، أو متغير بيئة، أو قاعدة بيانات حية، أو مفتاح مزود، أو رمز دخول فعلي. لا يرسل طلب ضغط أو فحص عدائي إلى رابط Render أو إلى أي خدمة عامة أو مزود AI. رابط Render مخصص للملاحظة البصرية فقط؛ لا يُعد بيئة اختبار أمنية ولا دليل نجاح وظيفي.

لا تُرفع `.env` أو قواعد بيانات أو exports مستخدمين أو صور خاصة أو ملفات `node_modules` أو نتائج اختبار مؤقتة ضمن التسليم. جميع التجارب العدائية تستخدم بيانات تركيبية محلية فقط.

## قاعدة التحديث

يقرأ المتنافس فرع `main` في بداية كل جولة ويسجل SHA الذي بنى عليه. أي تسليم لا يذكر الـSHA، أو يتضمن Patch غير قابل للتطبيق على ذلك الـSHA، يعامل كتسليم غير قابل للدمج.
