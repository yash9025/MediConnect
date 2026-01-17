/**
 * RAG Feature Exports
 * Central export point for all RAG-related components, hooks, and utilities
 */

// Main Components
export { default as MedicalChatBot } from './components/MedicalChatBot';
export { default as AIResponseDisplay } from './components/AIResponseDisplay';

// Sub-Components
export { default as ReportSummaryCard } from './components/ReportSummaryCard';
export { default as DiagnosisCard } from './components/DiagnosisCard';
export { default as LifestyleAdviceCard } from './components/LifestyleAdviceCard';
export { default as WarningSignsCard } from './components/WarningSignsCard';
export { default as RAGSourcesCard } from './components/RAGSourcesCard';
export { default as DoctorCard } from './components/DoctorCard';
export { default as EmptyState } from './components/EmptyState';

// Hooks
export { useDoctorAuthorization } from './hooks/useDoctorAuthorization';

// Utils
export { 
  calculateDoctorScore, 
  sortDoctorsByScore,
  getScoreBreakdown 
} from './utils/doctorScoring';

// Config
export { 
  getUrgencyConfig, 
  getReplyBadge,
  URGENCY_STYLES,
  REPLY_BADGES,
  CATEGORY_COLORS
} from './config/uiConfig';
