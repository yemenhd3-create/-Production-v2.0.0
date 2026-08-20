// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import MerchantAssistantWorkspace from '../client/src/components/MerchantAssistantWorkspace';
import { createMerchantAssistantSession, createMerchantProfile } from '../shared/merchantAssistant';
import { DEFAULT_TEMPLATE_SETTINGS } from '../shared/types';

describe('تجربة المساعد فوق الإعلان النهائي', () => {
  it('لا يعيد المستخدم إلى الإعلان إلا بعد تأكيد تطبيق تغيير ناجح', async () => {
    const onApplyCommands = vi.fn().mockResolvedValue(true);
    const onOpenUpdatedResult = vi.fn();
    const onCommitSession = vi.fn();
    render(<MerchantAssistantWorkspace profile={createMerchantProfile()} session={createMerchantAssistantSession()} template={DEFAULT_TEMPLATE_SETTINGS} onCommitProfile={vi.fn()} onCommitSession={onCommitSession} onApplyCommands={onApplyCommands} onApplyArtwork={vi.fn().mockResolvedValue(true)} onRestoreBackup={vi.fn()} onClearProfile={vi.fn()} onClearSession={vi.fn()} onOpenUpdatedResult={onOpenUpdatedResult} />);

    fireEvent.click(screen.getByRole('button', { name: 'كبّر الملابس' }));
    expect(await screen.findByRole('button', { name: 'تأكيد تطبيق التغيير' })).toBeTruthy();
    expect(onOpenUpdatedResult).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'تأكيد تطبيق التغيير' }));
    await waitFor(() => expect(onApplyCommands).toHaveBeenCalled());
    await waitFor(() => expect(onOpenUpdatedResult).toHaveBeenCalledTimes(1));
    expect(onApplyCommands.mock.calls[0][0]).toEqual([{ type: 'adjust-product-scale', direction: 'increase' }]);
    expect(onCommitSession.mock.calls.at(-1)?.[0].tasks.at(-1)).toMatchObject({ request: 'كبّر الملابس', status: 'applied' });
  });
});
