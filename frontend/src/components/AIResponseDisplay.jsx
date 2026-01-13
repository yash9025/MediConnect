import { useState, useContext, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

// --- CONFIGURATION & CONSTANTS ---
const UI_CONFIG = {
  URGENCY_STYLES: {
    HIGH: {
      badge: "bg-rose-100 text-rose-700 border-rose-200",
      bg: "bg-rose-50/50",
      border: "border-rose-200",
    },
    MEDIUM: {
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      bg: "bg-amber-50/50",
      border: "border-amber-200",
    },
    LOW: {
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
      bg: "bg-emerald-50/50",
      border: "border-emerald-200",
    },
    DEFAULT: {
      badge: "bg-slate-100 text-slate-600 border-slate-200",
      bg: "bg-slate-50",
      border: "border-slate-200",
    },
  },
  REPLY_BADGES: [
    { label: "⚡ Fastest Reply", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { label: "⚡ Fast Reply", style: "bg-sky-50 text-sky-700 border-sky-200" },
    { label: "⏱️ Replies in ~1 hr", style: "bg-slate-50 text-slate-500 border-slate-200" },
  ],
};

// --- UTILITIES ---
const calculateDoctorScore = (doc) => {
  const experience = parseInt(doc.experience) || 0;
  const slots = doc.slots_booked || 0;
  return 10 * experience - 5 * slots;
};

const getUrgencyConfig = (level) =>
  UI_CONFIG.URGENCY_STYLES[level?.toUpperCase()] || UI_CONFIG.URGENCY_STYLES.DEFAULT;

const getReplyBadge = (index) =>
  UI_CONFIG.REPLY_BADGES[index] || UI_CONFIG.REPLY_BADGES[2];

// --- CUSTOM HOOK: AUTHORIZATION LOGIC ---
const useDoctorAuthorization = (reportId, token, backendUrl) => {
  const [authorizedDocs, setAuthorizedDocs] = useState({});
  const [loadingDocs, setLoadingDocs] = useState({});

  const authorizeDoctor = useCallback(async (doctorId) => {
    if (!token) {
      toast.error("Please login to authorize doctors.");
      return;
    }

    setLoadingDocs((prev) => ({ ...prev, [doctorId]: true }));
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/authorize-doc`,
        { reportId, doctorId },
        { headers: { token } }
      );

      if (data.success) {
        toast.success("Report shared successfully!");
        setAuthorizedDocs((prev) => ({ ...prev, [doctorId]: true }));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Authorization error:", error);
      toast.error("Authorization failed. Please try again.");
    } finally {
      setLoadingDocs((prev) => ({ ...prev, [doctorId]: false }));
    }
  }, [token, backendUrl, reportId]);

  return { authorizedDocs, loadingDocs, authorizeDoctor };
};

// --- SUB-COMPONENTS ---

const DiagnosisCard = ({ analysis }) => {
  const styles = getUrgencyConfig(analysis.urgency);

  return (
    <div className={`relative overflow-hidden rounded-2xl border shadow-sm mb-6 group transition-colors ${styles.bg} ${styles.border}`}>
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
              <h3 className="text-lg font-bold text-slate-800 leading-tight">AI Report Analysis</h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">Lab Lens Assessment</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm uppercase tracking-wider ${styles.badge}`}>
            {analysis.urgency || "Review Required"}
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group-hover:border-emerald-200 transition-colors">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Detected Condition</label>
            <p className="text-base font-bold text-slate-800 leading-tight">{analysis.condition_suspected || "Analysis Pending"}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group-hover:border-sky-200 transition-colors">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Recommended Specialist</label>
            <p className="text-base font-bold text-sky-600 leading-tight">{analysis.recommended_specialist || "General Physician"}</p>
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-300 absolute top-4 left-4 opacity-50">
            <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-slate-600 leading-relaxed pl-6 italic font-medium">
            "{analysis.reasoning || "No detailed reasoning provided."}"
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

const DoctorCard = ({ doc, index, onAuthorize, isAuthorized, isLoading, onBook }) => {
  const replyBadge = getReplyBadge(index);

  return (
    <div className="group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 relative overflow-hidden">
      {index === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-br from-emerald-100 to-sky-100 border border-white shadow-sm">
            <img src={doc.image || "https://via.placeholder.com/150"} alt={doc.name} className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-white">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex justify-between items-start">
            <h5 className="text-base font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{doc.name}</h5>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${replyBadge.style}`}>
              {replyBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-sky-600 font-semibold">{doc.speciality}</p>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">${doc.fees}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-1.5">
            <span>{doc.degree}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>{doc.experience} Experience</span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => onBook(doc._id)}
          className="py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 transition-all uppercase tracking-wide"
        >
          Book Visit
        </button>

        <button
          onClick={() => onAuthorize(doc._id)}
          disabled={isLoading || isAuthorized}
          className={`py-2.5 rounded-xl text-xs font-bold text-white uppercase tracking-wide transition-all shadow-sm
            ${isAuthorized
              ? "bg-emerald-500 border border-emerald-600 cursor-default opacity-90"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border border-transparent hover:shadow-emerald-200/50"
            }
            ${isLoading ? "opacity-70 cursor-wait" : ""}
          `}
        >
          <div className="flex items-center justify-center gap-2">
            {isLoading ? (
              <>Sending...</>
            ) : isAuthorized ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
                Report Sent
              </>
            ) : (
              "Share Report"
            )}
          </div>
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
    slots_booked: PropTypes.number,
  }).isRequired,
  index: PropTypes.number.isRequired,
  onAuthorize: PropTypes.func.isRequired,
  onBook: PropTypes.func.isRequired,
  isAuthorized: PropTypes.bool,
  isLoading: PropTypes.bool,
};

const EmptyState = () => (
  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
    <p className="text-base text-slate-400 font-medium">No specialists matched your criteria.</p>
  </div>
);

// --- MAIN COMPONENT ---
const AIResponseDisplay = ({ responseData }) => {
  const { report_id = "", analysis = {}, matched_doctors = [] } = responseData || {};
  const { token, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  // Custom hook for logic
  const { authorizedDocs, loadingDocs, authorizeDoctor } = useDoctorAuthorization(report_id, token, backendUrl);

  // Memoized sorting for performance
  const sortedDoctors = useMemo(() => {
    return [...matched_doctors].sort((a, b) => calculateDoctorScore(b) - calculateDoctorScore(a));
  }, [matched_doctors]);

  if (!analysis || !matched_doctors) return null;

  return (
    <div className="w-full mt-2 mb-2 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DiagnosisCard analysis={analysis} />

      {/* Doctors List Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Top Matched Specialists
          </h4>
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">
            {sortedDoctors.length} found
          </span>
        </div>

        {/* List Rendering */}
        {sortedDoctors.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {sortedDoctors.map((doc, index) => (
              <DoctorCard
                key={doc._id}
                doc={doc}
                index={index}
                onBook={(id) => navigate(`/appointment/${id}`)}
                onAuthorize={authorizeDoctor}
                isAuthorized={!!authorizedDocs[doc._id]}
                isLoading={!!loadingDocs[doc._id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

AIResponseDisplay.propTypes = {
  responseData: PropTypes.shape({
    report_id: PropTypes.string,
    analysis: PropTypes.object,
    matched_doctors: PropTypes.array,
  }),
};

export default AIResponseDisplay;