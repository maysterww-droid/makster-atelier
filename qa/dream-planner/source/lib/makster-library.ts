export type ReadyModuleRow = {
  module_code: string;
  template_code: string;
  display_name: string;
  version: number | string;
  release_status: "READY" | string;
  width_mm: number | string;
  depth_mm: number | string;
  body_height_mm: number | string;
  leg_height_mm: number | string;
  glb_bucket: string | null;
  glb_path: string | null;
  motion_json_bucket: string | null;
  motion_json_path: string | null;
  preview_bucket: string | null;
  preview_path: string | null;
};

export type MotionContract = {
  schema_version: string;
  module_id: string;
  module_code: string;
  coordinate_system: Record<string, string>;
  motions: Array<
    | {
        motion_id: string;
        kind: "ROTATION";
        object_code: string;
        pivot_code: string;
        hinge_side: "LEFT" | "RIGHT";
        closed_degrees: number;
        open_degrees: number;
        verification_status: string;
      }
    | {
        motion_id: string;
        kind: "TRANSLATION";
        object_code: string;
        axis: string;
        closed_offset_mm: number;
        open_offset_mm: number;
        verification_status: string;
      }
  >;
};

export type ReadyModuleAsset = {
  moduleCode: string;
  templateCode: string;
  displayName: string;
  version: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  glbUrl: string;
  motionUrl: string | null;
  previewUrl: string | null;
};

const projectUrl = process.env.NEXT_PUBLIC_MAKSTER_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const publishableKey = process.env.NEXT_PUBLIC_MAKSTER_SUPABASE_PUBLISHABLE_KEY ?? "";

function publicAssetUrl(bucket: string | null, path: string | null) {
  if (!projectUrl || !bucket || !path) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${projectUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export function isMaksterLibraryConfigured() {
  return Boolean(projectUrl && publishableKey);
}

export async function loadReadyModuleLibrary(signal?: AbortSignal): Promise<ReadyModuleAsset[]> {
  if (!isMaksterLibraryConfigured()) return [];

  const fields = [
    "module_code",
    "template_code",
    "display_name",
    "version",
    "release_status",
    "width_mm",
    "depth_mm",
    "body_height_mm",
    "leg_height_mm",
    "glb_bucket",
    "glb_path",
    "motion_json_bucket",
    "motion_json_path",
    "preview_bucket",
    "preview_path",
  ].join(",");

  const response = await fetch(
    `${projectUrl}/rest/v1/ready_module_library?select=${encodeURIComponent(fields)}&release_status=eq.READY&order=module_code.asc`,
    {
      signal,
      headers: {
        apikey: publishableKey,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Makster Module Library HTTP ${response.status}`);
  }

  const rows = (await response.json()) as ReadyModuleRow[];
  return rows.flatMap((row) => {
    if (row.release_status !== "READY") return [];
    const glbUrl = publicAssetUrl(row.glb_bucket, row.glb_path);
    if (!glbUrl) return [];
    return [{
      moduleCode: row.module_code,
      templateCode: row.template_code,
      displayName: row.display_name,
      version: Number(row.version) || 1,
      widthMm: Number(row.width_mm) || 0,
      heightMm: (Number(row.body_height_mm) || 0) + Math.max(0, Number(row.leg_height_mm) || 0),
      depthMm: Number(row.depth_mm) || 0,
      glbUrl,
      motionUrl: publicAssetUrl(row.motion_json_bucket, row.motion_json_path),
      previewUrl: publicAssetUrl(row.preview_bucket, row.preview_path),
    }];
  });
}

export async function loadMotionContract(url: string | null, signal?: AbortSignal): Promise<MotionContract | null> {
  if (!url) return null;
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`motion.json HTTP ${response.status}`);
  return (await response.json()) as MotionContract;
}
