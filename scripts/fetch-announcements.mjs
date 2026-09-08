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
 * JNTP — 사업공고 게시판(www.jntp.or.kr, boardManagementNo=16) HTML 파싱.
 * 구 API(data.jntp.or.kr)는 2026 사이트 개편으로 폐기됨. 새 게시판 목록에는 접수마감일이 없고
 * 첨부문서 안에만 있으므로, 게시일(announcedAt) 기준으로 최근 공고를 수집한다(applyEnd=null).
 * 앱은 마감일이 없는 항목을 '게시 30일 이내'면 접수중으로 간주해 표시한다.
 * 열: 번호 / 공고명 / 기관 / 게시일 / 조회수
 */
async function fetchJNTP() {
  const BASE = "https://www.jntp.or.kr";
  const LIST = `${BASE}/base/board/list?boardManagementNo=16&menuLevel=2&menuNo=60`;
  // 채용·행정 등 지원사업이 아닌 게시글 제외
  const EXCLUDE = /(채용|합격|불합격|면접|발표|낙찰|입찰|정기총회|워크숍|설명회|간담회|공청회|폐기|매각)/;
  const res = await fetch(LIST, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`JNTP 목록 HTTP ${res.status}`);
  const html = await res.text();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const items = [];
  for (const row of rows) {
    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => clean(x[1]));
    if (tds.length < 5) continue;
    if (!/^\d+$/.test(tds[0])) continue; // 실제 게시글(번호 숫자)만 — 상단 공지/헤더 제외
    const title = tds[1].replace(/\s*N\s*ew\s*$/i, "").trim();
    if (!title || EXCLUDE.test(title)) continue;
    const boardNo = row.match(/boardNo=(\d+)/)?.[1];
    if (!boardNo) continue;
    const dm = tds[3].match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/);
    const announcedAt = dm ? `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}` : null;
    items.push({
      source: "JNTP",
      agency: tds[2] || "전남테크노파크",
      title,
      category: null,
      summary: null,
      applyStart: null,
      applyEnd: null,
      announcedAt,
      url: `${BASE}/base/board/read?boardManagementNo=16&boardNo=${boardNo}&menuLevel=2&menuNo=60`,
    });
  }
  if (items.length === 0) throw new Error("JNTP 목록 파싱 0건 — 게시판(bm=16) 구조 변경 여부 확인");
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
