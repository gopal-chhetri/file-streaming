import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';

const hash = (t: string) => createHash('sha256').update(t).digest('hex');

function makeService(tokens: Array<Record<string, any>>) {
  const em = {
    findOne: jest.fn(async (_e: unknown, where: { tokenHash: string }) =>
      tokens.find((t) => t.tokenHash === where.tokenHash) ?? null,
    ),
    find: jest.fn(async (_e: unknown, where: { familyId: string }) =>
      tokens.filter((t) => t.familyId === where.familyId),
    ),
    count: jest.fn(async (_e: unknown, where: { familyId: string }) =>
      tokens.filter((t) => t.familyId === where.familyId && !t.revokedAt).length,
    ),
    create: jest.fn((_e: unknown, data: Record<string, unknown>) => {
      const token = { ...data };
      tokens.push(token);
      return token;
    }),
    persist: jest.fn(),
    flush: jest.fn(),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('access') };
  return new AuthService({} as never, jwt as never, em as never);
}

const user = (isActive = true) => ({ id: 'u1', email: 'a@b.c', isActive, role: { name: 'user' } });

describe('AuthService refresh/logout', () => {
  it('rejects refresh for a deactivated account and revokes the session', async () => {
    const tokens: Array<Record<string, any>> = [{ tokenHash: hash('t1'), familyId: 'f', user: user(false), expiresAt: new Date(Date.now() + 1e6) }];
    await expect(makeService(tokens).refresh('t1')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokens[0].revokedAt).toBeInstanceOf(Date);
  });

  it('a second tab refreshing with the just-rotated token still gets tokens', async () => {
    const tokens: Array<Record<string, any>> = [
      { tokenHash: hash('t1'), familyId: 'f', user: user(), expiresAt: new Date(Date.now() + 1e6) },
    ];
    const service = makeService(tokens);
    await service.refresh('t1'); // first tab rotates t1
    const second = await service.refresh('t1'); // second tab, same moment
    expect(second.accessToken).toBe('access');
    expect(tokens.filter((t) => !t.revokedAt).length).toBeGreaterThan(0); // session alive
  });

  it('reuse of an old rotated token outside the grace window revokes the session', async () => {
    const old = new Date(Date.now() - 60_000);
    const tokens: Array<Record<string, any>> = [
      { tokenHash: hash('old'), familyId: 'f', user: user(), expiresAt: new Date(Date.now() + 1e6), revokedAt: old, rotatedAt: old },
      { tokenHash: hash('new'), familyId: 'f', user: user(), expiresAt: new Date(Date.now() + 1e6) },
    ];
    await expect(makeService(tokens).refresh('old')).rejects.toThrow('reuse');
    expect(tokens.every((t) => t.revokedAt)).toBe(true);
  });

  it('logout revokes the whole session, so the token cannot be refreshed', async () => {
    const tokens: Array<Record<string, any>> = [
      { tokenHash: hash('t1'), familyId: 'f', user: user(), expiresAt: new Date(Date.now() + 1e6) },
    ];
    const service = makeService(tokens);
    await service.logout('t1');
    expect(tokens[0].revokedAt).toBeInstanceOf(Date);
    await expect(service.refresh('t1')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
