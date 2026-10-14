import type { ComplaintTicket, UrgencyLevel } from '../types';
import type { Language } from '../context/LanguageContext';

export function getUrgencyBadgeText(urgency: UrgencyLevel, lang: Language) {
  if (lang === 'en') {
    switch (urgency) {
      case 'Low':
        return '🟢 Low';
      case 'Medium':
        return '🟡 Medium';
      case 'High':
        return '🔴 High';
      case 'Critical':
        return '🔥 Critical';
    }
  }
  switch (urgency) {
    case 'Low':
      return '🟢 ปกติ / ทั่วไป (Low)';
    case 'Medium':
      return '🟡 ปานกลาง (Medium)';
    case 'High':
      return '🔴 เร่งด่วน (High)';
    case 'Critical':
      return '🔥 วิกฤติ / ฉุกเฉิน (Critical)';
  }
}

export function getUrgencyColor(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'Low':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    case 'Medium':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'High':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'Critical':
      return 'bg-red-100 text-red-900 border-red-300 font-bold';
  }
}

export function getRiskSeverityBadgeText(risk: ComplaintTicket['riskSeverity'], lang: Language) {
  if (lang === 'en') {
    switch (risk) {
      case 'Low':
        return 'Low Risk';
      case 'Moderate':
        return 'Moderate Risk';
      case 'High':
        return 'High Risk';
      case 'Severe':
        return 'Severe Risk';
    }
  }
  switch (risk) {
    case 'Low':
      return 'เสี่ยงต่ำ (Low)';
    case 'Moderate':
      return 'เสี่ยงปานกลาง (Moderate)';
    case 'High':
      return 'เสี่ยงสูง (High)';
    case 'Severe':
      return 'วิกฤติรุนแรง (Severe)';
  }
}

export function getRiskSeverityColor(risk: ComplaintTicket['riskSeverity']) {
  switch (risk) {
    case 'Low':
      return 'bg-slate-50 text-slate-600 border-slate-200';
    case 'Moderate':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'High':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'Severe':
      return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
  }
}
