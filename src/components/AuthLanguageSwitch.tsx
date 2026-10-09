'use client';

// components/AuthLanguageSwitch.tsx — the Navbar's TH/EN switch, for the pages that show before
// sign-in (login, first-admin setup): there is no Navbar there, and a first-time English reader
// must be able to switch before doing anything else. Same look as the Navbar's toggle.
import { Globe } from 'lucide-react';
import { useLanguage, type Language } from '@/context/LanguageContext';

const BUTTON_BASE = 'rounded-md px-2 py-1 text-xs font-bold transition';
const BUTTON_ACTIVE = 'bg-white font-black text-indigo-700 shadow-xs ring-1 ring-slate-200/80';
const BUTTON_IDLE = 'text-slate-500 hover:text-slate-900';

function LangButton({
  id,
  target,
  current,
  onSelect,
  title,
}: Readonly<{
  id: string;
  target: Language;
  current: Language;
  onSelect: (lang: Language) => void;
  title: string;
}>) {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={current === target}
      onClick={() => onSelect(target)}
      className={`${BUTTON_BASE} ${current === target ? BUTTON_ACTIVE : BUTTON_IDLE}`}
      title={title}
    >
      {target.toUpperCase()}
    </button>
  );
}

/** `idPrefix` gives the two buttons their ids: `<prefix>-th` and `<prefix>-en`. */
export function AuthLanguageSwitch({ idPrefix }: Readonly<{ idPrefix: string }>) {
  const { lang, setLang } = useLanguage();
  return (
    <fieldset
      aria-label={lang === 'en' ? 'Language' : 'ภาษา'}
      className="m-0 flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs"
    >
      <Globe aria-hidden="true" className="mx-1 h-3.5 w-3.5 text-slate-400" />
      <LangButton
        id={`${idPrefix}-th`}
        target="th"
        current={lang}
        onSelect={setLang}
        title="เปลี่ยนเป็นภาษาไทย (TH)"
      />
      <span className="px-0.5 text-[11px] font-bold text-slate-300 select-none">/</span>
      <LangButton
        id={`${idPrefix}-en`}
        target="en"
        current={lang}
        onSelect={setLang}
        title="Switch to English (EN)"
      />
    </fieldset>
  );
}
