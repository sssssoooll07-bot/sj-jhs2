/**
 * 공고 자동 수집 — JNTP(전남테크노파크) + SMTECH(중소기업 기술개발사업).
 * GitHub Actions가 매일 08:00 KST에 실행해 public/announcements.json을 갱신한다.
 * 공개 공고 정보만 수집·저장한다(기업 내부 데이터 아님). 실패한 출처는 건너뛰고 나머지는 유지한다.
 *
 *   node scripts/fetch-announcements.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "announcements.json");
const UA = "Mozilla/5.0 (compatible; SJ-RLMS-Lite/1.0; +https://sjdevel.com)";

const clean = (s) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * JNTP — 전남테크노파크 공고. 소스: pms.jntp.or.kr/ko/sub02/sub0202 (사업공고 목록, 페이지네이션).
 * 항목: .table_box_wrap — pageViewGo('A20xx-xxxxxx'), 제목, 접수기간, 등록일, 배지(R&D·접수중).
 * 상세: ?mode=view&bisProjAnnceIdx=<공고번호>.
 */
async function fetchJNTP() {
  const LIST = "https://pms.jntp.or.kr/ko/sub02/sub0202";
  const H = { "User-Agent": UA };
  const seen = new Set();
  const items = [];

  const parse = (html) => {
    for (const b of html.split('class="table_box_wrap"').slice(1)) {
      const idx = b.match(/pageViewGo\(['"](A\d{4}-\d{6})['"]\)/)?.[1] || b.match(/공고번호<\/span>\s*<span class="value">\s*([A-Z0-9-]+)/)?.[1];
      const title = clean((b.match(/<span class="title">([\s\S]*?)<\/span>/) || [])[1] || "");
      if (!idx || !title || seen.has(idx)) continue;
      seen.add(idx);
      const period = (b.match(/접수기간<\/span>\s*<span class="value">\s*([^<]+)</) || [])[1] || "";
      const dm = [...period.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)].map((m) => `${m[1]}-${m[2]}-${m[3]}`);
      const reg = (b.match(/등록일<\/span>\s*<span class="value">\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
      const badges = [...b.matchAll(/<span class="badge-board[^"]*">\s*([^<]+?)\s*<\/span>/g)].map((m) => clean(m[1]));
      const category = badges.find((x) => !/(접수중|접수마감|마감|예정|종료|^D[-+])/.test(x)) || "공고";
      items.push({
        source: "JNTP", agency: "전남테크노파크", title, category, summary: null,
        applyStart: dm[0] ?? null, applyEnd: dm[1] ?? null, announcedAt: reg ?? dm[0] ?? null,
        url: `${LIST}?mode=view&bisProjAnnceIdx=${idx}`,
      });
    }
  };

  const first = await fetch(`${LIST}?nowPage=1`, { headers: H });
  if (!first.ok) throw new Error(`HTTP ${first.status}`);
  const firstHtml = await first.text();
  const pageTotal = Math.min(parseInt((firstHtml.match(/id="page-total">\s*(\d+)/) || [])[1] || "1", 10) || 1, 10);
  parse(firstHtml);
  for (let p = 2; p <= pageTotal; p++) {
    try {
      const r = await fetch(`${LIST}?nowPage=${p}`, { headers: H });
      if (r.ok) parse(await r.text());
    } catch { /* 해당 페이지 스킵 */ }
  }
  if (items.length === 0) throw new Error("JNTP(pms) 파싱 0건 — 구조 변경 확인");
  return items;
}

/** SMTECH — 사업공고 목록 HTML 파싱. 열: 번호/출처/사업명/공고명/접수기간/공고일 */
async function fetchSMTECH() {
  const res = await fetch("https://www.smtech.go.kr/front/ifg/no/notice02_list.do", {
    headers: { "User-Agent": UA },
  });
  const html = await res.text();
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? [];
  const items = [];
  for (const row of rows) {
    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => clean(m[1]));
    if (tds.length < 6) continue;
    const href = row.match(/href="([^"]*notice02_detail\.do[^"]*)"/)?.[1];
    if (!href) continue;
    const url =
      "https://www.smtech.go.kr" +
      clean(href).replace(/;jsessionid=[^?]*/, "").replace(/&amp;/g, "&");
    const [, sourceOrg, program, title, period, announced] = tds;
    const dates = period.match(/\d{4}\s*[.\-]\s*\d{1,2}\s*[.\-]\s*\d{1,2}/g)?.map((d) => {
      const [y, m, dd] = d.split(/[.\-]/).map((x) => x.trim());
      return `${y}-${m.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    });
    items.push({
      source: "SMTECH",
      agency: sourceOrg || "중소기업기술정보진흥원",
      title,
      category: program || null,
      summary: null,
      applyStart: dates?.[0] ?? null,
      applyEnd: dates?.[1] ?? null,
      announcedAt: announced?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
      url,
    });
  }
  if (items.length === 0) throw new Error("SMTECH 목록 파싱 결과 0건 — 페이지 구조 변경 여부 확인 필요");
  return items;
}

async function main() {
  let prev = { items: [] };
  try {
    prev = JSON.parse(readFileSync(OUT, "utf-8"));
  } catch { /* 최초 실행 */ }

  const results = { JNTP: null, SMTECH: null };
  const errors = [];
  for (const [name, fn] of [["JNTP", fetchJNTP], ["SMTECH", fetchSMTECH]]) {
    try {
      results[name] = await fn();
      console.log(`${name}: ${results[name].length}건 수집`);
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
      // 실패한 출처는 이전 수집분 유지 (한 출처 장애가 전체를 비우지 않게)
      results[name] = prev.items?.filter((i) => i.source === name) ?? [];
      console.error(`${name} 수집 실패 — 이전 데이터 유지 (${results[name].length}건):`, e.message);
    }
  }

  const seen = new Set();
  const items = [...results.JNTP, ...results.SMTECH]
    .filter((i) => i.title)
    .filter((i) => {
      const key = i.url || `${i.source}|${i.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.applyEnd ?? "9999") < (b.applyEnd ?? "9999") ? -1 : 1);

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        sources: [
          { name: "전남테크노파크 (JNTP)", url: "https://pms.jntp.or.kr/ko/sub02/sub0202" },
          { name: "SMTECH 사업공고", url: "https://www.smtech.go.kr/front/ifg/no/notice02_list.do" },
        ],
        errors: errors.length ? errors : undefined,
        items,
      },
      null,
      1
    ),
    "utf-8"
  );
  console.log(`총 ${items.length}건 → public/announcements.json${errors.length ? ` (경고: ${errors.join(" / ")})` : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
