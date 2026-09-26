import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();
const MAX_FILE_BYTES = 2_500_000;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ORIGINS = new Set(["https://www.maksteratelier.com", "https://maksteratelier.com"]);

function value(input, maxLength) {
  return typeof input === "string" ? input.trim().slice(0, maxLength) : "";
}

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    return new URL(origin).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

app.get("/health", (c) => c.json({ ok: true }));

app.options("/enquiry", (c) => {
  const origin = c.req.header("origin") || "";
  if (!isAllowedOrigin(origin)) return c.json({ error: "Invalid origin." }, 403);
  return c.body(null, 204, corsHeaders(origin));
});

app.post("/enquiry", async (c) => {
  const origin = c.req.header("origin") || "";
  if (!isAllowedOrigin(origin)) return c.json({ error: "Invalid origin." }, 403);
  if (!process.env.RESEND_API_KEY) return c.json({ error: "Email service is not configured." }, 503, corsHeaders(origin));

  const form = await c.req.formData();
  if (value(form.get("company"), 100)) return c.json({ ok: true }, 200, corsHeaders(origin));

  const name = value(form.get("name"), 120);
  const contact = value(form.get("contact"), 180);
  const project = value(form.get("project"), 4_000);
  const type = value(form.get("type"), 120);
  const city = value(form.get("city"), 120);
  const language = value(form.get("language"), 10);
  const source = value(form.get("source"), 80);
  if (!name || !contact || !project) return c.json({ error: "Required fields are missing." }, 400, corsHeaders(origin));

  const files = form.getAll("files").filter((item) => item instanceof File && item.size > 0);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (files.length > 3 || totalBytes > MAX_FILE_BYTES || files.some((file) => !ALLOWED_TYPES.has(file.type))) {
    return c.json({ error: "Invalid attachments." }, 400, corsHeaders(origin));
  }

  const attachments = await Promise.all(files.map(async (file) => ({
    filename: file.name.slice(0, 180),
    content: Buffer.from(await file.arrayBuffer()).toString("base64"),
  })));
  const details = [
    `Name: ${name}`,
    `Contact: ${contact}`,
    type && `Project type: ${type}`,
    city && `Place: ${city}`,
    language && `Language: ${language}`,
    source && `Source: ${source}`,
    "",
    "Project:",
    project,
  ].filter(Boolean).join("\n");

  const payload = {
    from: "MAKSTER ATELIER <enquiries@maksteratelier.com>",
    to: ["info@maksteratelier.com"],
    subject: `New enquiry — ${name}`,
    text: details,
    ...(contact.includes("@") ? { reply_to: contact } : {}),
    ...(attachments.length ? { attachments } : {}),
  };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    console.error("Resend enquiry failed", response.status, await response.text());
    return c.json({ error: "Email delivery failed." }, 502, corsHeaders(origin));
  }
  return c.json({ ok: true }, 200, corsHeaders(origin));
});

serve({ fetch: app.fetch, port: Number(process.env.PORT || 3000) });
