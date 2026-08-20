import { describe, expect, it } from 'vitest';
import { parseMerchantCommands } from '../shared/merchantAssistant';
import { LOCAL_LEADER_ROLES, resolveLocalLeaderPlan } from '../shared/localLeader';

describe('القائد المحلي متعدد الأدوار', () => {
  it('يعرض أدوار القائد المحلية من دون الاعتماد على نموذج خارجي', () => {
    expect(LOCAL_LEADER_ROLES.map(role => role.id)).toEqual(['leader', 'template', 'garment', 'quality', 'privacy', 'research']);
  });

  it('يوجه طلب الشعار إلى مسار مراجعة مرفق بدلاً من تغيير صامت', () => {
    expect(resolveLocalLeaderPlan('هذه صورة الشعار، ضعها في القالب', parseMerchantCommands('هذه صورة الشعار، ضعها في القالب'))).toMatchObject({ role: 'template', intent: 'asset' });
  });

  it('يبقي أمر تكبير الملابس ضمن مهمة تحتاج تأكيد المستخدم', () => {
    expect(resolveLocalLeaderPlan('كبّر الملابس', parseMerchantCommands('كبّر الملابس'))).toMatchObject({ role: 'leader', intent: 'command' });
  });
});
