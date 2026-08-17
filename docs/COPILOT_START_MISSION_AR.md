# مهمة البدء لـGitHub Copilot — قراءة قبل التعديل

## الرسالة الجاهزة للإرسال

> أنت الآن مشارك كـ**مراجع كود خارجي** في مشروع «استوديو إعلانات الملابس». لا تملك صلاحية كتابة أو دمج، ولا أريد خطة عامة أو إعادة تصميم أو كود في هذه الرسالة الأولى.
>
> اقرأ من فرع `main` فقط، وسجل SHA الذي بدأت منه:
>
> - المستودع: https://github.com/yemenhd3-create/-Production-v2.0.0
> - السياق: https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/AI_CONTEXT.md
> - تقرير الاكتشاف: https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/docs/SECURITY_LOAD_DISCOVERY_REPORT.md
> - بروتوكول التعاون: https://raw.githubusercontent.com/yemenhd3-create/-Production-v2.0.0/main/docs/AI_COPILOT_COLLAB_PROTOCOL_AR.md
>
> **مهمتك الأولى قراءة فقط:** أثبت أو انقض فجوة ملفات Drizzle migrations المذكورة في التقرير. افحص schema وconfig ومجلد migrations والاستعلامات التي تتأثر، ثم سلّم في رد واحد:
>
> 1. SHA الأساس والملفات التي قرأتها فعلياً.
> 2. هل يمكن إعادة بناء قاعدة فارغة من Git اليوم؟ أعط دليلاً من الملفات، لا تخميناً.
> 3. أصغر خطة آمنة من ثلاث خطوات لإنشاء baseline قابل للإعادة واختبار restore محلي، من دون لمس DB حية أو إنشاء قاعدة أو نقل بيانات.
> 4. الملفات التي **لن** تغيّرها ولماذا.
> 5. أخطر افتراض غير مثبت يجب اختباره قبل أي Patch.
>
> ممنوع في هذه المرحلة: كتابة كود، إنشاء فرع، تغيير schema، تنفيذ SQL، اقتراح PostgreSQL/TiDB/Render، استخدام أسرار، أو ضغط أي خدمة عامة. إن لم تستطع الوصول إلى ملف، اكتب `NOT VERIFIED` بوضوح.

## شرط الانتقال

لا ينتقل Copilot إلى Patch أو تنفيذ قبل مراجعة هذا الرد واعتماد نطاقه. إذا كرر ميزة قائمة، أو لم يذكر SHA، أو أرسل خطة شاملة لا تعالج فجوة الهجرات، يعاد إلى القراءة فقط.
