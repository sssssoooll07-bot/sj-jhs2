// 접근 관리(Firestore config/access) → Firebase Auth 커스텀 클레임 동기화
//
// 이 프로젝트의 firebasestorage.app 버킷은 Storage 규칙의 cross-service firestore.get이
// 동작하지 않는다. 그래서 뷰어 판별·열람 범위를 '커스텀 클레임'으로 처리하고,
// 이 스크립트가 Firestore 목록을 각 계정의 클레임(viewer, scopes)으로 반영한다.
//
// 실행: GOOGLE_APPLICATION_CREDENTIALS=서비스계정.json  node scripts/sync-viewers.mjs
// (GitHub Actions에서 FIREBASE_SERVICE_ACCOUNT 시크릿으로 주입)

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const OWNER = "sssssoooll07@gmail.com";
const ALL = ["dashboard", "funding", "projects", "compliance", "budget", "vendors", "researchers", "certifications", "patents", "library"];

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) { console.error("GOOGLE_APPLICATION_CREDENTIALS 미설정"); process.exit(1); }
const sa = JSON.parse(readFileSync(keyPath, "utf8"));
initializeApp({ credential: cert(sa) });
const auth = getAuth();
const db = getFirestore();

const normScope = (s) => {
  if (!Array.isArray(s) || s.length === 0 || s.includes("*") || s.length >= ALL.length) return ["*"];
  return s.filter((k) => ALL.includes(k));
};

const snap = await db.collection("config").doc("access").get();
const d = snap.exists ? snap.data() : {};
const viewers = (d.viewers ?? []).map((v) => String(v).toLowerCase());
const scopes = d.scopes ?? {};
const wanted = new Map(); // email → scope[]
for (const em of viewers) wanted.set(em, normScope(scopes[em] ?? scopes[Object.keys(scopes).find((k) => k.toLowerCase() === em)] ?? ["*"]));

let set = 0, cleared = 0, pending = 0;

// 1) 목록의 계정에 클레임 설정
for (const [em, scope] of wanted) {
  try {
    const u = await auth.getUserByEmail(em);
    const cur = u.customClaims ?? {};
    const same = cur.viewer === true && JSON.stringify(cur.scopes ?? ["*"]) === JSON.stringify(scope);
    if (!same) { await auth.setCustomUserClaims(u.uid, { viewer: true, scopes: scope }); set++; console.log("설정:", em, "->", scope); }
    else console.log("유지:", em, "->", scope);
  } catch (e) {
    if (e.code === "auth/user-not-found") { pending++; console.log("대기(로그인 이력 없음):", em); }
    else throw e;
  }
}

// 2) 목록에서 빠진 계정의 viewer 클레임 제거
let pageToken;
do {
  const res = await auth.listUsers(1000, pageToken);
  for (const u of res.users) {
    const em = (u.email ?? "").toLowerCase();
    const cc = u.customClaims ?? {};
    if (cc.viewer && em !== OWNER && !wanted.has(em)) { await auth.setCustomUserClaims(u.uid, null); cleared++; console.log("제거:", u.email); }
  }
  pageToken = res.pageToken;
} while (pageToken);

console.log(`\n동기화 완료 — 설정 ${set} · 제거 ${cleared} · 대기 ${pending}`);
