import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock('./db', () => ({ getDb }));

const { getActiveAnnouncement, getUserAccess } = await import('./personalWorkspace');

describe('personal workspace data access', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports a disabled account so protected routes can block access', async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 7, isDisabled: 1, role: 'user' }]);
    getDb.mockResolvedValue({ select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit })) })) })) });

    await expect(getUserAccess(7)).resolves.toEqual({ exists: true, isDisabled: true, role: 'user' });
  });

  it('returns the newest active developer announcement when one exists', async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 3, message: 'تم تحديث القالب', isActive: 1 }]);
    getDb.mockResolvedValue({ select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn(() => ({ limit })) })) })) })) });

    await expect(getActiveAnnouncement()).resolves.toMatchObject({ id: 3, message: 'تم تحديث القالب' });
  });
});
