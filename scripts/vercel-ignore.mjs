const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;
const currentSha = process.env.VERCEL_GIT_COMMIT_SHA;
const owner = process.env.VERCEL_GIT_REPO_OWNER;
const repository = process.env.VERCEL_GIT_REPO_SLUG;

// Fail open: if Git metadata or the compare API is unavailable, build the site.
if (!previousSha || !currentSha || !owner || !repository) {
  process.exit(1);
}

try {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repository}/compare/${previousSha}...${currentSha}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "makster-atelier-vercel-ignore",
      },
    },
  );

  if (!response.ok) process.exit(1);

  const comparison = await response.json();
  const files = Array.isArray(comparison.files) ? comparison.files : [];
  if (files.length === 0) process.exit(1);

  const runtimeOnly = files.every(({ filename }) =>
    filename.startsWith("vyta-runtime/") || filename.startsWith("railway-preview/")
  );

  process.exit(runtimeOnly ? 0 : 1);
} catch {
  process.exit(1);
}
