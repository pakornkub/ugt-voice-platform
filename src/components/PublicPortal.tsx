'use client';

// components/PublicPortal.tsx — the no-login portal (owner 2026-10-21): /report files a ticket
// without an account (identified = typed by hand, or truly anonymous), /track opens ONE ticket with
// its tracking code + secret. Both reuse the shell's form and tracking modal; the server side is
// lib/actions/tickets.ts:submitPublicTicket + lib/actions/public-tickets.ts.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { KeyRound, Loader2, LogIn, MessageSquareHeart, Search } from 'lucide-react';
import type { ComplaintTicket, EmployeeRecord } from '@/types';
import { useTr } from '@/context/useTr';
import { getPublicTicket, leavePublicTicket, openPublicTicket } from '@/lib/actions/public-tickets';
import { AuthLanguageSwitch } from './AuthLanguageSwitch';
import { EmployeeSubmitForm } from './EmployeeSubmitForm';
import { SatisfactionModal } from './SatisfactionModal';
import { TrackingTimelineModal } from './TrackingTimelineModal';

// ─── Header ───────────────────────────────────────────────────────────────────

export function PortalHeader({ active }: Readonly<{ active: 'report' | 'track' }>) {
  const { tr } = useTr();
  const tab = (isActive: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
    }`;
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <Link href="/report" className="flex items-center gap-2 text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <MessageSquareHeart className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold tracking-tight">UGT VoiceCare</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/report" className={tab(active === 'report')}>
            {tr('Submit', 'ยื่นเรื่อง')}
          </Link>
          <Link href="/track" className={tab(active === 'track')}>
            {tr('Track', 'ติดตามเรื่อง')}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <AuthLanguageSwitch idPrefix="btn-portal-lang" />
          <Link
            href="/login"
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-indigo-700"
          >
            <LogIn className="h-3.5 w-3.5" />
            {tr('Staff sign-in', 'เข้าสู่ระบบเจ้าหน้าที่')}
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Codes filed from this browser (codes only — never the secret) ───────────

const RECENT_CODES_KEY = 'voiceplatform_portal_codes';
const RECENT_CODES_MAX = 5;

const NO_CODES: string[] = [];
let cachedRaw: string | null = null;
let cachedCodes = NO_CODES;

/** Stable snapshot for useSyncExternalStore: re-parsed only when the stored text changed. */
function readRecentCodes(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_CODES_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const parsed: unknown = JSON.parse(raw ?? '[]');
      cachedCodes = Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : NO_CODES;
    }
    return cachedCodes;
  } catch {
    return NO_CODES;
  }
}

const noSubscription = () => () => {};

function rememberCode(code: string) {
  try {
    const codes = [code, ...readRecentCodes().filter((c) => c !== code)].slice(0, RECENT_CODES_MAX);
    localStorage.setItem(RECENT_CODES_KEY, JSON.stringify(codes));
  } catch {
    // private window / storage blocked — the list is a convenience only
  }
}

// ─── /report ──────────────────────────────────────────────────────────────────

const NOBODY: EmployeeRecord = {
  employeeId: '',
  nameTh: '',
  nameEn: '',
  loginEmail: '',
  department: '',
  position: '',
  phone: '',
  status: 'active',
};

export function PortalReport() {
  const router = useRouter();
  return (
    <EmployeeSubmitForm
      portal
      currentEmployee={NOBODY}
      onTicketCreated={(ticket) => rememberCode(ticket.trackingCode)}
      // submitPublicTicket already opened the ticket for this browser (cookie).
      onOpenTracking={() => router.push('/track')}
    />
  );
}

// ─── /track ───────────────────────────────────────────────────────────────────

const REFRESH_MS = 30_000;

export function PortalTrack({
  initialTicket,
}: Readonly<{ initialTicket: ComplaintTicket | null }>) {
  const { tr } = useTr();
  const [ticket, setTicket] = useState(initialTicket);
  const [rating, setRating] = useState<ComplaintTicket | null>(null);
  const [code, setCode] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Server render and hydration see none; the browser reads its list after that.
  const recentCodes = useSyncExternalStore(noSubscription, readRecentCodes, () => NO_CODES);

  // Staff replies show up while the ticket is open (same 30 s as the shell).
  const ticketId = ticket?.id;
  useEffect(() => {
    if (!ticketId) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      getPublicTicket()
        .then((fresh) => fresh && setTicket(fresh))
        .catch(() => {});
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [ticketId]);

  const handleOpen = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!code.trim() || !secret.trim()) {
      setError(tr('Enter the tracking code and the secret.', 'กรอกเลขที่เรื่องและรหัสลับก่อน'));
      return;
    }
    setBusy(true);
    openPublicTicket(code, secret)
      .then((result) => {
        if (result.ok) {
          setTicket(result.ticket);
          setSecret('');
          return;
        }
        setError(
          result.error === 'RATE_LIMITED'
            ? tr(
                'Too many attempts. Please wait 15 minutes and try again.',
                'ลองผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่'
              )
            : tr('The tracking code or secret is incorrect.', 'เลขที่เรื่องหรือรหัสลับไม่ถูกต้อง')
        );
      })
      .catch(() =>
        setError(tr('Something went wrong. Please try again.', 'เกิดข้อผิดพลาด กรุณาลองใหม่'))
      )
      .finally(() => setBusy(false));
  };

  const handleClose = () => {
    setTicket(null);
    leavePublicTicket().catch(() => {});
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none';

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <form
        onSubmit={handleOpen}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Search className="h-5 w-5 text-indigo-600" />
            {tr('Track your ticket', 'ติดตามสถานะเรื่องของคุณ')}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {tr(
              'Use the tracking code and the secret you received when you submitted.',
              'ใช้เลขที่เรื่องและรหัสลับที่ได้รับตอนยื่นเรื่อง'
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-700">
            {tr('Tracking code', 'เลขที่เรื่อง')}
            <input
              id="input-portal-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="TK-2026-0012"
              autoComplete="off"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            {tr('Secret', 'รหัสลับ')}
            <input
              id="input-portal-secret"
              value={secret}
              onChange={(e) => {
                setSecret(e.target.value);
                setError(null);
              }}
              placeholder="K7QM-4XPA"
              autoComplete="off"
              className={`mt-1 ${inputClass}`}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-xs font-medium text-rose-600">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {recentCodes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span>{tr('Filed from this device:', 'เรื่องที่เคยยื่นจากเครื่องนี้:')}</span>
              {recentCodes.map((recent) => (
                <button
                  key={recent}
                  type="button"
                  onClick={() => setCode(recent)}
                  className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-indigo-700 hover:bg-indigo-50"
                >
                  {recent}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          <button
            id="btn-portal-open"
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {tr('Open ticket', 'ดูสถานะ')}
          </button>
        </div>
        <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          {tr(
            'Lost the secret of an anonymous ticket? It cannot be recovered — nobody, staff included, knows who filed it.',
            'ทำรหัสลับของเรื่องแบบไม่ระบุตัวตนหาย จะกู้คืนไม่ได้ เพราะไม่มีใคร (รวมถึงเจ้าหน้าที่) รู้ว่าใครเป็นผู้ยื่น'
          )}
        </p>
      </form>

      {ticket && (
        <TrackingTimelineModal
          ticket={ticket}
          onClose={handleClose}
          onOpenSatisfactionModal={setRating}
          onTicketUpdated={setTicket}
        />
      )}
      {rating && (
        <SatisfactionModal
          ticket={rating}
          onClose={() => setRating(null)}
          onEvaluationCompleted={(updated) => {
            setTicket(updated);
            setRating(null);
          }}
        />
      )}
    </main>
  );
}
