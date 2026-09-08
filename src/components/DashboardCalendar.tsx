"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDataCtx } from "@/lib/data-context";
import { dateStr } from "@/components/EditableTable";
import { daysUntil, fmtDate, type Data, type ScheduleEvent } from "@/lib/excel";
import { Dday } from "@/components/ui";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const keyOf = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;

type ModalState = { idx: number; date: string; title: string; note: string };

/** 대시보드 전용 월간 캘린더 — 날짜를 클릭해 일정을 적고 D-day로 확인한다(과제와 무관한 개인 일정). */
export default function DashboardCalendar({ data }: { data: Data }) {
  const { saveSheet } = useDataCtx();
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [modal, setModal] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);

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
    () => events.filter((e) => e.date && daysUntil(e.date) >= 0).sort((a, b) => +(a.date ?? 0) - +(b.date ?? 0)),
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

  const monthLabel = `${cur.y}년 ${cur.m + 1}월`;

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mt-0.5 h-4 w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
        <h2 className="text-base font-bold tracking-tight text-slate-800">📅 일정</h2>
        <span className="text-xs text-slate-400">날짜를 클릭해 일정을 적으세요</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setCur((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="이전 달"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[92px] text-center text-sm font-semibold text-slate-700">{monthLabel}</span>
          <button onClick={() => setCur((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="다음 달"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setCur({ y: now.getFullYear(), m: now.getMonth() })} className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">오늘</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-200 text-sm">
        {WD.map((w, i) => (
          <div key={w} className={`bg-slate-50 py-1.5 text-center text-xs font-semibold ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-500"}`}>{w}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-[76px] bg-slate-50/40" />;
          const d = new Date(Date.UTC(cur.y, cur.m, day));
          const k = keyOf(d);
          const isToday = k === todayKey;
          const list = byDay.get(k) ?? [];
          const wd = (startWd + day - 1) % 7;
          return (
            <div key={i} onClick={() => setModal({ idx: -1, date: dateStr(d)!, title: "", note: "" })}
              className="min-h-[76px] cursor-pointer bg-white p-1 transition-colors hover:bg-blue-50/50">
              <div className={`mb-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs font-semibold ${isToday ? "bg-blue-600 text-white" : wd === 0 ? "text-red-500" : wd === 6 ? "text-blue-500" : "text-slate-600"}`}>{day}</div>
              <div className="space-y-0.5">
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

      {/* 다가오는 일정 (D-day) */}
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-slate-500">다가오는 일정</p>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-4 text-center text-xs text-slate-400">등록된 일정이 없습니다. 위 달력에서 날짜를 눌러 추가하세요.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.slice(0, 8).map((e, i) => (
              <li key={i}>
                <button onClick={() => { const idx = events.indexOf(e); setModal({ idx, date: e.date ? dateStr(e.date)! : "", title: e.title, note: e.note ?? "" }); }}
                  className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-50">
                  {e.date && <Dday days={daysUntil(e.date)} />}
                  <span className="min-w-0 flex-1 truncate text-sm">{e.title}{e.note && <span className="ml-1 text-xs text-slate-400">· {e.note}</span>}</span>
                  <span className="whitespace-nowrap text-xs text-slate-400">{fmtDate(e.date)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
