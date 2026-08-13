# توافق مزودي الصور مع مولد الإعلانات

## المراجعة الأولية — أغسطس 2026

| المزود | ما ظهر في المراجعة | النتيجة الحالية |
|---|---|---|
| Hugging Face | رابط إعداد الرمز أعاد إلى شاشة تسجيل الدخول، لذلك لم تُقرأ صلاحيات الرمز أو قيمته. | لا يضاف إلى خانة مزود Try-On الحالية قبل اختيار نموذج محدد وواجهة Inference المناسبة له. |
| Perfect Corp YouCam API | البوابة تعرض **AI Photo Background Removal** و**AI Clothes Virtual Try-On** ووثائق مستقلة لكل خدمة. | مرشح مناسب لمسار إزالة الخلفية، لكن يحتاج موصل خادمي منفصل لأن لوحة المشروع الحالية مبنية على نمط FASHN `/run` و`/status`. |

لا تدخل أي قيمة مفتاح في ملفات المشروع أو GitHub. تحفظ المفاتيح فقط من لوحة المطور في الخادم بعد اعتماد صيغة الاتصال الصحيحة.

## النتيجة التقنية

| الخدمة | ملاءمتها للمشروع | هل تضاف مباشرة باسم `background-remove`؟ | ما يلزم |
|---|---|---|---|
| Perfect Corp AI Photo Background Removal | مناسبة مباشرة لهدف تفريغ صورة الملابس إلى PNG شفاف. | لا؛ تحتاج موصل Perfect Corp في الخادم. | رفع الملف أولاً إلى File API، ثم تشغيل `POST /s2s/v2.0/task/sod` واستطلاع `GET /s2s/v2.0/task/sod/{task_id}` حتى النجاح. |
| Perfect Corp AI Clothes Virtual Try-On | مناسبة كتجربة مزود Try-On مستقل بعد قراءة وثيقتها المحددة. | لا؛ ليست بروتوكول FASHN `/run` و`/status`. | موصل منفصل وعقد طلب/استجابة خاص بالخدمة. |
| Hugging Face Inference | مفيد لتجربة نماذج محددة أو تجزئة الملابس، لكنه لا يقدم من النماذج الموثقة هنا ملف PNG مفرغاً جاهزاً بالضرورة. | لا. | رمز fine-grained لديه صلاحية **Inference Providers**، ونموذج محدد، وموصل يحول قناع التجزئة إلى PNG شفاف إذا اختير هذا المسار. |

توضح وثائق Perfect Corp أن إزالة الخلفية تدعم JPG وPNG حتى 10MB وبحد أطول ضلع 4096، وأن المسار ينتج صورة foreground بعد رفع الملف وتشغيل المهمة واستطلاعها. [1] وتوضح وثائق Hugging Face أن واجهة التجزئة تستقبل صورة وترجع أقنعة segments؛ وهي ليست خدمة إزالة خلفية PNG جاهزة من دون معالجة لاحقة للقناع. كما تتطلب صلاحية Inference Providers في الرمز. [2] [3]

## توافق لوحة المطور الحالية

تشفّر لوحة المطور المفتاح في الخادم ولا تعيده للواجهة، وهي المكان الصحيح لحفظ أي مفتاح. لكن موصل Try-On الحالي يستدعي بروتوكول FASHN ذي `/run` و`/status`؛ لذلك إدخال رابط Perfect Corp أو Hugging Face في الحقول الحالية **لن يجعل الخدمة تعمل تلقائياً** حتى يُضاف موصل خادمي مخصص لهما.

الخيار العملي الأول هو Perfect Corp لإزالة الخلفية فقط، لأنه يعيد foreground image بعد خطوات رفع الملف وتشغيل مهمة واستطلاعها. أما Hugging Face فيبقى اختياراً ثانوياً للتجربة بعد أن يتأكد المستخدم أن رمزَه يحمل Inference Providers ويختار نموذجاً محدداً. لا تتطلب أي من الخطوتين كشف المفتاح في الدردشة أو GitHub.

## نموذج Hugging Face: yisol/IDM-VTON

نموذج `yisol/IDM-VTON` هو تنفيذ Try-On رسمي يعتمد Diffusers وCUDA في المثال المنشور، ويحمل ترخيص **CC BY-NC-SA 4.0**. الأهم للمشروع الحالي أن صفحة النموذج تصرح بأنه **غير منشور لدى أي Inference Provider**؛ لذلك رابط `https://api-inference.huggingface.co/models/yisol/IDM-VTON` لا يشكل خدمة Try-On جاهزة وموثوقة لموصل المشروع. يلزم تشغيل النموذج على Inference Endpoint/GPU أو استدعاء Space مناسب بواجهة Gradio بعد التحقق من استقرارها؛ وكلا الخيارين يحتاج موصلاً مختلفاً عن FASHN. [4]

## العقد المعتمد لموصل Perfect Corp

سيتصل الموصل بالخادم `https://yce-api-01.makeupar.com` عبر الرأس `Authorization: Bearer <API_KEY>`. يطلب أولاً رابط رفع موقّعاً و`file_id` من `POST /s2s/v2.0/file`، ثم يرفع البايتات إلى الرابط الموقّع بالطريقة والرؤوس التي ترجعها الخدمة. بعد نجاح الرفع، يشغل `POST /s2s/v2.0/task/sod` بجسم `{ "src_file_id": "..." }`، ثم يستطلع `GET /s2s/v2.0/task/sod/{task_id}` بصورة دورية حتى `success` أو `error`. النتيجة الناجحة توفر رابط الصورة المفرغة المؤقت، ويجب جلبه وتحويله إلى Data URL قبل إرساله للواجهة. [5] [6] [7]

سيقتصر الموصل على JPG وPNG دون 10MB وأطول ضلع لا يتجاوز 4096. سيعامل الأخطاء أو انقضاء مهلة الاستطلاع كفشل قابل للرجوع؛ وعندها يبقى قالب الإعلان عاملاً بالصورة الأصلية بدلاً من تعطيل المستخدم. [5]

## الروابط التي تمت مراجعتها

- https://huggingface.co/settings/tokens/6a7cf853ada481ff6f7c7ea4
- https://yce.perfectcorp.com/api-console/en/api-keys/
- https://docs.perfectcorp.com/reference/ai_background_removal

## المراجع

[1]: https://docs.perfectcorp.com/reference/ai_background_removal "Perfect Corp — AI Photo Background Removal"
[2]: https://huggingface.co/docs/inference-providers/en/tasks/image-segmentation "Hugging Face — Image Segmentation"
[3]: https://huggingface.co/docs/inference-providers/en/providers/hf-inference "Hugging Face — HF Inference"
[4]: https://huggingface.co/yisol/IDM-VTON "yisol/IDM-VTON Model Card"
[5]: https://docs.perfectcorp.com/reference/ai_background_removal.md "Perfect Corp — AI Photo Background Removal"
[6]: https://docs.perfectcorp.com/reference/ai_background_removal/v1.0/paths/~1s2s~1v2.0~1task~1sod/post.md "Perfect Corp — Run SOD Task"
[7]: https://docs.perfectcorp.com/reference/ai_background_removal/v1.0/paths/~1s2s~1v2.0~1task~1sod~1%7Btask_id%7D/get.md "Perfect Corp — Check SOD Task"
