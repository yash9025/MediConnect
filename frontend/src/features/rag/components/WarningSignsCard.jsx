import PropTypes from "prop-types";

/**
 * Warning Signs Card Component
 * Displays critical symptoms to watch for
 */
const WarningSignsCard = ({ signs }) => {
  if (!signs || signs.length === 0) return null;
  
  return (
    <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border border-rose-200 p-5 mb-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-rose-800 uppercase tracking-wider">⚠️ Warning Signs to Watch</h4>
      </div>
      
      <div className="space-y-2">
        {signs.map((sign, index) => (
          <div key={index} className="flex items-start gap-3 bg-white/70 backdrop-blur rounded-xl p-3 border border-rose-100">
            <span className="text-rose-500 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <p className="text-sm text-slate-700 leading-relaxed">{sign}</p>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-rose-600 font-medium mt-3 text-center">
        If you experience any of these symptoms, seek immediate medical attention.
      </p>
    </div>
  );
};

WarningSignsCard.propTypes = {
  signs: PropTypes.arrayOf(PropTypes.string),
};

export default WarningSignsCard;
