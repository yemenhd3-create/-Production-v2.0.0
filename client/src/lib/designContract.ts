import type { DesignConstraintCheck, DesignContractReport, DesignDocument, DesignElementDocument, DesignRepairPlan } from '@shared/designDocument';
import { getDesignGeometry, type NormalizedBox } from '@shared/designGeometry';

const element = (document: DesignDocument, id: DesignElementDocument['id']) => document.elements.find(item => item.id === id);
const withinCanvas = (box: NormalizedBox) => box.x >= 0 && box.y >= 0 && box.width >= 0 && box.height >= 0 && box.x + box.width <= 1 && box.y + box.height <= 1;
const within = (child: NormalizedBox, parent: NormalizedBox) => child.x >= parent.x && child.y >= parent.y && child.x + child.width <= parent.x + parent.width && child.y + child.height <= parent.y + parent.height;
const intersects = (first: NormalizedBox, second: NormalizedBox) => first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;

function check(id: DesignConstraintCheck['id'], passed: boolean, label: string, detail: string, elements: DesignElementDocument['id'][]): DesignConstraintCheck {
  return { id, status: passed ? 'pass' : 'fail', label, detail, value: passed ? 100 : 0, elements };
}

/** يفحص هندسة المستند فقط؛ لا يحلل الصورة ولا يرسل أي بيانات إلى الشبكة. */
export function evaluateDesignContract(document: DesignDocument): DesignContractReport {
  const geometry = getDesignGeometry(document.template);
  const visible = document.elements.filter(item => item.visible);
  const product = element(document, 'product');
  const logo = element(document, 'logo');
  const footer = element(document, 'footer');
  const price = element(document, 'price');
  const features = element(document, 'features');
  const checks: DesignConstraintCheck[] = [
    check('inside-canvas', visible.every(item => withinCanvas(item.box)), 'حدود الإعلان', 'كل العناصر المرئية يجب أن تبقى داخل مساحة Canvas.', visible.map(item => item.id)),
    check('product-inside-hero', Boolean(product?.visible && within(product.box, geometry.hero)), 'منطقة القطعة', 'قطعة الملابس يجب أن تبقى داخل منطقة البطل الآمنة.', ['product']),
    check('logo-avoids-product', !logo?.visible || !product?.visible || !intersects(logo.box, product.box), 'سلامة الشعار', 'لا ينبغي أن يغطي الشعار قطعة الملابس.', ['logo', 'product']),
    check('footer-avoids-price', !footer?.visible || !price?.visible || !intersects(footer.box, price.box), 'سلامة السعر', 'التذييل لا ينبغي أن يتداخل مع منطقة السعر.', ['footer', 'price']),
    check('footer-avoids-features', !footer?.visible || !features?.visible || !intersects(footer.box, features.box), 'سلامة المزايا', 'التذييل لا ينبغي أن يتداخل مع المزايا.', ['footer', 'features']),
    check('price-required', !price?.required || price.visible, 'إظهار السعر', 'عندما يُفعل السعر وتتوفر قيمته، يبقى ظاهراً في التصميم.', ['price']),
  ];
  const repairs: DesignRepairPlan[] = [];
  if (checks.some(item => item.id === 'logo-avoids-product' && item.status === 'fail')) repairs.push({ id: 'reset-logo-transform', title: 'إعادة الشعار إلى موضع آمن', detail: 'يعيد موضع الشعار الافتراضي المتوافق مع منطقة القطعة.', affectedElements: ['logo'] });
  if (checks.some(item => (item.id === 'footer-avoids-price' || item.id === 'footer-avoids-features') && item.status === 'fail')) repairs.push({ id: 'reset-footer-transform', title: 'إعادة التذييل إلى موضع آمن', detail: 'يعيد موضع التذييل الافتراضي الملائم للمقاس الحالي.', affectedElements: ['footer'] });
  if (checks.some(item => item.id === 'product-inside-hero' && item.status === 'fail')) repairs.push({ id: 'reset-garment-transform', title: 'إعادة القطعة إلى منطقة البطل', detail: 'يلغي التحويل اليدوي غير الآمن للقطعة ويعيد الاحتواء القياسي.', affectedElements: ['product'] });
  return { document, status: checks.some(item => item.status === 'fail') ? 'fail' : 'pass', checks, repairs };
}
