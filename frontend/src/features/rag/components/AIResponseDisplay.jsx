import { useContext, useMemo } from "react";
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
import { sortDoctorsByScore } from "../utils/doctorScoring";

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
  } = responseData || {};
  
  const { token, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  // Custom hook for authorization logic
  const { authorizedDocs, loadingDocs, authorizeDoctor } = useDoctorAuthorization(report_id, token, backendUrl);

  // Professional doctor sorting with improved scoring algorithm
  const sortedDoctors = useMemo(() => {
    const recommendedSpecialty = analysis?.recommended_specialist || '';
    return sortDoctorsByScore(matched_doctors, recommendedSpecialty);
  }, [matched_doctors, analysis?.recommended_specialist]);

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
    patient_name: PropTypes.string,
    abnormal_count: PropTypes.number,
    total_tests: PropTypes.number,
    analysis: PropTypes.object,
    matched_doctors: PropTypes.array,
    rag_sources: PropTypes.array,
  }),
};

export default AIResponseDisplay;
