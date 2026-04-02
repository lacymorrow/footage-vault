import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";

interface ProbeResult {
  file_path: string;
  filename: string;
  file_size: number;
  duration_seconds?: number;
  codec?: string;
  resolution?: string;
  fps?: number;
  container?: string;
  file_created_at?: string;
  checksum: string;
}

export const VIDEO_EXTENSIONS = new Set([
  ".mxf", ".mp4", ".mov", ".r3d", ".braw", ".ari",
  ".mkv", ".avi", ".wmv", ".mpg", ".mpeg", ".m4v",
  ".ts", ".mts", ".m2ts",
]);

export function isVideoFile(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return VIDEO_EXTENSIONS.has(ext);
}

function computeChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

function runFfprobe(filePath: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    execFile(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(new Error(`ffprobe failed for ${filePath}: ${error.message}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error(`Failed to parse ffprobe output for ${filePath}`));
        }
      }
    );
  });
}

export async function probeFile(filePath: string, filename: string): Promise<ProbeResult> {
  const stat = statSync(filePath);
  const checksum = await computeChecksum(filePath);

  let duration: number | undefined;
  let codec: string | undefined;
  let resolution: string | undefined;
  let fps: number | undefined;
  let container: string | undefined;
  let fileCreatedAt: string | undefined;

  try {
    const data = await runFfprobe(filePath) as {
      format?: { duration?: string; format_name?: string; tags?: Record<string, string> };
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        width?: number;
        height?: number;
        r_frame_rate?: string;
      }>;
    };

    if (data.format) {
      duration = data.format.duration ? parseFloat(data.format.duration) : undefined;
      container = data.format.format_name;
      if (data.format.tags?.creation_time) {
        fileCreatedAt = data.format.tags.creation_time;
      }
    }

    const videoStream = data.streams?.find((s) => s.codec_type === "video");
    if (videoStream) {
      codec = videoStream.codec_name;
      if (videoStream.width && videoStream.height) {
        resolution = `${videoStream.width}x${videoStream.height}`;
      }
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
        if (den && den > 0) fps = Math.round((num / den) * 100) / 100;
      }
    }
  } catch {
    // ffprobe not available or failed; continue with file metadata only
  }

  return {
    file_path: filePath,
    filename,
    file_size: stat.size,
    duration_seconds: duration,
    codec,
    resolution,
    fps,
    container,
    file_created_at: fileCreatedAt ?? stat.birthtime.toISOString(),
    checksum,
  };
}
