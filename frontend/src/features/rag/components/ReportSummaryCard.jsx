import PropTypes from "prop-types";

/**
 * Report Summary Card Component
 * Displays patient name and test statistics
 */
const ReportSummaryCard = ({ patientName, abnormalCount, totalTests }) => (
  <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-xl">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500 rounded-full blur-3xl"></div>
    </div>
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Lab Report Analysis</p>
          <h3 className="text-lg font-bold text-white">{patientName || "Patient Report"}</h3>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10">
          <p className="text-2xl font-black text-white">{totalTests}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Tests</p>
        </div>
        <div className="bg-emerald-500/20 backdrop-blur rounded-xl p-3 text-center border border-emerald-500/30">
          <p className="text-2xl font-black text-emerald-400">{totalTests - abnormalCount}</p>
          <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Normal</p>
        </div>
        <div className={`backdrop-blur rounded-xl p-3 text-center border ${abnormalCount > 0 ? 'bg-rose-500/20 border-rose-500/30' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
          <p className={`text-2xl font-black ${abnormalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{abnormalCount}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${abnormalCount > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>Abnormal</p>
        </div>
      </div>
    </div>
  </div>
);

ReportSummaryCard.propTypes = {
  patientName: PropTypes.string,
  abnormalCount: PropTypes.number,
  totalTests: PropTypes.number,
};

export default ReportSummaryCard;
