import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

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
