'use client';

// components/MailTemplatesManager.tsx — client half of /admin/mail-templates
// (ugt-nextjs-mail-setup, 2026-09-02). Hand-rolled two-column layout (template
// list left, subject/body form right) + centered overlay preview modal
// (matches TrackingTimelineModal.tsx's pattern, per docs/DESIGN.md §3) — no
// shadcn Sheet/Card/ConfirmActionDialog. Reset confirms via window.confirm(),
// matching this app's existing convention (RolesManager.tsx's handleDelete).
import { useState, useTransition } from 'react';
import { Eye, Loader2, Mail, RotateCcw, X } from 'lucide-react';
import {
  previewMailTemplateAction,
  resetMailTemplateAction,
  saveMailTemplateAction,
} from '@/lib/actions/admin-mail-templates';

export interface MailTemplateItem {
  key: string;
  menu: string;
  label: string;
  description: string;
  variables: string[];
  subject: string;
  html: string;
  defaultSubject: string;
  defaultHtml: string;
  isOverridden: boolean;
}

type Draft = { subject: string; html: string; isOverridden: boolean };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
  FORBIDDEN: 'คุณไม่มีสิทธิ์แก้ไขเทมเพลตอีเมล',
  UNKNOWN_TEMPLATE: 'ไม่พบเทมเพลตนี้ในระบบ',
  SUBJECT_REQUIRED: 'กรุณากรอกหัวข้ออีเมล',
  SUBJECT_TOO_LONG: 'หัวข้ออีเมลยาวเกินไป (สูงสุด 300 ตัวอักษร)',
  BODY_REQUIRED: 'กรุณากรอกเนื้อหาอีเมล',
  BODY_TOO_LONG: 'เนื้อหาอีเมลยาวเกินไป (สูงสุด 20,000 ตัวอักษร)',
  VALIDATION_FAILED: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
};

function errorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? `เกิดข้อผิดพลาด: ${code}`;
}

export function MailTemplatesManager({ items }: Readonly<{ items: MailTemplateItem[] }>) {
  const [selectedKey, setSelectedKey] = useState(items[0]?.key ?? '');
  // draft ต่อ template — เริ่มจากค่า active ที่ server ส่งมา แล้วแก้ใน state นี้
  // (reset รู้ค่า default จาก props จึงไม่ต้อง round-trip)
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.key,
        { subject: item.subject, html: item.html, isOverridden: item.isOverridden },
      ])
    )
  );
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = items.find((item) => item.key === selectedKey);
  const draft = drafts[selectedKey];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!selected || !draft) return null;

  // Captured as locals (not `selected.x` inside the closures below) — TS
  // does not carry the `selected`-is-defined narrowing from this guard into
  // nested `function` closures, only into arrow functions in the same scope.
  const selectedLabel = selected.label;
  const selectedDefaults = { subject: selected.defaultSubject, html: selected.defaultHtml };

  const patchDraft = (patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [selectedKey]: { ...prev[selectedKey], ...patch } }));

  function handleSave() {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await saveMailTemplateAction(selectedKey, {
        subject: draft.subject,
        html: draft.html,
      });
      if (!result.success) {
        setErrorMsg(errorMessage(result.code));
        return;
      }
      patchDraft({ isOverridden: true });
      showToast(`บันทึกเทมเพลต "${selectedLabel}" เรียบร้อยแล้ว`);
    });
  }

  function handlePreview() {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await previewMailTemplateAction(selectedKey, {
        subject: draft.subject,
        html: draft.html,
      });
      if (!result.success) {
        setErrorMsg(errorMessage(result.code));
        return;
      }
      setPreview({ subject: result.subject, html: result.html });
    });
  }

  function handleReset() {
    if (
      !confirm(`ยืนยันการล้างการแก้ไข "${selectedLabel}"? อีเมลจะกลับไปใช้ข้อความเริ่มต้นของระบบ`)
    ) {
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const result = await resetMailTemplateAction(selectedKey);
      if (!result.success) {
        setErrorMsg(errorMessage(result.code));
        return;
      }
      patchDraft({ ...selectedDefaults, isOverridden: false });
      showToast(`ล้างการแก้ไข "${selectedLabel}" กลับเป็นค่าเริ่มต้นแล้ว`);
    });
  }

  // จัดกลุ่มตาม workflow (`menu` ของ definition) — ลำดับตามที่ประกาศไว้
  const groups = new Map<string, MailTemplateItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.menu) ?? [];
    bucket.push(item);
    groups.set(item.menu, bucket);
  }

  return (
    <div className="space-y-4">
      {toastMessage && (
        <div className="animate-in fade-in fixed top-20 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl">
          <Mail className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <nav aria-label="รายการเทมเพลตอีเมล" className="space-y-4">
          {[...groups.entries()].map(([menu, groupItems]) => (
            <div key={menu}>
              <p className="mb-1 px-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                {menu}
              </p>
              <ul className="space-y-0.5">
                {groupItems.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(item.key)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                        item.key === selectedKey
                          ? 'bg-indigo-50 font-semibold text-indigo-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {drafts[item.key]?.isOverridden && (
                        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          แก้ไขแล้ว
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-bold text-slate-900">{selected.label}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{selected.description}</p>
          </div>

          <div className="space-y-4 p-4">
            {errorMsg && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {errorMsg}
              </div>
            )}

            <div>
              <label
                htmlFor="mail-subject"
                className="mb-1 block text-[11px] font-bold text-slate-700"
              >
                หัวข้ออีเมล (Subject) <span className="text-rose-500">*</span>
              </label>
              <input
                id="mail-subject"
                type="text"
                value={draft.subject}
                onChange={(e) => patchDraft({ subject: e.target.value })}
                disabled={isPending}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="mail-html"
                className="mb-1 block text-[11px] font-bold text-slate-700"
              >
                เนื้อหาอีเมล (HTML) <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="mail-html"
                value={draft.html}
                onChange={(e) => patchDraft({ html: e.target.value })}
                disabled={isPending}
                rows={12}
                spellCheck={false}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                ตัวแปรที่ใช้ได้:{' '}
                {selected.variables.map((v) => (
                  <code
                    key={v}
                    className="mr-1 rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-600"
                  >
                    {`{{${v}}}`}
                  </code>
                ))}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                หัวจดหมาย ปุ่ม และข้อความปฏิเสธความรับผิดชอบท้ายอีเมลเป็นส่วนคงที่ —
                ไม่ได้อยู่ในกล่องนี้
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={!draft.isOverridden || isPending}
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                ล้างเป็นค่าเริ่มต้น
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handlePreview}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                ดูตัวอย่าง
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSave}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-70"
              >
                {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview — centered overlay modal (TrackingTimelineModal.tsx's
          pattern), iframe sandboxed so the email HTML's own <style> can never
          leak into this page */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-xs sm:p-6"
          role="presentation"
          onClick={() => setPreview(null)}
        >
          <div
            className="animate-in fade-in zoom-in-95 flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            role="presentation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900">ตัวอย่างอีเมล</h2>
                <p className="truncate text-[11px] text-slate-500">{preview.subject}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              title="ตัวอย่างอีเมล"
              sandbox=""
              srcDoc={preview.html}
              className="min-h-0 w-full flex-1 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
