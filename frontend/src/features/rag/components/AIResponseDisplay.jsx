import { useContext, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../../context/AppContext";

// RAG Feature Imports (relative paths within features/rag)
import ReportSummaryCard from "./ReportSummaryCard";
import DiagnosisCard from "./DiagnosisCard";
import LifestyleAdviceCard from "./LifestyleAdviceCard";
import WarningSignsCard from "./WarningSignsCard";
import RAGSourcesCard from "./RAGSourcesCard";
import DoctorCard from "./DoctorCard";
import EmptyState from "./EmptyState";
import { useDoctorAuthorization } from "../hooks/useDoctorAuthorization";

/**
 * AIResponseDisplay Component
 * Main component for displaying RAG analysis results and doctor recommendations
 */
const AIResponseDisplay = ({ responseData }) => {
  const { 
    report_id = "", 
    patient_name = "",
    abnormal_count = 0,
    total_tests = 0,
    analysis = {}, 
    matched_doctors = [],
    rag_sources = [],
    continuity_applied = false,
    pinned_doctor = null,
    triage_override = false,
    override_reason = "",
  } = responseData || {};
  
  const { isAuthenticated, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  const [authModalDoc, setAuthModalDoc] = useState(null);

  // Custom hook for authorization logic
  const { authorizedDocs, loadingDocs, authorizeDoctor } = useDoctorAuthorization(report_id, isAuthenticated, backendUrl);

  const handleAuthorizeClick = (docId) => {
    const doc = matched_doctors.find(d => d._id === docId) || pinned_doctor;
    setAuthModalDoc(doc);
  };

  const handleConfirmAuth = () => {
    if (authModalDoc) {
      authorizeDoctor(authModalDoc._id);
      setAuthModalDoc(null);
    }
  };

  // Doctors are now pre-scored and sorted by the backend ranking engine
  const sortedDoctors = matched_doctors || [];

  if (!analysis || !matched_doctors) return null;

  return (
    <div className="w-full mt-2 mb-4 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Report Summary */}
      {total_tests > 0 && (
        <ReportSummaryCard 
          patientName={patient_name}
          abnormalCount={abnormal_count}
          totalTests={total_tests}
        />
      )}
      
      {/* AI Diagnosis */}
      <DiagnosisCard analysis={analysis} />

      {/* Lifestyle Advice */}
      {analysis.lifestyle_advice && (
        <LifestyleAdviceCard advice={analysis.lifestyle_advice} />
      )}

      {/* Warning Signs */}
      {analysis.warning_signs && (
        <WarningSignsCard signs={analysis.warning_signs} />
      )}

      {/* RAG Sources */}
      {rag_sources.length > 0 && (
        <RAGSourcesCard sources={rag_sources} />
      )}

      {/* Triage Override Alert */}
      {triage_override && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md my-4 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-amber-500 font-bold text-lg">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Acuity Triage Routing</h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>{override_reason}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continuity Pinned Doctor */}
      {continuity_applied && pinned_doctor && !triage_override && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl my-4 shadow-sm">
          <h4 className="text-emerald-800 font-bold text-sm mb-3 flex items-center gap-2">
            ⭐ Your Attending Specialist
          </h4>
          <p className="text-xs text-emerald-600 mb-4">
            Consulting this doctor ensures treatment continuity based on your previous visits.
          </p>
          <DoctorCard
            doc={pinned_doctor}
            index={0}
            score={100}
            onBook={(id) => navigate(`/appointment/${id}`)}
            onAuthorize={handleAuthorizeClick}
            isAuthorized={!!authorizedDocs[pinned_doctor._id]}
            isLoading={!!loadingDocs[pinned_doctor._id]}
          />
        </div>
      )}

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
                score={doc.score}
                onBook={(id) => navigate(`/appointment/${id}`)}
                onAuthorize={handleAuthorizeClick}
                isAuthorized={!!authorizedDocs[doc._id]}
                isLoading={!!loadingDocs[doc._id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Consent Gate Modal */}
      {authModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
              Authorize Doctor?
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              You are about to share your analyzed blood report and medical history with <strong>Dr. {authModalDoc.name}</strong>. They will be granted a secure, time-limited token to view this data.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setAuthModalDoc(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAuth}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all"
              >
                Yes, Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

AIResponseDisplay.propTypes = {
  responseData: PropTypes.shape({
    report_id: PropTypes.string,
    patient_name: PropTypes.string,
    abnormal_count: PropTypes.number,
    total_tests: PropTypes.number,
    analysis: PropTypes.object,
    matched_doctors: PropTypes.array,
    rag_sources: PropTypes.array,
  }),
};

export default AIResponseDisplay;
