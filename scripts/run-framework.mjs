import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const videoPath = join(projectRoot, "public/media/process-video/makster-final-15s.mp4");
const videoPartsDirectory = join(projectRoot, "assets/video-source/makster-final-15s");
const expectedVideoSha256 = "bee25b7024f8043ce354f61da366f7bfb6a881523ccf33569bc490c8fa0f4d8d";

function videoIsReady() {
  if (!existsSync(videoPath)) return false;
  return createHash("sha256").update(readFileSync(videoPath)).digest("hex") === expectedVideoSha256;
}

if (!videoIsReady()) {
  const parts = readdirSync(videoPartsDirectory).sort().map((name) => readFileSync(join(videoPartsDirectory, name)));
  mkdirSync(dirname(videoPath), { recursive: true });
  writeFileSync(videoPath, Buffer.concat(parts));
  if (!videoIsReady()) throw new Error("Could not reconstruct MAKSTER_FINAL_15s.mp4 from its source parts.");
}

const require = createRequire(import.meta.url);
const [command = "dev", ...incomingArgs] = process.argv.slice(2);
const frameworkArgs = [command];

for (let index = 0; index < incomingArgs.length; index += 1) {
  const argument = incomingArgs[index];
  if (argument === "--strictPort") continue;
  if (argument === "--host") {
    frameworkArgs.push("--hostname");
    if (incomingArgs[index + 1]) frameworkArgs.push(incomingArgs[++index]);
    continue;
  }
  frameworkArgs.push(argument);
}

const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), ...frameworkArgs], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
