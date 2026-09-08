"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDataCtx } from "@/lib/data-context";
import { dateStr } from "@/components/EditableTable";
import { daysUntil, fmtDate, type Data, type ScheduleEvent } from "@/lib/excel";
import { Dday } from "@/components/ui";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const keyOf = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
const iso = (y: number, m: number, day: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// 대한민국 공휴일 (2025~2027 · 음력·대체공휴일 포함). 연도별로 갱신 가능.
const HOLIDAYS: Record<string, string> = {
  "2025-01-01": "신정", "2025-01-27": "임시공휴일", "2025-01-28": "설날", "2025-01-29": "설날", "2025-01-30": "설날",
  "2025-03-01": "삼일절", "2025-03-03": "대체공휴일", "2025-05-05": "어린이날·석가탄신일", "2025-05-06": "대체공휴일",
  "2025-06-06": "현충일", "2025-08-15": "광복절", "2025-10-03": "개천절", "2025-10-05": "추석", "2025-10-06": "추석",
  "2025-10-07": "추석", "2025-10-08": "대체공휴일", "2025-10-09": "한글날", "2025-12-25": "성탄절",
  "2026-01-01": "신정", "2026-02-16": "설날", "2026-02-17": "설날", "2026-02-18": "설날", "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일", "2026-05-05": "어린이날", "2026-05-24": "석가탄신일", "2026-05-25": "대체공휴일",
  "2026-06-06": "현충일", "2026-08-15": "광복절", "2026-08-17": "대체공휴일", "2026-09-24": "추석", "2026-09-25": "추석",
  "2026-09-26": "추석", "2026-09-28": "대체공휴일", "2026-10-03": "개천절", "2026-10-05": "대체공휴일", "2026-10-09": "한글날",
  "2026-12-25": "성탄절",
  "2027-01-01": "신정", "2027-02-06": "설날", "2027-02-07": "설날", "2027-02-08": "설날", "2027-02-09": "대체공휴일",
  "2027-03-01": "삼일절", "2027-05-05": "어린이날", "2027-05-13": "석가탄신일", "2027-06-06": "현충일",
  "2027-08-15": "광복절", "2027-08-16": "대체공휴일", "2027-09-14": "추석", "2027-09-15": "추석", "2027-09-16": "추석",
  "2027-10-03": "개천절", "2027-10-04": "대체공휴일", "2027-10-09": "한글날", "2027-10-11": "대체공휴일", "2027-12-25": "성탄절",
};

type ModalState = { idx: number; date: string; title: string; note: string };

/** 대시보드 전용 월간 캘린더 — 날짜 클릭으로 일정 입력, 공휴일 표시, D-day 확인. */
export default function DashboardCalendar({ data }: { data: Data }) {
  const { saveSheet } = useDataCtx();
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [modal, setModal] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);

  const events = data.events;
  const byDay = useMemo(() => {
    const m = new Map<string, { ev: ScheduleEvent; idx: number }[]>();
    events.forEach((ev, idx) => {
      if (!ev.date) return;
      const k = keyOf(ev.date);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push({ ev, idx });
    });
    return m;
  }, [events]);

  const first = new Date(Date.UTC(cur.y, cur.m, 1));
  const startWd = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(cur.y, cur.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(startWd).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const todayKey = keyOf(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));

  const upcoming = useMemo(
    () => events.filter((e) => e.date && daysUntil(e.date) >= 0 && daysUntil(e.date) <= 14).sort((a, b) => +(a.date ?? 0) - +(b.date ?? 0)),
    [events],
  );

  async function persist(list: ScheduleEvent[]) {
    setSaving(true);
    try {
      await saveSheet("일정", list.map((e) => ({ 일자: dateStr(e.date), 내용: e.title, 비고: e.note })));
      setModal(null);
    } catch {
      /* 오류는 데이터 컨텍스트가 표시 */
    } finally {
      setSaving(false);
    }
  }
  function commit() {
    if (!modal || !modal.title.trim() || !modal.date) return;
    const ev: ScheduleEvent = { date: new Date(modal.date + "T00:00:00Z"), title: modal.title.trim(), note: modal.note.trim() || null };
    persist(modal.idx < 0 ? [...events, ev] : events.map((x, i) => (i === modal.idx ? ev : x)));
  }
  function remove() {
    if (!modal || modal.idx < 0) return;
    persist(events.filter((_, i) => i !== modal.idx));
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mt-0.5 h-4 w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
        <h2 className="text-base font-bold tracking-tight text-slate-800">📅 일정</h2>
        <span className="text-xs text-slate-400">날짜를 클릭해 일정을 적으세요</span>
        <div className="relative ml-auto flex items-center gap-1">
          <button onClick={() => setCur((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="이전 달"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setPicker((p) => !p)} className="min-w-[96px] rounded-lg px-2 py-1 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100">{cur.y}년 {cur.m + 1}월 ▾</button>
          <button onClick={() => setCur((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="다음 달"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => { setCur({ y: now.getFullYear(), m: now.getMonth() }); setPicker(false); }} className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">오늘</button>
          {picker && (
            <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <button onClick={() => setCur((c) => ({ ...c, y: c.y - 1 }))} className="rounded p-1 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-sm font-bold text-slate-700">{cur.y}년</span>
                <button onClick={() => setCur((c) => ({ ...c, y: c.y + 1 }))} className="rounded p-1 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <button key={i} onClick={() => { setCur((c) => ({ ...c, m: i })); setPicker(false); }}
                    className={`rounded-lg py-1.5 text-xs font-medium ${cur.m === i ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{i + 1}월</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 캘린더 (2/3) */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-200 text-sm">
            {WD.map((w, i) => (
              <div key={w} className={`bg-slate-50 py-1.5 text-center text-xs font-semibold ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-500"}`}>{w}</div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="min-h-[72px] bg-slate-50/40" />;
              const d = new Date(Date.UTC(cur.y, cur.m, day));
              const k = keyOf(d);
              const isToday = k === todayKey;
              const wd = (startWd + day - 1) % 7;
              const hol = HOLIDAYS[iso(cur.y, cur.m, day)];
              const isRed = wd === 0 || !!hol;
              const list = byDay.get(k) ?? [];
              return (
                <div key={i} onClick={() => setModal({ idx: -1, date: dateStr(d)!, title: "", note: "" })}
                  className="min-h-[72px] cursor-pointer bg-white p-1 transition-colors hover:bg-blue-50/50">
                  <div className="flex items-center gap-1">
                    <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs font-semibold ${isToday ? "bg-blue-600 text-white" : isRed ? "text-red-500" : wd === 6 ? "text-blue-500" : "text-slate-600"}`}>{day}</span>
                    {hol && <span className="truncate text-[10px] font-medium text-red-500">{hol}</span>}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {list.map(({ ev, idx }) => (
                      <button key={idx} onClick={(e) => { e.stopPropagation(); setModal({ idx, date: ev.date ? dateStr(ev.date)! : "", title: ev.title, note: ev.note ?? "" }); }}
                        className="block w-full truncate rounded bg-blue-100 px-1 py-0.5 text-left text-[11px] font-medium text-blue-800 hover:bg-blue-200" title={ev.title}>
                        {ev.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 다가오는 일정 (1/3) */}
        <div className="lg:col-span-1">
          <p className="mb-1.5 text-xs font-semibold text-slate-500">다가오는 일정 <span className="font-normal text-slate-400">(D-14 이내)</span></p>
          {upcoming.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-6 text-center text-xs text-slate-400">2주 내 예정된 일정이 없습니다.<br />달력에서 날짜를 눌러 추가하세요.</p>
          ) : (
            <ul className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
              {upcoming.map((e, i) => (
                <li key={i}>
                  <button onClick={() => { const idx = events.indexOf(e); setModal({ idx, date: e.date ? dateStr(e.date)! : "", title: e.title, note: e.note ?? "" }); }}
                    className="flex w-full flex-col gap-0.5 px-2.5 py-2 text-left hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      {e.date && <Dday days={daysUntil(e.date)} />}
                      <span className="whitespace-nowrap text-[11px] text-slate-400">{fmtDate(e.date)}</span>
                    </div>
                    <span className="truncate text-sm text-slate-700">{e.title}</span>
                    {e.note && <span className="truncate text-[11px] text-slate-400">{e.note}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modal && <EventModal modal={modal} setModal={setModal} saving={saving} onSave={commit} onDelete={remove} />}
    </section>
  );
}

function EventModal({ modal, setModal, saving, onSave, onDelete }: {
  modal: ModalState; setModal: (m: ModalState | null) => void; saving: boolean; onSave: () => void; onDelete: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      else if (e.key === "Enter" && !saving && modal.title.trim() && modal.date) { e.preventDefault(); onSave(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal, saving, onSave, setModal]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <p className="mb-3 text-sm font-bold text-slate-800">{modal.idx < 0 ? "일정 추가" : "일정 수정"}</p>
        <label className="mb-1 block text-xs font-medium text-slate-500">날짜</label>
        <input type="date" value={modal.date} onChange={(e) => setModal({ ...modal, date: e.target.value })} className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <label className="mb-1 block text-xs font-medium text-slate-500">내용</label>
        <input autoFocus value={modal.title} onChange={(e) => setModal({ ...modal, title: e.target.value })} placeholder="예: 성장사다리 중간점검" className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <label className="mb-1 block text-xs font-medium text-slate-500">비고 (선택)</label>
        <input value={modal.note} onChange={(e) => setModal({ ...modal, note: e.target.value })} className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="flex items-center gap-2">
          <button onClick={onSave} disabled={saving || !modal.title.trim() || !modal.date} className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "저장 중…" : "저장"}</button>
          {modal.idx >= 0 && <button onClick={onDelete} disabled={saving} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">삭제</button>}
          <button onClick={() => setModal(null)} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">취소</button>
        </div>
      </div>
    </div>
  );
}
