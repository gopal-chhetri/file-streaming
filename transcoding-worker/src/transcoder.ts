import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

export interface Rendition {
  name: string;
  /** Target size of the short side (height for landscape, width for portrait). */
  shortSide: number;
  bitrate: string;
  audioBitrate: string;
}

export const RENDITIONS: Rendition[] = [
  { name: '1080p', shortSide: 1080, bitrate: '5000k', audioBitrate: '128k' },
  { name: '720p', shortSide: 720, bitrate: '2500k', audioBitrate: '128k' },
  { name: '480p', shortSide: 480, bitrate: '1000k', audioBitrate: '64k' },
];

export interface SourceInfo {
  width: number;
  height: number;
  duration: number;
  hasAudio: boolean;
}

export interface PlannedRendition extends Rendition {
  width: number;
  height: number;
}

export interface TranscodeResult {
  duration: number;
  outputDir: string;
  renditions: string[];
  masterPlaylist: string;
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // stdout is ignored, not piped: an unread pipe fills up and blocks the
    // child process forever.
    const proc = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 64_000) stderr = stderr.slice(-32_000);
    });
    proc.on('close', (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`${cmd} exited code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', (err) => reject(new Error(`Failed to spawn ${cmd}: ${err.message}`)));
  });
}

/** Dimensions, duration and audio presence of the source, via ffprobe. */
export function probe(inputPath: string): Promise<SourceInfo> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', inputPath],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    proc.stdout.on('data', (c: Buffer) => (out += c.toString()));
    proc.stderr.on('data', (c: Buffer) => (err += c.toString()));
    proc.on('error', (e) => reject(new Error(`Failed to spawn ffprobe: ${e.message}`)));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exited code ${code}: ${err.slice(-300)}`));
      try {
        const data = JSON.parse(out) as {
          streams?: { codec_type?: string; width?: number; height?: number }[];
          format?: { duration?: string };
        };
        const video = data.streams?.find((s) => s.codec_type === 'video' && s.width && s.height);
        if (!video) return reject(new Error('Input does not contain any video stream'));
        resolve({
          width: video.width!,
          height: video.height!,
          duration: Number(data.format?.duration) || 0,
          hasAudio: Boolean(data.streams?.some((s) => s.codec_type === 'audio')),
        });
      } catch (e) {
        reject(new Error(`Could not parse ffprobe output: ${(e as Error).message}`));
      }
    });
  });
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Renditions for a source: never upscale (only targets at or below the
 * source's short side), and keep the aspect ratio so portrait and 4:3
 * videos aren't stretched to 16:9. A source smaller than every target gets
 * one rendition at its own size.
 */
export function planRenditions(source: Pick<SourceInfo, 'width' | 'height'>): PlannedRendition[] {
  const landscape = source.width >= source.height;
  const shortSide = Math.min(source.width, source.height);
  const fits = RENDITIONS.filter((r) => r.shortSide <= shortSide);
  const chosen = fits.length > 0 ? fits : [{ ...RENDITIONS[RENDITIONS.length - 1], shortSide }];

  return chosen.map((r) => {
    const scale = r.shortSide / shortSide;
    return {
      ...r,
      name: fits.length > 0 ? r.name : `${even(r.shortSide)}p`,
      width: landscape ? even(source.width * scale) : even(r.shortSide),
      height: landscape ? even(r.shortSide) : even(source.height * scale),
    };
  });
}

export function renditionArgs(
  inputPath: string,
  rend: PlannedRendition,
  outDir: string,
  hasAudio: boolean,
): string[] {
  return [
    '-i', inputPath,
    '-vf', `scale=${rend.width}:${rend.height}`,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', rend.bitrate,
    '-maxrate', rend.bitrate,
    '-bufsize', `${parseInt(rend.bitrate) * 2}k`,
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', rend.audioBitrate, '-ar', '48000'] : ['-an']),
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_segment_filename', join(outDir, 'segment_%03d.ts'),
    '-y',
    join(outDir, 'index.m3u8'),
  ];
}

export async function transcodeToHls(
  inputPath: string,
  videoId: string,
  outputBase: string,
): Promise<TranscodeResult> {
  const outputDir = join(outputBase, videoId);
  mkdirSync(outputDir, { recursive: true });

  const source = await probe(inputPath);
  const plan = planRenditions(source);

  for (const rend of plan) {
    const rendDir = join(outputDir, rend.name);
    if (!existsSync(rendDir)) mkdirSync(rendDir, { recursive: true });
    await run('ffmpeg', renditionArgs(inputPath, rend, rendDir, source.hasAudio));
  }

  const master = ['#EXTM3U'];
  for (const rend of plan) {
    master.push('');
    master.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(rend.bitrate) * 1000},RESOLUTION=${rend.width}x${rend.height},NAME="${rend.name}"`,
    );
    master.push(`${rend.name}/index.m3u8`);
  }
  writeFileSync(join(outputDir, 'master.m3u8'), master.join('\n') + '\n');

  return {
    duration: source.duration,
    outputDir,
    renditions: plan.map((r) => r.name),
    masterPlaylist: `${videoId}/master.m3u8`,
  };
}
