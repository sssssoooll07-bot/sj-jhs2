import { NextResponse } from "next/server";
import { readdirSync, readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * 로컬 개발 편의 전용 — 개발 머신의 data/ 폴더에 있는 엑셀을 브라우저에 전달한다.
 * 보안: Vercel(운영)에서는 항상 404 — VERCEL 환경변수 가드 + data/는 .gitignore라 배포물에 존재하지도 않는다.
 */
export async function GET() {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  try {
    const dir = path.join(process.cwd(), "data");
    const file = readdirSync(dir).find((f) => f.endsWith(".xlsx"));
    if (!file) return NextResponse.json({ error: "no file" }, { status: 404 });
    const buf = readFileSync(path.join(dir, file));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "x-file-name": encodeURIComponent(file),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "no file" }, { status: 404 });
  }
}
