/**
 * 화면 섹션(메뉴) 정의 — 사이드바·접근 범위 선택·라우트 가드에서 공통으로 사용한다.
 * key는 접근 관리에서 저장하는 '열람 범위' 값이자 Storage 규칙의 섹션명과 일치한다.
 */
export type SectionKey =
  | "dashboard" | "funding" | "projects" | "compliance" | "budget"
  | "vendors" | "researchers" | "certifications" | "patents" | "library";

export const SECTIONS: { key: SectionKey; href: string; label: string }[] = [
  { key: "dashboard", href: "/", label: "대시보드" },
  { key: "funding", href: "/funding", label: "지원사업 공고" },
  { key: "projects", href: "/projects", label: "과제" },
  { key: "compliance", href: "/compliance", label: "참여율" },
  { key: "budget", href: "/budget", label: "사업비 현황" },
  { key: "vendors", href: "/vendors", label: "거래처" },
  { key: "researchers", href: "/researchers", label: "연구원" },
  { key: "certifications", href: "/certifications", label: "인증·면허" },
  { key: "patents", href: "/patents", label: "특허" },
  { key: "library", href: "/library", label: "자료실" },
];

export const ALL_KEYS: SectionKey[] = SECTIONS.map((s) => s.key);

/** 경로 → 섹션 key (없으면 null). "/"는 dashboard. */
export function sectionForPath(pathname: string): SectionKey | null {
  if (pathname === "/") return "dashboard";
  const f = SECTIONS.find((s) => s.href !== "/" && (pathname === s.href || pathname.startsWith(s.href + "/")));
  return f ? f.key : null;
}

/** href → 섹션 key */
export function sectionForHref(href: string): SectionKey | null {
  return sectionForPath(href);
}
