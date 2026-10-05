import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planRenditions, renditionArgs, transcodeToHls } from './transcoder';

test('landscape 1080p source gets all renditions at 16:9', () => {
  const plan = planRenditions({ width: 1920, height: 1080 });
  assert.deepEqual(
    plan.map((r) => `${r.name}:${r.width}x${r.height}`),
    ['1080p:1920x1080', '720p:1280x720', '480p:854x480'],
  );
});

test('never upscales: a 720p source gets no 1080p rendition', () => {
  const plan = planRenditions({ width: 1280, height: 720 });
  assert.deepEqual(plan.map((r) => r.name), ['720p', '480p']);
});

test('portrait video keeps its aspect ratio (not stretched to 16:9)', () => {
  const plan = planRenditions({ width: 720, height: 1280 });
  assert.deepEqual(
    plan.map((r) => `${r.name}:${r.width}x${r.height}`),
    ['720p:720x1280', '480p:480x854'],
  );
});

test('4:3 video keeps 4:3', () => {
  const [r] = planRenditions({ width: 640, height: 480 });
  assert.equal(`${r.width}x${r.height}`, '640x480');
});

test('a source smaller than every target gets one rendition at its own size', () => {
  const plan = planRenditions({ width: 426, height: 240 });
  assert.equal(plan.length, 1);
  assert.equal(`${plan[0].name}:${plan[0].width}x${plan[0].height}`, '240p:426x240');
});

test('ffmpeg output is not piped (an unread pipe stalls ffmpeg)', () => {
  const args = renditionArgs('in.mp4', planRenditions({ width: 1280, height: 720 })[0], '/out', true);
  assert.ok(!args.includes('-progress'));
});

function makeClip(dir: string, size: string, audio: boolean): string {
  const out = join(dir, `clip-${size}.mp4`);
  execFileSync('ffmpeg', [
    '-v', 'error',
    '-f', 'lavfi', '-i', `testsrc=size=${size}:rate=24:duration=3`,
    ...(audio ? ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=3'] : []),
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    ...(audio ? ['-c:a', 'aac', '-shortest'] : []),
    '-y', out,
  ]);
  return out;
}

test('transcodes a real portrait clip to aspect-correct HLS', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'worker-test-'));
  try {
    const input = makeClip(dir, '720x1280', true);
    const result = await transcodeToHls(input, 'vid-portrait', join(dir, 'out'));

    assert.deepEqual(result.renditions, ['720p', '480p']);
    assert.ok(result.duration > 2.5 && result.duration < 3.5, `duration ${result.duration}`);
    const master = readFileSync(join(result.outputDir, 'master.m3u8'), 'utf-8');
    assert.match(master, /RESOLUTION=720x1280/);
    assert.match(master, /RESOLUTION=480x854/);
    assert.doesNotMatch(master, /1080/);
    assert.ok(existsSync(join(result.outputDir, '720p', 'segment_000.ts')));

    const dims = execFileSync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0', join(result.outputDir, '480p', 'segment_000.ts'),
    ]).toString();
    // MPEG-TS lists the stream once per program as well; all must agree.
    const lines = dims.split('\n').filter(Boolean);
    assert.ok(lines.length > 0);
    assert.ok(lines.every((l) => l === '480,854'), dims);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('transcodes a clip without an audio track', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'worker-test-'));
  try {
    const input = makeClip(dir, '640x480', false);
    const result = await transcodeToHls(input, 'vid-silent', join(dir, 'out'));
    assert.deepEqual(result.renditions, ['480p']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
