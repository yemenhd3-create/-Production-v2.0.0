# مراجعة كتالوج Open Image Models

**التاريخ:** 20 أغسطس 2026  
**الغرض:** تحويل الاقتراحات المرفقة إلى كتالوج تعليمي صادق؛ لا يمثل هذا الملف خطة تنزيل أو تشغيل نماذج في التطبيق.

## قرار التطبيق

أضيف كتالوج **Open Image Models** داخل لوحة المطور فقط. لا ينزّل أوزاناً، ولا يثبت ComfyUI أو Diffusers، ولا يشغّل نموذجاً، ولا ينشئ طابور صور أو Workflows JSON وهمية. السبب أن هاتف المالك واستضافة المشروع لا يملكان GPU، بينما الاستدعاءات المدفوعة أو المجانية التجريبية ليست بديلاً ثابتاً للتشغيل المحلي.

| الفئة | ما طبق | ما لم يطبق |
|---|---|---|
| النماذج المحلية | U2NetP يبقى المسار المحلي المثبت لإزالة الخلفية. | لا تشغيل لنماذج توليد كبيرة على الهاتف. |
| نماذج VTON | أضيفت كمراجع تعليمية مع مصدر وحالة ترخيص وتشغيل. | لا ربط آلي بـSpaces عامة أو Inference API غير متاح. |
| أدوات توليد وتحسين الصور | أضيفت في الكتالوج فقط مع حالة GPU أو مراجعة ترخيص. | لا API مدفوع ولا وعد بحصة مجانية ولا تحميل تلقائي. |

## حقائق تم التحقق منها

| النموذج | التحقق من المصدر الرسمي | الأثر في الكتالوج |
|---|---|---|
| CatVTON | صفحة النموذج تحدد رخصة `CC BY-NC-SA 4.0` وتذكر أقل من 8 GiB VRAM عند 1024×768 مع Workflow ComfyUI. [1] | مراجعة ترخيص؛ غير تجاري ويتطلب GPU منفصلاً. |
| IDM-VTON | صفحة النموذج تحدد الرخصة نفسها، وتقول إنه غير منشور لدى أي Inference Provider. [2] | مراجعة ترخيص؛ Space تجريبي لا API خادمي جاهز. |
| FLUX.1 Schnell | صفحة النموذج تحدد Apache-2.0، و12B BF16، وتذكر تشغيل Diffusers وComfyUI. [3] | يتطلب GPU؛ الاستخدام مسموح وفق المصدر، لكن لا يعمل على الهاتف. |
| FLUX.1 Dev | صفحة النموذج تحدد رخصة غير تجارية و12B BF16. [4] | مراجعة ترخيص؛ لا يوصف كمسموح تجارياً. |
| SAM وIP-Adapter | المصدران الرسميان يعرضان Apache-2.0. [5] [6] | مصادر تمت مراجعتها، لكن العتاد اللازم ما زال خارج الهاتف. |
| Real-ESRGAN | المستودع الرسمي يعرض BSD-3-Clause. [7] | خيار تحسين تعليمي مع GPU، وليس وسيلة اختراع تفاصيل مؤكدة. |

## رفض ادعاءات من المقترحات المرفقة

لم يعتمد الكتالوج ادعاءات أن Hugging Face Inference API يشغّل IDM-VTON أو CatVTON مجاناً بكود واحد؛ الصفحات الرسمية الحالية تبين أن كليهما غير منشور لدى Inference Provider. كما لم يعتمد ادعاء أن تشغيل نموذج مفتوح المصدر يعني تشغيله بلا حدود أو بلا عتاد: الأوزان قد تكون مفتوحة، لكن تشغيلها يحتاج GPU وبنية مستقلة. كذلك لا يحوّل رصيداً تجريبياً من fal.ai أو Replicate إلى «مجاني دائم».

## المراجع

[1]: https://huggingface.co/zhengchong/CatVTON "CatVTON model card"
[2]: https://huggingface.co/yisol/IDM-VTON "IDM-VTON model card"
[3]: https://huggingface.co/black-forest-labs/FLUX.1-schnell "FLUX.1 Schnell model card"
[4]: https://huggingface.co/black-forest-labs/FLUX.1-dev "FLUX.1 Dev model card"
[5]: https://github.com/facebookresearch/segment-anything "Segment Anything repository"
[6]: https://github.com/tencent-ailab/IP-Adapter "IP-Adapter repository"
[7]: https://github.com/xinntao/Real-ESRGAN "Real-ESRGAN repository"
