import { ConflictException, ForbiddenException } from '@nestjs/common';
import { VideosService, rawObjectKey } from './videos.service';
import { VideoStatus } from './entities/video.entity';

const OWNER = 'owner-id';
const OTHER = 'other-id';

function makeVideo(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Clip',
    description: 'desc',
    filename: 'holiday.mp4',
    objectKey: '11111111-1111-4111-8111-111111111111/source.mp4',
    mimeType: 'video/mp4',
    size: '100',
    status: VideoStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: OWNER,
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: '$2b$12$secrethash',
    },
    ...overrides,
  };
}

function makeService(video: ReturnType<typeof makeVideo> | null) {
  const em = {
    findOne: jest.fn().mockResolvedValue(video),
    flush: jest.fn(),
    remove: jest.fn(),
    persist: jest.fn(),
    create: jest.fn((_e, data) => data),
    getReference: jest.fn((_e, id) => ({ id })),
    nativeDelete: jest.fn(),
  };
  const minio = {
    removeObject: jest.fn().mockResolvedValue(undefined),
    abortMultipartUpload: jest.fn().mockResolvedValue(undefined),
  };
  const analytics = {
    aggregate: () => ({ exec: async () => [{ _id: video?.id, views: 7 }] }),
  };
  const redis = { del: jest.fn() };
  const service = new VideosService(
    em as never,
    minio as never,
    {} as never,
    { publishVideoUploaded: jest.fn() } as never,
    analytics as never,
    redis as never,
  );
  return { service, em, minio };
}

describe('VideosService', () => {
  it('never exposes the uploader password hash or email', async () => {
    const { service } = makeService(makeVideo());
    const body = JSON.stringify(await service.findById('x'));
    expect(body).not.toContain('secrethash');
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('alice@example.com');
    expect(JSON.parse(body).user).toEqual({ id: OWNER, username: 'alice' });
  });

  it("forbids aborting someone else's upload", async () => {
    const { service, minio, em } = makeService(makeVideo({ status: VideoStatus.PENDING }));
    await expect(service.abortMultipartUpload('x', OTHER, 'up')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(minio.removeObject).not.toHaveBeenCalled();
    expect(em.remove).not.toHaveBeenCalled();
  });

  it('refuses to reopen a video that is past the upload phase (e.g. banned)', async () => {
    const { service } = makeService(makeVideo({ status: VideoStatus.BANNED }));
    await expect(
      service.completeMultipartUpload('x', OWNER, { uploadId: 'u', parts: [] } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets the owner abort their own pending upload', async () => {
    const video = makeVideo({ status: VideoStatus.PENDING });
    const { service, minio, em } = makeService(video);
    await service.abortMultipartUpload('x', OWNER, 'up');
    expect(minio.removeObject).toHaveBeenCalledWith('raw-uploads', video.objectKey);
    expect(em.remove).toHaveBeenCalledWith(video);
  });

  it('a report does not change the video status', async () => {
    const video = makeVideo();
    const { service } = makeService(video);
    await service.reportVideo('x', OTHER, { reason: 'spam' } as never);
    expect(video.status).toBe(VideoStatus.ACTIVE);
  });
});

describe('rawObjectKey', () => {
  it('derives the key from the video id, never the client filename', () => {
    expect(rawObjectKey('vid', 'My Holiday.MP4')).toBe('vid/source.mp4');
    expect(rawObjectKey('vid', '../../etc/passwd')).toBe('vid/source');
    expect(rawObjectKey('vid', 'clip.m$o%v')).toBe('vid/source.mov');
  });
});
