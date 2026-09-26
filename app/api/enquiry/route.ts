import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 2_500_000;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function text(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const host = new URL(origin).hostname;
    const allowed = host === "www.maksteratelier.com"
      || host === "maksteratelier.com"
      || host.endsWith(".vercel.app");
    if (!allowed) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const form = await request.formData();
  if (text(form.get("company"), 100)) {
    return NextResponse.json({ ok: true });
  }

  const name = text(form.get("name"), 120);
  const contact = text(form.get("contact"), 180);
  const project = text(form.get("project"), 4_000);
  const type = text(form.get("type"), 120);
  const city = text(form.get("city"), 120);
  const language = text(form.get("language"), 10);
  const source = text(form.get("source"), 80);

  if (!name || !contact || !project) {
    return NextResponse.json({ error: "Required fields are missing." }, { status: 400 });
  }

  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (files.length > 3 || totalBytes > MAX_FILE_BYTES || files.some((file) => !ALLOWED_TYPES.has(file.type))) {
    return NextResponse.json({ error: "Invalid attachments." }, { status: 400 });
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

  const payload: Record<string, unknown> = {
    from: "MAKSTER ATELIER <enquiries@maksteratelier.com>",
    to: ["info@maksteratelier.com"],
    subject: `New enquiry — ${name}`,
    text: details,
  };
  if (isEmail(contact)) payload.reply_to = contact;
  if (attachments.length) payload.attachments = attachments;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("Resend enquiry failed", response.status, await response.text());
    return NextResponse.json({ error: "Email delivery failed." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
