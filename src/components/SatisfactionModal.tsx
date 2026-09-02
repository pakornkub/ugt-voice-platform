'use client';

import React, { useState } from 'react';
import {
  Star,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Heart,
  ThumbsUp,
  X,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ComplaintTicket, SatisfactionEvaluation } from '../types';
import { submitEvaluation } from '../services/api';

interface SatisfactionModalProps {
  ticket: ComplaintTicket | null;
  onClose: () => void;
  onEvaluationCompleted: (updatedTicket: ComplaintTicket) => void;
}

export const SatisfactionModal: React.FC<SatisfactionModalProps> = ({
  ticket,
  onClose,
  onEvaluationCompleted,
}) => {
  const [overallScore, setOverallScore] = useState<number>(5);
  const [speedRating, setSpeedRating] = useState<number>(5);
  const [resolutionQualityRating, setResolutionQualityRating] = useState<number>(5);
  const [serviceMannerRating, setServiceMannerRating] = useState<number>(5);
  const [clarityRating, setClarityRating] = useState<number>(5);
  const [isResolvedPermanently, setIsResolvedPermanently] = useState<boolean>(true);
  const [feedbackComment, setFeedbackComment] = useState<string>(
    'เจ้าหน้าที่ประสานงานแก้ไขปัญหาได้รวดเร็วและเป็นมืออาชีพมากครับ'
  );
  const [improvementSuggestions, setImprovementSuggestions] = useState<string>(
    'อยากให้มีระบบอัปเดตแจ้งเตือนผ่าน SMS หรือ LINE Notify ควบคู่กันไปด้วยครับ'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!ticket) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updated = submitEvaluation(ticket.id, {
      overallScore,
      speedRating,
      resolutionQualityRating,
      serviceMannerRating,
      clarityRating,
      isResolvedPermanently,
      feedbackComment,
      improvementSuggestions,
    });

    if (updated) {
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
    }
    setIsSubmitting(false);
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
              <h3 className="text-base font-bold">แบบประเมินความพึงพอใจการให้บริการ (CSAT)</h3>
              <p className="text-xs text-amber-100">
                รหัสคำร้อง: {ticket.trackingCode} ({ticket.title.substring(0, 30)}...)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="space-y-3 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">ขอบคุณสำหรับทุกข้อเสนอแนะ!</h4>
            <p className="mx-auto max-w-sm text-xs text-slate-600">
              ระบบได้บันทึกคะแนนความพึงพอใจและปิดเคสเรียบร้อยแล้ว
              ข้อมูลจะถูกนำไปวิเคราะห์เพื่อพัฒนาคุณภาพองค์กรอย่างต่อเนื่อง
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {/* Overall Star Rating */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 py-2 text-center">
              <label className="mb-2 block text-xs font-bold tracking-wider text-slate-700 uppercase">
                คะแนนความพึงพอใจโดยรวม (Overall Rating)
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallScore(star)}
                    className="p-1 transition duration-150 hover:scale-125"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= overallScore ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold text-amber-700">
                {overallScore === 5 && '🌟 ยอดเยี่ยมมาก (Very Satisfied)'}
                {overallScore === 4 && '👍 พึงพอใจดี (Satisfied)'}
                {overallScore === 3 && '👌 ปานกลาง (Neutral)'}
                {overallScore === 2 && '👎 ควรปรับปรุง (Unsatisfied)'}
                {overallScore === 1 && '⚠️ ไม่พึงพอใจอย่างยิ่ง (Very Unsatisfied)'}
              </p>
            </div>

            {/* Sub-criteria Evaluation */}
            <div className="space-y-3">
              <span className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                ประเมินรายด้าน (Key Performance Aspects)
              </span>

              {/* Speed */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  1. ความรวดเร็วในการติดต่อกลับและแก้ไข:
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSpeedRating(v)}
                      className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                        speedRating === v
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Quality */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  2. คุณภาพและความเรียบร้อยในการแก้ปัญหา:
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setResolutionQualityRating(v)}
                      className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                        resolutionQualityRating === v
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Manners */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  3. ความสุภาพและความเป็นมืออาชีพของเจ้าหน้าที่:
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setServiceMannerRating(v)}
                      className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                        serviceMannerRating === v
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permanent Fix */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-xs">
                <span className="font-medium text-slate-700">
                  ปัญหาได้รับการแก้ไขอย่างถาวรใช่หรือไม่?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResolvedPermanently(true)}
                    className={`rounded-lg border px-3 py-1 text-xs font-bold transition ${
                      isResolvedPermanently
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    ใช่ (ถาวร)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsResolvedPermanently(false)}
                    className={`rounded-lg border px-3 py-1 text-xs font-bold transition ${
                      !isResolvedPermanently
                        ? 'border-rose-600 bg-rose-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    ชั่วคราว (ต้องติดตาม)
                  </button>
                </div>
              </div>
            </div>

            {/* Qualitative Feedback */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                ความคิดเห็นเพิ่มเติมต่อการให้บริการ <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="ระบุความประทับใจ หรือข้อเสนอแนะในการปรับปรุงการบริการ..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                ข้อเสนอแนะเพื่อการพัฒนาองค์กรอย่างต่อเนื่อง (Continuous Improvement Idea)
              </label>
              <textarea
                rows={2}
                value={improvementSuggestions}
                onChange={(e) => setImprovementSuggestions(e.target.value)}
                placeholder="มีข้อเสนอแนะเพื่อป้องกันปัญหาไม่ให้เกิดขึ้นซ้ำในอนาคตหรือไม่..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !feedbackComment.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-200 transition hover:bg-amber-600"
              >
                <Send className="h-3.5 w-3.5" />
                <span>ส่งแบบประเมินและปิดเรื่อง (Submit CSAT)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
