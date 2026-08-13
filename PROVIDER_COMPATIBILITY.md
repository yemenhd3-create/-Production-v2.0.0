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

## CatVTON كخيار دراسة مستقبلي

مشروع `Zheng-Chong/CatVTON` هو Try-On مفتوح المصدر أخف من IDM-VTON وفق وصف المستودع؛ يعلن أن الاستدلال بدقة 1024×768 يحتاج أقل من 8GB من VRAM. مع ذلك فهو يتطلب بيئة Python وGPU وخط معالجة مسبق للصور، وليس واجهة API سحابية ثابتة جاهزة للربط من تطبيق الهاتف. كما أن الكود والنماذج التجريبية تخضع لترخيص **CC BY-NC-SA 4.0**؛ لذا يصلح للتعلم والاستخدام الشخصي غير التجاري، لا كبديل مجاني جاهز للنشر أو للاعتماد على Spaces عامة عابرة. [8]

## rembg وGradio في الاقتراح المرفق

`rembg` مكتبة إزالة خلفية مفتوحة المصدر بترخيص MIT وتدعم التشغيل على CPU أو GPU عبر ONNX Runtime. يمكن أن تشكل مزوداً احتياطياً سريعاً عند امتلاك خادم Python دائم، لكنها لا تعمل داخل متصفح الهاتف نفسه ولا داخل بيئة الاستضافة الحالية من دون خدمة منفصلة وبنية تشغيل مستمرة. لذلك لا ينبغي استبدال Perfect Corp بها الآن؛ تصلح كتجربة تعليمية محلية أو كخادم شخصي لاحق. [9]

الكود `gr.Interface(...).launch(share=True)` لا ينشئ API دائماً مستقلاً؛ توثق Gradio أنه ينشئ نفقاً عاماً إلى التطبيق الذي يعمل محلياً. ينقطع الرابط عندما يتوقف التنفيذ أو يغلق جهاز التشغيل، ولذلك لا يصلح كمزود يعتمد عليه التطبيق أو هواتفك الأخرى. يصلح فقط لتجربة سريعة للصور أثناء التعلم. [10]

## إزالة الخلفية المحلية داخل متصفح الهاتف

يمكن تقنياً تشغيل نموذج ONNX داخل متصفح الهاتف عبر `onnxruntime-web` باستخدام WebAssembly كخيار عام وWebGPU على الأجهزة المدعومة. بعد تنزيل النموذج وتخزينه في ذاكرة المتصفح، يمكن أن يعمل الاستدلال بلا اتصال وأن تبقى الصورة على الجهاز. لكن هذه ليست إزالة «من دون نموذج»: يحتاج المستخدم إلى تنزيل النموذج مرة واحدة، ويجب أن يكون النموذج صغيراً بما يكفي لذاكرة وأداء الهاتف. [11]

عرض IMG.LY يثبت إمكان إزالة الخلفية داخل المتصفح، لكنه يذكر أن أول تشغيل يتطلب تنزيل نموذج يقارب 40MB في النسخة المضغوطة، وأن السرعة تختلف بشدة وفق WebGPU والجهاز. كما أن مكتبته المفتوحة `@imgly/background-removal` مرخصة AGPL-3.0، لذلك لا تُضاف تلقائياً للمشروع حتى يوافق المستخدم على تبعات الترخيص أو يختار بديلاً بترخيص متوافق. [12] [13]

### اختيار تجربة محلية: U2NetP ONNX

النموذج المختار للتجربة هو `u2netp.onnx` من حزمة Heliosoph/U2Net ONNX. بطاقة النموذج تعلن ترخيص Apache-2.0 للكود والأوزان، وحجم يقارب 4.7MB، ومدخلات RGB بقياس `320×320` ومخرجات قناع saliency `d0` بقياس `320×320` يمكن استخدامه كقناة alpha. هذا يناسب تجربة هاتف محلية اختيارية أكثر من نموذج 40MB، لكنه نموذج عزل عنصر رئيسي عام وليس ضماناً لعزل كل الملابس المعقدة بدقة مثالية. [14]

سيُحمّل النموذج فقط بعد طلب المستخدم للوضع المحلي، ويعمل WebAssembly على Chrome Android رسمياً؛ أما WebGPU فيستخدم عند دعمه لتحسين الأداء. تبقى Perfect Corp والصورة الخام بديلين عند فشل النموذج أو ضعف الجودة. [15]

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
[8]: https://github.com/Zheng-Chong/CatVTON "CatVTON — Official Repository"
[9]: https://github.com/danielgatis/rembg "rembg — Official Repository"
[10]: https://gradio.app/guides/understanding-gradio-share-links "Gradio — Understanding Share Links"
[11]: https://onnxruntime.ai/docs/tutorials/web/ "ONNX Runtime Web — Official Documentation"
[12]: https://img.ly/blog/browser-background-removal-using-onnx-runtime-webgpu/ "IMG.LY — Browser Background Removal with ONNX Runtime"
[13]: https://github.com/imgly/background-removal-js "IMG.LY Background Removal JS — Repository and AGPL License"
[14]: https://huggingface.co/Heliosoph/u2net-onnx "Heliosoph — U2Net ONNX model card"
[15]: https://onnxruntime.ai/docs/get-started/with-javascript/web.html "ONNX Runtime Web — browser support"
