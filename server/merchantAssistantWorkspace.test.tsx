// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import MerchantAssistantWorkspace from '../client/src/components/MerchantAssistantWorkspace';
import { createMerchantProfile } from '../shared/merchantAssistant';
import { DEFAULT_TEMPLATE_SETTINGS } from '../shared/types';

describe('تجربة المساعد فوق الإعلان النهائي', () => {
  it('لا يعيد المستخدم إلى الإعلان إلا بعد تأكيد تطبيق تغيير ناجح', async () => {
    const onApplyCommands = vi.fn().mockResolvedValue(true);
    const onOpenUpdatedResult = vi.fn();
    render(<MerchantAssistantWorkspace profile={createMerchantProfile()} template={DEFAULT_TEMPLATE_SETTINGS} onCommitProfile={vi.fn()} onApplyCommands={onApplyCommands} onClearProfile={vi.fn()} onOpenUpdatedResult={onOpenUpdatedResult} />);

    fireEvent.click(screen.getByRole('button', { name: 'كبّر الملابس' }));
    expect(await screen.findByRole('button', { name: 'تأكيد تطبيق التغيير' })).toBeTruthy();
    expect(onOpenUpdatedResult).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'تأكيد تطبيق التغيير' }));
    await waitFor(() => expect(onApplyCommands).toHaveBeenCalled());
    await waitFor(() => expect(onOpenUpdatedResult).toHaveBeenCalledTimes(1));
    expect(onApplyCommands.mock.calls[0][0]).toEqual([{ type: 'adjust-product-scale', direction: 'increase' }]);
  });
});
