'use client';

import React, { useState } from 'react';
import {
  Star,
  CheckCircle2,
  Sparkles,
  Check,
  X,
  Send,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ComplaintTicket } from '../types';
import { submitEvaluation } from '@/lib/actions/tickets';
import { useLanguage } from '../context/LanguageContext';

interface SatisfactionModalProps {
  ticket: ComplaintTicket | null;
  onClose: () => void;
  onEvaluationCompleted: (updatedTicket: ComplaintTicket) => void;
}

export const SatisfactionModal: React.FC<Readonly<SatisfactionModalProps>> = ({
  ticket,
  onClose,
  onEvaluationCompleted,
}) => {
  const { lang } = useLanguage();
  const [overallScore, setOverallScore] = useState<number>(5);
  const [isResolvedPermanently, setIsResolvedPermanently] = useState<boolean>(true);
  const [feedbackComment, setFeedbackComment] = useState<string>(
    lang === 'en'
      ? 'The assigned officer handled and resolved this issue promptly and professionally.'
      : 'เจ้าหน้าที่ประสานงานแก้ไขปัญหาได้รวดเร็วและเป็นมืออาชีพมากครับ'
  );
  const [improvementSuggestions, setImprovementSuggestions] = useState<string>(
    lang === 'en'
      ? 'Would love to receive simultaneous SMS or direct chat updates in addition to email.'
      : 'อยากให้มีระบบอัปเดตแจ้งเตือนผ่าน SMS หรือ LINE Notify ควบคู่กันไปด้วยครับ'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!ticket) return null;

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    submitEvaluation(ticket.id, {
      overallScore,
      speedRating: overallScore,
      resolutionQualityRating: overallScore,
      serviceMannerRating: overallScore,
      clarityRating: overallScore,
      isResolvedPermanently,
      feedbackComment,
      improvementSuggestions,
    })
      .then((updated) => {
        if (updated) showSuccess(updated);
      })
      .catch((error) => console.error('submitEvaluation failed', error))
      .finally(() => setIsSubmitting(false));
  };

  const showSuccess = (updated: ComplaintTicket) => {
    // Trigger confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.warn('Confetti error', err);
    }

    setIsSuccess(true);
    setTimeout(() => {
      onEvaluationCompleted(updated);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-white/20 p-2 backdrop-blur-xs">
              <Star className="h-5 w-5 fill-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {lang === 'en'
                  ? 'Customer Satisfaction Survey (CSAT)'
                  : 'แบบประเมินความพึงพอใจการให้บริการ (CSAT)'}
              </h3>
              <p className="text-xs text-amber-100">
                {lang === 'en' ? 'Tracking Code: ' : 'รหัสคำร้อง: '}
                {ticket.trackingCode} ({ticket.title.substring(0, 30)}...)
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-csat-modal"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="space-y-3 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">
              {lang === 'en'
                ? 'Thank you for your valuable feedback!'
                : 'ขอบคุณสำหรับทุกข้อเสนอแนะ!'}
            </h4>
            <p className="mx-auto max-w-sm text-xs text-slate-600">
              {lang === 'en'
                ? 'Your rating has been saved and the ticket is now officially closed. Insights will be used for continuous organizational improvement.'
                : 'ระบบได้บันทึกคะแนนความพึงพอใจและปิดเคสเรียบร้อยแล้ว ข้อมูลจะถูกนำไปวิเคราะห์เพื่อพัฒนาคุณภาพองค์กรอย่างต่อเนื่อง'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {/* Overall Satisfaction Rating - Single Rating Metric */}
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/70 to-orange-50/40 px-4 py-3.5 text-center shadow-2xs">
              <div className="mb-1.5 flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
                <label className="block text-xs font-bold tracking-wider text-amber-950 uppercase">
                  {lang === 'en' ? 'Overall Satisfaction' : 'ความพึงพอใจภาพรวมทั้งหมด'}
                </label>
              </div>
              <p className="mb-2.5 text-[11px] text-amber-900/70">
                {lang === 'en'
                  ? 'Please rate your overall experience with the resolution process'
                  : 'กรุณาให้คะแนนความพึงพอใจในภาพรวมต่อกระบวนการรับเรื่องและผลการแก้ไขปัญหา'}
              </p>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    id={`btn-csat-star-${star}`}
                    type="button"
                    onClick={() => setOverallScore(star)}
                    className="cursor-pointer p-1.5 transition duration-150 hover:scale-125"
                    title={`${star} / 5`}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= overallScore
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-xs font-bold text-amber-800">
                {overallScore === 5 &&
                  (lang === 'en' ? '🌟 Very Satisfied (5/5)' : '🌟 ยอดเยี่ยมมาก (5/5)')}
                {overallScore === 4 &&
                  (lang === 'en' ? '👍 Satisfied (4/5)' : '👍 พึงพอใจดี (4/5)')}
                {overallScore === 3 && (lang === 'en' ? '👌 Neutral (3/5)' : '👌 ปานกลาง (3/5)')}
                {overallScore === 2 &&
                  (lang === 'en' ? '👎 Unsatisfied (2/5)' : '👎 ควรปรับปรุง (2/5)')}
                {overallScore === 1 &&
                  (lang === 'en' ? '⚠️ Very Unsatisfied (1/5)' : '⚠️ ไม่พึงพอใจอย่างยิ่ง (1/5)')}
              </p>
            </div>

            {/* Question 1: ปัญหาได้รับการแก้ไข ใช่หรือไม่ (คำตอบมีแค่คำว่า ใช่ และ ไม่ใช่) */}
            <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <label className="block text-xs font-bold text-slate-800">
                {lang === 'en' ? '1. Was the issue resolved?' : '1. ปัญหาได้รับการแก้ไข ใช่หรือไม่'}{' '}
                <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-resolved-yes"
                  onClick={() => setIsResolvedPermanently(true)}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-2xs transition ${
                    isResolvedPermanently
                      ? 'border border-emerald-600 bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>{lang === 'en' ? 'Yes' : 'ใช่'}</span>
                </button>

                <button
                  type="button"
                  id="btn-resolved-no"
                  onClick={() => setIsResolvedPermanently(false)}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-2xs transition ${
                    !isResolvedPermanently
                      ? 'border border-rose-600 bg-rose-600 text-white shadow-xs ring-2 ring-rose-300'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <X className="h-4 w-4" />
                  <span>{lang === 'en' ? 'No' : 'ไม่ใช่'}</span>
                </button>
              </div>
            </div>

            {/* Question 2: ความคิดเห็นเพิ่มเติม */}
            <div className="space-y-1.5">
              <label className="block flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                <span>{lang === 'en' ? '2. Additional Comments' : '2. ความคิดเห็นเพิ่มเติม'}</span>
              </label>
              <textarea
                id="input-csat-comment"
                rows={2}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Share your impressions, officer courtesy, or suggestions for service...'
                    : 'ระบุความประทับใจ การให้บริการของเจ้าหน้าที่ หรือความคิดเห็นเพิ่มเติม...'
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs transition focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Question 3: ข้อเสนอแนะเพื่อการพัฒนาองค์กรอย่างต่อเนื่อง */}
            <div className="space-y-1.5">
              <label className="block flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                <span>
                  {lang === 'en'
                    ? '3. Continuous Improvement Suggestions'
                    : '3. ข้อเสนอแนะเพื่อการพัฒนาองค์กรอย่างต่อเนื่อง'}
                </span>
              </label>
              <textarea
                id="input-csat-improvement"
                rows={2}
                value={improvementSuggestions}
                onChange={(e) => setImprovementSuggestions(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Any ideas to prevent recurrence or improve future organizational workflows?...'
                    : 'ระบุข้อเสนอแนะเพื่อปรับปรุงกระบวนการทำงานและป้องกันปัญหาไม่ให้เกิดขึ้นซ้ำในอนาคต...'
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs transition focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-csat"
                onClick={onClose}
                className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
              >
                {lang === 'en' ? 'Cancel' : 'ยกเลิก'}
              </button>
              <button
                type="submit"
                id="btn-submit-csat"
                disabled={isSubmitting}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-200 transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {lang === 'en'
                    ? 'Submit CSAT & Close Case'
                    : 'ส่งแบบประเมินและปิดเรื่อง (Submit CSAT)'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
