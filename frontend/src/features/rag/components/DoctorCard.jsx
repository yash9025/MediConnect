import PropTypes from "prop-types";
import { getReplyBadge } from "../config/uiConfig";

/**
 * Format fees for display with proper currency formatting
 * Handles both number and string inputs from database
 */
const formatFees = (fees) => {
  // Handle various input types
  let feeAmount;
  
  if (typeof fees === 'string') {
    // Remove any non-numeric characters except decimal point
    feeAmount = parseFloat(fees.replace(/[^\d.]/g, ''));
  } else {
    feeAmount = parseFloat(fees);
  }
  
  if (!feeAmount || feeAmount <= 0 || isNaN(feeAmount)) {
    return "Contact for fees";
  }
  
  // Format with USD
  return `$${feeAmount.toLocaleString('en-US')}`;
};

/**
 * Doctor Card Component
 * Displays individual doctor information with booking and authorization options
 */
const DoctorCard = ({ doc, index, onAuthorize, isAuthorized, isLoading, onBook, score }) => {
  const replyBadge = getReplyBadge(index);

  return (
    <div className="group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-300 relative overflow-hidden">
      {/* Rank Indicator */}
      {index < 3 && (
        <div className={`absolute top-0 left-0 w-8 h-8 flex items-center justify-center text-white text-xs font-black rounded-br-xl ${
          index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 
          index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 
          'bg-gradient-to-br from-amber-600 to-amber-700'
        }`}>
          #{index + 1}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-br from-emerald-100 to-sky-100 border border-white shadow-md">
            <img src={doc.image || "https://via.placeholder.com/150"} alt={doc.name} className="w-full h-full rounded-xl object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex justify-between items-start gap-2">
            <h5 className="text-base font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{doc.name}</h5>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${replyBadge.style}`}>
              {replyBadge.label}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-sky-600 font-semibold">{doc.speciality}</p>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              {formatFees(doc.fees)}
            </span>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="text-slate-400">🎓</span> {doc.degree}
            </p>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="text-slate-400">⏱️</span> {doc.experience}
            </p>
          </div>
          
          {/* Score Badge */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Match Score:</span>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                ></div>
              </div>
              <span className="text-xs font-bold text-emerald-600">{score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => onBook(doc._id)}
          className="cursor-pointer py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-white hover:border-emerald-300 hover:text-emerald-600 transition-all uppercase tracking-wide flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Book Visit
        </button>

        <button
          onClick={() => onAuthorize(doc._id)}
          disabled={isLoading || isAuthorized}
          className={`py-2.5 rounded-xl text-xs font-bold text-white uppercase tracking-wide transition-all shadow-sm flex items-center justify-center gap-1.5
            ${isAuthorized
              ? "bg-emerald-500 border border-emerald-600 cursor-default"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border border-transparent hover:shadow-lg hover:shadow-emerald-200/50"
            }
            ${isLoading ? "opacity-70 cursor-wait" : ""}
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Sending...
            </>
          ) : isAuthorized ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              Report Sent
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

DoctorCard.propTypes = {
  doc: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string,
    speciality: PropTypes.string,
    image: PropTypes.string,
    fees: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    degree: PropTypes.string,
    experience: PropTypes.string,
    slots_booked: PropTypes.object,
  }).isRequired,
  index: PropTypes.number.isRequired,
  onAuthorize: PropTypes.func.isRequired,
  onBook: PropTypes.func.isRequired,
  isAuthorized: PropTypes.bool,
  isLoading: PropTypes.bool,
  score: PropTypes.number,
};

export default DoctorCard;
