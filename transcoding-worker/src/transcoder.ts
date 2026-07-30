import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

export interface Rendition {
  name: string;
  resolution: string;
  bitrate: string;
  audioBitrate: string;
}

export const RENDITIONS: Rendition[] = [
  { name: '1080p', resolution: '1920:1080', bitrate: '5000k', audioBitrate: '128k' },
  { name: '720p', resolution: '1280:720', bitrate: '2500k', audioBitrate: '128k' },
  { name: '480p', resolution: '854:480', bitrate: '1000k', audioBitrate: '64k' },
];

export interface TranscodeResult {
  duration: number;
  outputDir: string;
  renditions: string[];
  masterPlaylist: string;
}

function ffmpeg(...args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`ffmpeg exited code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', (err) => reject(new Error(`Failed to spawn ffmpeg: ${err.message}`)));
  });
}

function parseDuration(stderr: string): number {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
  if (match) {
    const [, h, m, s, ms] = match.map(Number);
    return h * 3600 + m * 60 + s + ms / 100;
  }
  return 0;
}

export async function transcodeToHls(
  inputPath: string,
  videoId: string,
  outputBase: string,
): Promise<TranscodeResult> {
  const outputDir = join(outputBase, videoId);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const renditionDirs: string[] = [];
  const playlistPaths: string[] = [];
  let lastStderr = '';

  for (const rend of RENDITIONS) {
    const rendDir = join(outputDir, rend.name);
    if (!existsSync(rendDir)) {
      mkdirSync(rendDir, { recursive: true });
    }
    renditionDirs.push(rend.name);

    const segmentPattern = join(rendDir, 'segment_%03d.ts');
    const playlistPath = join(rendDir, 'index.m3u8');

    lastStderr = await ffmpeg(
      '-i', inputPath,
      '-vf', `scale=${rend.resolution}`,
      '-c:v', 'libx264',
      '-b:v', rend.bitrate,
      '-maxrate', rend.bitrate,
      '-bufsize', `${parseInt(rend.bitrate) * 2}k`,
      '-c:a', 'aac',
      '-b:a', rend.audioBitrate,
      '-ar', '48000',
      '-hls_time', '6',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', segmentPattern,
      '-progress', 'pipe:1',
      '-y',
      playlistPath,
    );

    playlistPaths.push(rend.name + '/index.m3u8');
  }

  const masterPath = join(outputDir, 'master.m3u8');
  const masterContent = ['#EXTM3U'];
  for (let i = 0; i < RENDITIONS.length; i++) {
    const rend = RENDITIONS[i];
    masterContent.push('');
    masterContent.push(`#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(rend.bitrate) * 1000},RESOLUTION=${rend.resolution.replace(':', 'x')},NAME="${rend.name}"`);
    masterContent.push(playlistPaths[i]);
  }
  const { writeFileSync } = await import('node:fs');
  writeFileSync(masterPath, masterContent.join('\n'));

  const duration = parseDuration(lastStderr);

  return {
    duration,
    outputDir,
    renditions: renditionDirs,
    masterPlaylist: `${videoId}/master.m3u8`,
  };
}
