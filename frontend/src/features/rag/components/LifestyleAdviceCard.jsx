import PropTypes from "prop-types";

/**
 * Lifestyle Advice Card Component
 * Displays AI-recommended lifestyle modifications
 */
const LifestyleAdviceCard = ({ advice }) => {
  if (!advice || advice.length === 0) return null;
  
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-5 mb-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Lifestyle Recommendations</h4>
      </div>
      
      <div className="space-y-2">
        {advice.map((item, index) => (
          <div key={index} className="flex items-start gap-3 bg-white/70 backdrop-blur rounded-xl p-3 border border-emerald-100">
            <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              {index + 1}
            </span>
            <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

LifestyleAdviceCard.propTypes = {
  advice: PropTypes.arrayOf(PropTypes.string),
};

export default LifestyleAdviceCard;
