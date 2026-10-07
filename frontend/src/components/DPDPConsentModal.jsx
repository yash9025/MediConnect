import React, { useState } from "react";
import PropTypes from "prop-types";

export default function DPDPConsentModal({ isOpen, onClose, onAccept }) {
  const [agreed, setAgreed] = useState({
    biomarkers: false,
    noTraining: false,
  });

  if (!isOpen) return null;

  const isAllMandatoryChecked = agreed.biomarkers && agreed.noTraining;

  const handleToggle = (id) => {
    setAgreed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirm = () => {
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h3 className="font-bold text-lg">Data Processing & Affirmative Consent</h3>
            </div>
            <p className="text-xs text-blue-200 mt-1 font-medium">
              In accordance with India's Digital Personal Data Protection (DPDP) Act, 2023
            </p>
          </div>
        </div>

        {/* DPDP Statutory Notice Banner */}
        <div className="bg-blue-50/50 p-5 border-b border-blue-100">
          <p className="text-sm text-gray-800 leading-relaxed font-medium">
            "We will process your lab report using cloud AI solely to summarize biomarkers against ICMR guidelines. Your data will not be used to train AI models or shared with unapproved third parties."
          </p>
        </div>

        {/* Itemized Checklists (Strict Opt-In) */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
            Itemized Purpose Specification
          </p>

          {/* Item 1: Biomarker Extraction */}
          <label
            className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
              agreed.biomarkers
                ? "border-blue-500 bg-blue-50/30"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={agreed.biomarkers}
              onChange={() => handleToggle("biomarkers")}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="font-semibold text-sm text-gray-900 block">
                Biomarker Extraction for Clinical Triage
              </span>
              <span className="text-xs text-gray-600 leading-relaxed block mt-1">
                Extract diagnostic values from your report specifically to provide health trends and AI-driven clinical summaries.
              </span>
            </div>
          </label>

          {/* Item 2: Zero Model Training Guarantee */}
          <label
            className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
              agreed.noTraining
                ? "border-blue-500 bg-blue-50/30"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={agreed.noTraining}
              onChange={() => handleToggle("noTraining")}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="font-semibold text-sm text-gray-900 block">
                Strict Zero Model Training Guarantee
              </span>
              <span className="text-xs text-gray-600 leading-relaxed block mt-1">
                Acknowledge that your raw health data and diagnostic vitals will never be used to train public language models.
              </span>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="p-5 bg-gray-50 border-t flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 font-semibold transition-colors"
          >
            Decline & Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isAllMandatoryChecked}
            type="button"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            Grant Consent & Analyze
          </button>
        </div>
      </div>
    </div>
  );
}

DPDPConsentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAccept: PropTypes.func.isRequired,
};
