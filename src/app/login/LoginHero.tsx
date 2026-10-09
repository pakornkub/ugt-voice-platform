'use client';

// Left column of the login page (owner request 2026-10-09, docs/DESIGN.md §10): AI-generated
// illustration (login-hero.webp, Gemini) with the product pitch on a dark indigo gradient.
// Below lg it shrinks to a banner with the heading only.
import Image from 'next/image';
import { ListChecks, LockKeyhole, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useTr } from '@/context/useTr';
import heroImage from './login-hero.webp';

const POINTS: ReadonlyArray<{ icon: LucideIcon; en: string; th: string }> = [
  {
    icon: ShieldCheck,
    en: 'Speak up named, confidential or fully anonymous — your choice',
    th: 'เลือกได้ว่าจะระบุตัวตน ปกปิดเป็นความลับ หรือไม่เปิดเผยตัวตนเลย',
  },
  {
    icon: ListChecks,
    en: 'Follow every step of your case with its tracking code',
    th: 'ติดตามทุกขั้นตอนของเรื่องได้ด้วยรหัสติดตาม',
  },
  {
    icon: LockKeyhole,
    en: 'PDPA-protected — only authorised staff can open your case',
    th: 'คุ้มครองข้อมูลตาม PDPA เฉพาะผู้มีสิทธิ์เท่านั้นที่เปิดดูเรื่องได้',
  },
];

export function LoginHero() {
  const { tr } = useTr();
  return (
    <section
      aria-label={tr('About UGT VoicePlatform', 'เกี่ยวกับ UGT VoicePlatform')}
      className="relative h-56 overflow-hidden bg-indigo-950 sm:h-72 lg:h-auto lg:min-h-screen"
    >
      <Image
        src={heroImage}
        alt={tr(
          'Employees talking together under a protective shield',
          'พนักงานกำลังพูดคุยกันภายใต้โล่ปกป้อง'
        )}
        fill
        priority
        unoptimized
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-950/70 to-transparent lg:via-indigo-950/40" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 text-white sm:p-8 lg:gap-5 lg:p-12">
        <span className="w-fit rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-sm">
          UGT VoicePlatform
        </span>
        <h2 className="max-w-lg text-xl leading-snug font-bold sm:text-2xl lg:text-3xl">
          {tr(
            'Every employee voice, heard safely',
            'ทุกเสียงของพนักงาน ได้รับการรับฟังอย่างปลอดภัย'
          )}
        </h2>
        <p className="hidden max-w-lg text-sm leading-relaxed text-indigo-100 lg:block">
          {tr(
            'The company channel for grievances and suggestions — sent straight to the right team, with every step on record.',
            'ช่องทางยื่นข้อร้องเรียนและข้อเสนอแนะขององค์กร ส่งตรงถึงหน่วยงานที่รับผิดชอบ และบันทึกทุกขั้นตอนการดำเนินงาน'
          )}
        </p>
        <ul className="hidden max-w-lg gap-3 lg:grid">
          {POINTS.map(({ icon: Icon, en, th }) => (
            <li key={en} className="flex items-start gap-3 text-sm text-indigo-50">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="pt-1">{tr(en, th)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
