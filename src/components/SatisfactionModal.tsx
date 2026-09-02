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
  Send
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
  const [feedbackComment, setFeedbackComment] = useState<string>('เจ้าหน้าที่ประสานงานแก้ไขปัญหาได้รวดเร็วและเป็นมืออาชีพมากครับ');
  const [improvementSuggestions, setImprovementSuggestions] = useState<string>('อยากให้มีระบบอัปเดตแจ้งเตือนผ่าน SMS หรือ LINE Notify ควบคู่กันไปด้วยครับ');
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Star className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                แบบประเมินความพึงพอใจการให้บริการ (CSAT)
              </h3>
              <p className="text-xs text-amber-100">
                รหัสคำร้อง: {ticket.trackingCode} ({ticket.title.substring(0, 30)}...)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">
              ขอบคุณสำหรับทุกข้อเสนอแนะ!
            </h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              ระบบได้บันทึกคะแนนความพึงพอใจและปิดเคสเรียบร้อยแล้ว ข้อมูลจะถูกนำไปวิเคราะห์เพื่อพัฒนาคุณภาพองค์กรอย่างต่อเนื่อง
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* Overall Star Rating */}
            <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                คะแนนความพึงพอใจโดยรวม (Overall Rating)
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallScore(star)}
                    className="p-1 hover:scale-125 transition duration-150"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= overallScore
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-amber-700 mt-2">
                {overallScore === 5 && '🌟 ยอดเยี่ยมมาก (Very Satisfied)'}
                {overallScore === 4 && '👍 พึงพอใจดี (Satisfied)'}
                {overallScore === 3 && '👌 ปานกลาง (Neutral)'}
                {overallScore === 2 && '👎 ควรปรับปรุง (Unsatisfied)'}
                {overallScore === 1 && '⚠️ ไม่พึงพอใจอย่างยิ่ง (Very Unsatisfied)'}
              </p>
            </div>

            {/* Sub-criteria Evaluation */}
            <div className="space-y-3">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                ประเมินรายด้าน (Key Performance Aspects)
              </span>

              {/* Speed */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-medium">1. ความรวดเร็วในการติดต่อกลับและแก้ไข:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSpeedRating(v)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                        speedRating === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Quality */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-medium">2. คุณภาพและความเรียบร้อยในการแก้ปัญหา:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setResolutionQualityRating(v)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                        resolutionQualityRating === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Manners */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-medium">3. ความสุภาพและความเป็นมืออาชีพของเจ้าหน้าที่:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setServiceMannerRating(v)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                        serviceMannerRating === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permanent Fix */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span className="text-slate-700 font-medium">ปัญหาได้รับการแก้ไขอย่างถาวรใช่หรือไม่?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResolvedPermanently(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      isResolvedPermanently ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    ใช่ (ถาวร)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsResolvedPermanently(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      !isResolvedPermanently ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    ชั่วคราว (ต้องติดตาม)
                  </button>
                </div>
              </div>
            </div>

            {/* Qualitative Feedback */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ความคิดเห็นเพิ่มเติมต่อการให้บริการ <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="ระบุความประทับใจ หรือข้อเสนอแนะในการปรับปรุงการบริการ..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ข้อเสนอแนะเพื่อการพัฒนาองค์กรอย่างต่อเนื่อง (Continuous Improvement Idea)
              </label>
              <textarea
                rows={2}
                value={improvementSuggestions}
                onChange={(e) => setImprovementSuggestions(e.target.value)}
                placeholder="มีข้อเสนอแนะเพื่อป้องกันปัญหาไม่ให้เกิดขึ้นซ้ำในอนาคตหรือไม่..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !feedbackComment.trim()}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200 transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ส่งแบบประเมินและปิดเรื่อง (Submit CSAT)</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};