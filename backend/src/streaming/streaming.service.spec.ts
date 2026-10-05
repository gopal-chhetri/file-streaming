import { NotFoundException } from '@nestjs/common';
import { StreamingService, isSafeHlsPath } from './streaming.service';

const VIDEO_ID = '11111111-1111-4111-8111-111111111111';

function makeService(status: string | null) {
  const minio = {
    statObject: jest.fn().mockResolvedValue({ size: 10 }),
    getObject: jest.fn().mockResolvedValue('stream'),
  };
  const em = { fork: () => ({ findOne: async () => (status ? { status } : null) }) };
  const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
  return { service: new StreamingService(minio as never, em as never, redis as never), minio };
}

describe('StreamingService', () => {
  it.each(['banned', 'pending_review', 'failed', 'processing'])(
    'does not serve a %s video',
    async (status) => {
      const { service, minio } = makeService(status);
      await expect(service.getFile(VIDEO_ID, 'master.m3u8')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(minio.getObject).not.toHaveBeenCalled();
    },
  );

  it('serves an active video', async () => {
    const { service } = makeService('active');
    await expect(service.getFile(VIDEO_ID, '720p/index.m3u8')).resolves.toMatchObject({
      size: 10,
    });
  });

  it('rejects non-UUID video ids without a lookup', async () => {
    const { service } = makeService('active');
    await expect(service.getFile('../secret', 'master.m3u8')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('isSafeHlsPath', () => {
  it.each(['master.m3u8', '720p/index.m3u8', '480p/segment_001.ts'])('allows %s', (p) =>
    expect(isSafeHlsPath(p)).toBe(true),
  );
  it.each(['../other/master.m3u8', '720p/../../x.ts', 'source.mp4', '', '720p//a.ts'])(
    'rejects %s',
    (p) => expect(isSafeHlsPath(p)).toBe(false),
  );
});
