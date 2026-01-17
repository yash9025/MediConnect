/**
 * UI Configuration Constants for RAG System
 * Centralized styling and badge configurations
 */

export const URGENCY_STYLES = {
  HIGH: {
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    bg: "bg-gradient-to-br from-rose-50 to-orange-50",
    border: "border-rose-200",
    icon: "🚨",
    glow: "shadow-rose-100",
  },
  MEDIUM: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    bg: "bg-gradient-to-br from-amber-50 to-yellow-50",
    border: "border-amber-200",
    icon: "⚠️",
    glow: "shadow-amber-100",
  },
  LOW: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    icon: "✅",
    glow: "shadow-emerald-100",
  },
  DEFAULT: {
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    bg: "bg-slate-50",
    border: "border-slate-200",
    icon: "📋",
    glow: "shadow-slate-100",
  },
};

export const REPLY_BADGES = [
  { label: "⚡ Fastest Reply", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "⚡ Fast Reply", style: "bg-sky-50 text-sky-700 border-sky-200" },
  { label: "⏱️ Replies in ~1 hr", style: "bg-slate-50 text-slate-500 border-slate-200" },
];

export const CATEGORY_COLORS = {
  "Diabetes": "bg-purple-100 text-purple-700 border-purple-200",
  "Cardiovascular": "bg-rose-100 text-rose-700 border-rose-200",
  "Hematology": "bg-red-100 text-red-700 border-red-200",
  "Endocrinology": "bg-amber-100 text-amber-700 border-amber-200",
  "Infectious Disease": "bg-green-100 text-green-700 border-green-200",
  "General Medicine": "bg-slate-100 text-slate-700 border-slate-200",
  "General": "bg-slate-100 text-slate-700 border-slate-200",
};

export const getUrgencyConfig = (level) =>
  URGENCY_STYLES[level?.toUpperCase()] || URGENCY_STYLES.DEFAULT;

export const getReplyBadge = (index) =>
  REPLY_BADGES[index] || REPLY_BADGES[2];
