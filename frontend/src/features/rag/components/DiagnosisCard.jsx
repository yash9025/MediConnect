import PropTypes from "prop-types";
import { getUrgencyConfig } from "../config/uiConfig";

/**
 * Diagnosis Card Component
 * Displays AI-generated diagnosis with urgency level
 */
const DiagnosisCard = ({ analysis }) => {
  const styles = getUrgencyConfig(analysis.urgency);

  return (
    <div className={`relative overflow-hidden rounded-2xl border shadow-lg mb-5 ${styles.bg} ${styles.border} ${styles.glow}`}>
      {/* Gradient Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400" />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-emerald-600">
                <path fillRule="evenodd" d="M3 6a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V6Zm9 1.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75ZM3 13.5a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V13.5Zm9 1.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">AI Diagnosis</h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">Powered by RAG + Gemini</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm uppercase tracking-wider flex items-center gap-1.5 ${styles.badge}`}>
            <span>{styles.icon}</span>
            {analysis.urgency || "Review"}
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">🔬 Detected Condition</label>
            <p className="text-base font-bold text-slate-800 leading-tight">{analysis.condition_suspected || "Analysis Pending"}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-sky-200 transition-all">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">👨‍⚕️ Recommended Specialist</label>
            <p className="text-base font-bold text-sky-600 leading-tight">{analysis.recommended_specialist || "General Physician"}</p>
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">💬 Medical Reasoning</label>
          <p className="text-sm text-slate-600 leading-relaxed">
            {analysis.reasoning || "No detailed reasoning provided."}
          </p>
        </div>
      </div>
    </div>
  );
};

DiagnosisCard.propTypes = {
  analysis: PropTypes.shape({
    urgency: PropTypes.string,
    condition_suspected: PropTypes.string,
    recommended_specialist: PropTypes.string,
    reasoning: PropTypes.string,
  }).isRequired,
};

export default DiagnosisCard;
