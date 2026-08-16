import { describe, expect, it } from 'vitest';
import { appendDesignHistory, createDesignHistory, designDocumentFingerprint, parseDesignHistory, redoDesignHistory, removeDesignHistoryEntry, replayDesignHistory, serializeDesignHistory, undoDesignHistory } from '../client/src/lib/designHistory';
import type { DesignDocument } from '../shared/designDocument';

const base: DesignDocument = {
  schemaVersion: 1,
  template: 'portrait',
  elements: [
    { id: 'header', visible: true, required: false, box: { x: .14, y: .06, width: .72, height: .13 } },
    { id: 'logo', visible: true, required: false, box: { x: .77, y: .07, width: .095, height: .075 } },
    { id: 'product', visible: true, required: true, box: { x: .17, y: .20, width: .66, height: .52 } },
    { id: 'badge', visible: false, required: false, box: { x: .075, y: .07, width: .12, height: .10 } },
    { id: 'info', visible: true, required: false, box: { x: .055, y: .42, width: .13, height: .20 } },
    { id: 'price', visible: true, required: true, box: { x: .815, y: .42, width: .13, height: .20 } },
    { id: 'features', visible: true, required: false, box: { x: .14, y: .75, width: .72, height: .06 } },
    { id: 'footer', visible: true, required: false, box: { x: 0, y: .83, width: 1, height: .147 } },
  ],
  constraints: ['inside-canvas', 'product-inside-hero', 'logo-avoids-product', 'footer-avoids-price', 'footer-avoids-features', 'price-required'],
  privacy: { includedImage: false, includedPersonalFields: false, networkUsed: false },
};

function withLogo(document: DesignDocument, x: number): DesignDocument {
  return { ...document, elements: document.elements.map(element => element.id === 'logo' ? { ...element, box: { ...element.box, x } } : element) };
}

describe('Design Replay المحلي', () => {
  it('يعيد عشرين عملية متتابعة إلى وثيقة مطابقة وبصمة دلالية متطابقة', () => {
    let current = base;
    let history = createDesignHistory(base);
    for (let index = 1; index <= 20; index += 1) {
      const next = withLogo(current, .77 - index * .005);
      history = appendDesignHistory(history, current, next, `تحريك الشعار ${index}`);
      current = next;
    }

    const replayed = replayDesignHistory(history);
    expect(history.entries).toHaveLength(20);
    expect(replayed).toEqual(current);
    expect(designDocumentFingerprint(replayed)).toBe(designDocumentFingerprint(current));
  });

  it('يدعم Undo ثم Redo مع إعادة تشغيل حتمية', () => {
    const changed = withLogo(base, .62);
    const history = appendDesignHistory(createDesignHistory(base), base, changed, 'تحريك الشعار');
    const undone = undoDesignHistory(history);

    expect(replayDesignHistory(undone.history)).toEqual(base);
    expect(undone.removed).toBeDefined();

    const redone = redoDesignHistory(undone.history, undone.removed!);
    expect(replayDesignHistory(redone)).toEqual(changed);
  });

  it('يرفض حذف عملية من المنتصف عندما تعتمد عليها عملية لاحقة', () => {
    const first = withLogo(base, .70);
    const second = withLogo(first, .62);
    let history = appendDesignHistory(createDesignHistory(base), base, first, 'العملية الأولى');
    history = appendDesignHistory(history, first, second, 'العملية الثانية');

    expect(() => removeDesignHistoryEntry(history, 1)).toThrow('تعارض');
  });

  it('يقبل حذف آخر عملية مستقلة ويعيد بناء الحالة السابقة', () => {
    const changed = withLogo(base, .62);
    const history = appendDesignHistory(createDesignHistory(base), base, changed, 'تحريك الشعار');
    const withoutLast = removeDesignHistoryEntry(history, 1);

    expect(replayDesignHistory(withoutLast)).toEqual(base);
  });

  it('يرفض أي صورة أو رابط داخل السجل المحلي ويثبت قابلية قراءة JSON السليم', () => {
    const history = createDesignHistory(base);
    expect(parseDesignHistory(serializeDesignHistory(history))).toEqual(history);
    expect(() => serializeDesignHistory({ ...history, entries: [{ id: 1, label: 'https://example.com', operations: [] }] })).toThrow('لا يسمح');
    expect(() => parseDesignHistory('{"schemaVersion":1,"base":{"bad":"data:image/png"},"entries":[]}')).toThrow();
  });
});
