"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * Firebase 초기화 — 환경변수(NEXT_PUBLIC_FIREBASE_*)가 모두 있을 때만 활성화된다.
 * 설정값이 없으면 null을 반환하고, 서비스는 기존 "파일 선택" 방식으로 동작한다(안전 폴백).
 *
 * 보안: 이 서비스는 '엑셀 마스터 데이터'만 Firebase에 저장한다.
 * 협약서·특허증 원본은 Firebase에 올리지 않고 계속 브라우저 로컬에서만 연다.
 */
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(cfg.apiKey && cfg.projectId && cfg.storageBucket && cfg.appId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

if (firebaseEnabled) {
  app = getApps().length ? getApps()[0] : initializeApp(cfg as Record<string, string>);
  authInstance = getAuth(app);
  storageInstance = getStorage(app);
}

export const auth = authInstance;
export const storage = storageInstance;

/** 마스터 엑셀이 저장되는 Storage 경로 (고정) */
export const MASTER_PATH = "master/신정개발_RLMS_마스터데이터.xlsx";
