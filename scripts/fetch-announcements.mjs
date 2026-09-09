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
 * JNTP — 전남테크노파크 공고.
 *  (1) 지역사업공고: /base/apiAnnouncement/List (menuNo=45) — 접수기간·상태(접수중) 제공, 상세는 pms.jntp.or.kr
 *  (2) 정부사업공고: /base/board/list?boardManagementNo=13 (menuNo=46) — 게시일 기준
 * 한 소스가 실패해도 나머지는 반영한다(둘 다 0건일 때만 에러 → 이전 수집분 유지).
 */
async function fetchJNTP() {
  const BASE = "https://www.jntp.or.kr";
  const H = { "User-Agent": UA };
  const items = [];
  const errs = [];

  // (1) 지역사업공고 — 접수기간/상태 있음
  try {
    const res = await fetch(`${BASE}/base/apiAnnouncement/List?menuLevel=2&menuNo=45`, { headers: H });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => clean(x[1]));
      if (tds.length < 4 || !/^\d+$/.test(tds[0])) continue; // 번호 있는 실제 행만
      const title = tds[1];
      if (!title) continue;
      const dm = [...(tds[2] || "").matchAll(/(\d{4})-(\d{2})-(\d{2})/g)].map((m) => `${m[1]}-${m[2]}-${m[3]}`);
      const href = (row.match(/href="([^"]+)"/)?.[1] || "").replace(/&amp;/g, "&");
      items.push({
        source: "JNTP", agency: "전남테크노파크", title, category: "지역사업", summary: null,
        applyStart: dm[0] ?? null, applyEnd: dm[1] ?? null, announcedAt: dm[0] ?? null,
        url: href || `${BASE}/base/apiAnnouncement/List?menuLevel=2&menuNo=45`,
      });
    }
  } catch (e) { errs.push(`지역:${e.message}`); }

  // (2) 정부사업공고 — 게시일 기준 (접수마감일은 목록에 없음)
  try {
    const res = await fetch(`${BASE}/base/board/list?boardManagementNo=13&menuLevel=2&menuNo=46`, { headers: H });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const EXCLUDE = /(채용|합격|불합격|면접|발표|낙찰|입찰|정기총회|워크숍|설명회|간담회|공청회|폐기|매각)/;
    for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => clean(x[1]));
      if (tds.length < 5) continue;
      const title = tds[2];
      const boardNo = row.match(/boardNo=(\d+)/)?.[1];
      if (!title || !boardNo || EXCLUDE.test(title)) continue;
      const dm = tds[4].match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/);
      items.push({
        source: "JNTP", agency: "전남테크노파크", title, category: tds[1] || "정부사업", summary: null,
        applyStart: null, applyEnd: null,
        announcedAt: dm ? `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}` : null,
        url: `${BASE}/base/board/read?boardManagementNo=13&boardNo=${boardNo}&menuLevel=2&menuNo=46`,
      });
    }
  } catch (e) { errs.push(`정부:${e.message}`); }

  if (items.length === 0) throw new Error(`JNTP 파싱 0건 (${errs.join(" / ") || "구조 변경 확인"})`);
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
          { name: "전남테크노파크 (JNTP)", url: "https://data.jntp.or.kr/jntp/content/business/announcement/list.jsp" },
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
