import { ForbiddenException } from '@nestjs/common';
import { AnalyticsService, computeEndedIn } from './analytics.service';

const VIDEO_ID = '11111111-1111-4111-8111-111111111111';

function makeService(status: string | null, owner = 'owner-id') {
  const kafka = { publishHeartbeat: jest.fn() };
  const em = {
    fork: () => ({ findOne: async () => (status ? { status } : null) }),
    findOne: async () => ({ id: VIDEO_ID, user: { id: owner } }),
  };
  const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
  const model = {
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }),
  };
  const service = new AnalyticsService(kafka as never, model as never, em as never, redis as never);
  return { service, kafka };
}

const beat = {
  sessionId: 's1',
  videoId: VIDEO_ID,
  position: 5,
  duration: 100,
  eventType: 'play' as const,
};

describe('AnalyticsService', () => {
  it('attributes heartbeats to the token user, ignoring any userId in the body', async () => {
    const { service, kafka } = makeService('active');
    await service.ingestHeartbeat({ ...beat, userId: 'victim-id' }, 'token-user');
    expect(kafka.publishHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'token-user' }),
    );
  });

  it('anonymous heartbeats carry no user even if the body claims one', async () => {
    const { service, kafka } = makeService('active');
    await service.ingestHeartbeat({ ...beat, userId: 'victim-id' }, undefined);
    expect(kafka.publishHeartbeat.mock.calls[0][0].userId).toBeUndefined();
  });

  it('drops heartbeats for videos that are not live (or do not exist)', async () => {
    for (const status of ['banned', null]) {
      const { service, kafka } = makeService(status);
      await service.ingestHeartbeat(beat, undefined);
      expect(kafka.publishHeartbeat).not.toHaveBeenCalled();
    }
  });

  it("forbids reading another user's retention curve", async () => {
    const { service } = makeService('active', 'owner-id');
    await expect(
      service.getRetention(VIDEO_ID, { id: 'someone-else', role: 'user' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getRetention(VIDEO_ID, { id: 'admin-id', role: 'admin' })).resolves.toBeDefined();
  });

  it('merges retention buckets with legacy per-session points', () => {
    const endedIn = computeEndedIn([
      { retentionBuckets: { b0: 2, b19: 3 } },
      { retentionBuckets: new Map([['b10', 1]]), retentionCurve: [{ percentage: 99, viewers: 1 }] },
    ]);
    expect(endedIn[0]).toBe(2);
    expect(endedIn[10]).toBe(1);
    expect(endedIn[19]).toBe(4);
    expect(endedIn).toHaveLength(20);
  });
});
