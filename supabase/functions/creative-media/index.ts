import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const BUCKET = "creative-studio-private";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-creative-workspace,x-creative-token,authorization,apikey,x-client-info",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Cache-Control": "no-store",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  const secret = secretJson ? JSON.parse(secretJson)["default"] : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) throw new Error("Supabase server credentials unavailable");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeName(name: string) {
  const clean = String(name || "file").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return clean.slice(-120) || "file";
}

function randomCapabilityToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function requireWorkspace(req: Request, admin: ReturnType<typeof adminClient>) {
  const workspaceId = (req.headers.get("x-creative-workspace") || "").trim();
  const token = (req.headers.get("x-creative-token") || "").trim();
  if (!/^cs_[A-Za-z0-9_-]{8,64}$/.test(workspaceId) || token.length < 32) {
    throw new Response(JSON.stringify({ error: "WORKSPACE_AUTH_REQUIRED" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const tokenHash = await sha256Hex(token);
  const { data, error } = await admin
    .from("creative_studio_workspaces")
    .select("workspace_id,token_hash,label,metadata")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.token_hash !== tokenHash) {
    throw new Response(JSON.stringify({ error: "WORKSPACE_AUTH_FAILED" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  admin.from("creative_studio_workspaces").update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).then(() => {});
  return data;
}

async function bodyJson(req: Request) {
  try { return await req.json(); } catch { return {}; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    if (req.method === "GET" && (url.searchParams.get("action") === "health" || url.pathname.endsWith("/creative-media"))) {
      return json({ ok: true, service: "creative-media", bucket: BUCKET, version: 1 });
    }
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    const admin = adminClient();
    const body = await bodyJson(req);
    const action = String(body.action || "");
    const workspace = await requireWorkspace(req, admin);
    const workspaceId = workspace.workspace_id;

    if (action === "pair") {
      const [{ count: mediaCount }, { count: snapshotCount }] = await Promise.all([
        admin.from("creative_studio_media").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
        admin.from("creative_studio_snapshots").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      ]);
      return json({ ok: true, workspace: { id: workspaceId, label: workspace.label }, mediaCount: mediaCount || 0, snapshotCount: snapshotCount || 0 });
    }

    if (action === "claim") {
      if (workspace.metadata?.claimed === true) return json({ error: "WORKSPACE_ALREADY_CLAIMED" }, 409);
      const token = randomCapabilityToken();
      const tokenHash = await sha256Hex(token);
      const metadata = { ...(workspace.metadata || {}), claimed: true, claimed_at: new Date().toISOString() };
      const { error } = await admin.from("creative_studio_workspaces").update({ token_hash: tokenHash, metadata, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      return json({ ok: true, workspace: workspaceId, token });
    }

    if (action === "rotate-token") {
      const token = randomCapabilityToken();
      const tokenHash = await sha256Hex(token);
      const metadata = { ...(workspace.metadata || {}), claimed: true, rotated_at: new Date().toISOString() };
      const { error } = await admin.from("creative_studio_workspaces").update({ token_hash: tokenHash, metadata, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      return json({ ok: true, workspace: workspaceId, token });
    }

    if (action === "list") {
      const { data, error } = await admin
        .from("creative_studio_media")
        .select("id,project_id,sig,file_name,content_type,size_bytes,modified_at,storage_path,uses,metadata,status,created_at,updated_at")
        .eq("workspace_id", workspaceId)
        .eq("status", "ACTIVE")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return json({ ok: true, items: data || [] });
    }

    if (action === "signed-upload") {
      const sig = String(body.sig || "");
      const fileName = safeName(String(body.fileName || "file"));
      const projectId = safeName(String(body.projectId || "P01"));
      const contentType = String(body.contentType || "application/octet-stream");
      const sizeBytes = Number(body.sizeBytes || 0);
      if (!sig || !Number.isFinite(sizeBytes) || sizeBytes < 0) return json({ error: "INVALID_UPLOAD_METADATA" }, 400);

      const { data: existing, error: existingError } = await admin
        .from("creative_studio_media")
        .select("id,project_id,sig,file_name,content_type,size_bytes,modified_at,storage_path,uses,metadata,status,updated_at")
        .eq("workspace_id", workspaceId)
        .eq("sig", sig)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing) return json({ ok: true, duplicate: true, item: existing });

      const path = workspaceId + "/" + projectId + "/" + Date.now() + "-" + crypto.randomUUID() + "-" + fileName;
      const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
      if (error) throw new Error(error.message);
      return json({ ok: true, duplicate: false, path, token: data.token, signedUrl: data.signedUrl, contentType });
    }

    if (action === "finalize-upload") {
      const sig = String(body.sig || "");
      const storagePath = String(body.storagePath || "");
      const fileName = String(body.fileName || "");
      const projectId = String(body.projectId || "P01");
      const use = String(body.use || "");
      if (!sig || !storagePath || !fileName) return json({ error: "INVALID_FINALIZE_METADATA" }, 400);
      const now = new Date().toISOString();
      const { data: old, error: oldError } = await admin
        .from("creative_studio_media")
        .select("id,uses")
        .eq("workspace_id", workspaceId)
        .eq("sig", sig)
        .maybeSingle();
      if (oldError) throw new Error(oldError.message);
      const uses = Array.from(new Set([...(Array.isArray(old?.uses) ? old.uses : []), ...(use ? [use] : [])]));
      const row = {
        workspace_id: workspaceId,
        project_id: projectId,
        sig,
        file_name: fileName,
        content_type: String(body.contentType || "application/octet-stream"),
        size_bytes: Number(body.sizeBytes || 0),
        modified_at: body.modifiedAt == null ? null : Number(body.modifiedAt),
        storage_path: storagePath,
        uses,
        metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {},
        status: "ACTIVE",
        updated_at: now,
      };
      const query = old?.id
        ? admin.from("creative_studio_media").update(row).eq("id", old.id).select().single()
        : admin.from("creative_studio_media").insert(row).select().single();
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return json({ ok: true, item: data });
    }

    if (action === "signed-download") {
      let q = admin.from("creative_studio_media").select("*").eq("workspace_id", workspaceId);
      if (body.id) q = q.eq("id", String(body.id)); else if (body.sig) q = q.eq("sig", String(body.sig)); else return json({ error: "MEDIA_ID_REQUIRED" }, 400);
      const { data: item, error: itemError } = await q.maybeSingle();
      if (itemError) throw new Error(itemError.message);
      if (!item) return json({ error: "MEDIA_NOT_FOUND" }, 404);
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(item.storage_path, 900, { download: item.file_name });
      if (error) throw new Error(error.message);
      return json({ ok: true, item, url: data.signedUrl, expiresIn: 900 });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      const { data: item, error: itemError } = await admin.from("creative_studio_media").select("id,storage_path").eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
      if (itemError) throw new Error(itemError.message);
      if (!item) return json({ error: "MEDIA_NOT_FOUND" }, 404);
      const { error: storageError } = await admin.storage.from(BUCKET).remove([item.storage_path]);
      if (storageError) throw new Error(storageError.message);
      const { error: deleteError } = await admin.from("creative_studio_media").delete().eq("workspace_id", workspaceId).eq("id", id);
      if (deleteError) throw new Error(deleteError.message);
      return json({ ok: true });
    }

    if (action === "snapshot-save") {
      const projectId = String(body.projectId || "P01");
      const state = body.state;
      if (!state || typeof state !== "object" || Array.isArray(state)) return json({ error: "INVALID_SNAPSHOT" }, 400);
      const { data: latest, error: latestError } = await admin.from("creative_studio_snapshots").select("version").eq("workspace_id", workspaceId).eq("project_id", projectId).order("version", { ascending: false }).limit(1).maybeSingle();
      if (latestError) throw new Error(latestError.message);
      const version = Number(latest?.version || 0) + 1;
      const { data, error } = await admin.from("creative_studio_snapshots").insert({ workspace_id: workspaceId, project_id: projectId, version, state_json: state }).select("id,version,created_at").single();
      if (error) throw new Error(error.message);
      return json({ ok: true, snapshot: data });
    }

    if (action === "snapshot-latest") {
      const projectId = String(body.projectId || "P01");
      const { data, error } = await admin.from("creative_studio_snapshots").select("id,version,state_json,created_at").eq("workspace_id", workspaceId).eq("project_id", projectId).order("version", { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      return json({ ok: true, snapshot: data || null });
    }

    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("creative-media error", error);
    return json({ error: "SERVER_ERROR", message: error instanceof Error ? error.message : String(error) }, 500);
  }
});