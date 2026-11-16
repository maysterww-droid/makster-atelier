import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const videoPath = join(projectRoot, "public/media/process-video/makster-final-15s.mp4");
const videoPartsDirectory = join(projectRoot, "assets/video-source/makster-final-15s");
const expectedVideoSha256 = "bee25b7024f8043ce354f61da366f7bfb6a881523ccf33569bc490c8fa0f4d8d";

const videoIsReady = () => existsSync(videoPath)
  && createHash("sha256").update(readFileSync(videoPath)).digest("hex") === expectedVideoSha256;

if (!videoIsReady()) {
  const parts = readdirSync(videoPartsDirectory).sort().map((name) => readFileSync(join(videoPartsDirectory, name)));
  mkdirSync(dirname(videoPath), { recursive: true });
  writeFileSync(videoPath, Buffer.concat(parts));
  if (!videoIsReady()) throw new Error("Could not reconstruct MAKSTER_FINAL_15s.mp4 from its source parts.");
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
