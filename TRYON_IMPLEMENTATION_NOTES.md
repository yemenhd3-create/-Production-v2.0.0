# مسار Virtual Try-On الاختياري

يعتمد التكامل الأولي على **FASHN Product to Model** لأن المستخدم يرفع صورة القطعة فقط، بينما ينشئ المزود شخصاً مناسباً يرتدي القطعة. يوثّق FASHN نموذج طلب موحّداً: `POST /v1/run` مع `model_name: "product-to-model"` و`inputs.product_image`، ثم الاستعلام عن `GET /v1/status/<id>` حتى تكتمل المهمة. يمكن تمرير صورة القطعة كرابط أو كـ Data URI، كما يدعم الطلب خيار نسبة أبعاد للناتج.[1]

داخل التطبيق، يبقى هذا المسار **اختيارياً**: لا يُنفّذ إلا عند وجود مزود مفعّل باسم `fashn-product-to-model` في لوحة المطور. وعند عدم وجود مزود أو عند فشل الطلب أو انتهاء المهلة، ينشأ الإعلان محلياً من صورة القطعة مع تنبيه صريح للمستخدم.

## مرجع

[1]: https://docs.fashn.ai/api-reference/product-to-model "FASHN Product to Model API Reference"
