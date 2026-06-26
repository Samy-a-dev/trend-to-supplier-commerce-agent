import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-z0-9_.-]+\.png$/i.test(name)) {
    return NextResponse.json({ error: "Invalid image name" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "data", "images", name);
  const file = await readFile(filePath).catch(() => null);
  if (!file) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  return new Response(file, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=3600"
    }
  });
}
