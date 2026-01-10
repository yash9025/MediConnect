import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // 1. Import Navigation Hook

const AIResponseDisplay = ({ responseData }) => {
    // Destructuring with defaults
    const { 
        report_id = "", 
        analysis = {}, 
        matched_doctors = [] 
    } = responseData || {};

    const { token, backendUrl } = useContext(AppContext);
    const navigate = useNavigate(); // 2. Initialize Navigation
    
    // State
    const [authorizedDocs, setAuthorizedDocs] = useState({});
    const [loadingDocs, setLoadingDocs] = useState({});

    // --- API HANDLER: AUTHORIZE DOCTOR ---
    const handleAuthorize = async (doctorId) => {
        if (!token) {
            toast.error("Please login to authorize doctors.");
            return;
        }

        setLoadingDocs(prev => ({ ...prev, [doctorId]: true }));

        try {
            // 3. Use backendUrl for the API call
            const { data } = await axios.post(
                `${backendUrl}/api/user/authorize-doc`,
                { reportId: report_id, doctorId: doctorId },
                { headers: { token } }
            );

            if (data.success) {
                toast.success("Report sent to doctor successfully!");
                setAuthorizedDocs(prev => ({ ...prev, [doctorId]: true }));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to authorize. Try again.");
        } finally {
            setLoadingDocs(prev => ({ ...prev, [doctorId]: false }));
        }
    };

    const getUrgencyStyles = (level) => {
        switch (level?.toUpperCase()) {
            case 'HIGH': return 'bg-red-50 text-red-700 border-red-200 ring-red-500/20';
            case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
            case 'LOW': return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="w-full mt-4 space-y-6 font-sans">
            
            {/* --- SECTION A: AI DIAGNOSIS CARD --- */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="text-2xl">🩺</span> AI Analysis
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Based on lab results provided</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ring-1 ${getUrgencyStyles(analysis.urgency)}`}>
                            {analysis.urgency || "UNKNOWN"} PRIORITY
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suspected Condition</label>
                            <p className="text-base font-bold text-slate-800 mt-0.5">{analysis.condition_suspected || "Not Specified"}</p>
                        </div>
                        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Recommended Specialist</label>
                            <p className="text-base font-bold text-blue-700 mt-0.5">{analysis.recommended_specialist || "General Physician"}</p>
                        </div>
                    </div>

                    <div className="relative bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-sm text-slate-600 italic leading-relaxed pl-1">
                            "{analysis.reasoning || "No detailed reasoning provided."}"
                        </p>
                    </div>
                </div>
            </div>

            {/* --- SECTION B: MATCHED DOCTORS --- */}
            <div>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                        <span>👨‍⚕️</span> Recommended Doctors
                    </h4>
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {matched_doctors.length} Matches
                    </span>
                </div>
                
                {matched_doctors.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                        <p className="text-sm text-slate-500">No nearby specialists found for this condition.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {matched_doctors.map((doc) => (
                            <div key={doc._id} className="group bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200">
                                <div className="flex items-start gap-4">
                                    <div className="relative flex-shrink-0">
                                        <img 
                                            src={doc.image || "https://via.placeholder.com/150"} 
                                            alt={doc.name} 
                                            className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 group-hover:border-blue-100 transition"
                                        />
                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h5 className="text-sm font-bold text-slate-800 truncate">{doc.name}</h5>
                                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                ${doc.fees}
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-600 font-medium truncate">{doc.speciality}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                            {doc.degree} • {doc.experience} Experience
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {/* 4. Book Now Button - Navigates to Appointment Page */}
                                    <button 
                                        onClick={() => navigate(`/appointment/${doc._id}`)}
                                        className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition"
                                    >
                                        Book Now
                                    </button>
                                    
                                    {/* Authorize Button - Calls API */}
                                    <button 
                                        onClick={() => handleAuthorize(doc._id)}
                                        disabled={loadingDocs[doc._id] || authorizedDocs[doc._id]}
                                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold text-white shadow-sm transition-all flex justify-center items-center gap-1.5
                                            ${authorizedDocs[doc._id] 
                                                ? 'bg-emerald-500 border border-emerald-600 cursor-default ring-2 ring-emerald-100' 
                                                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                                            }
                                            ${loadingDocs[doc._id] ? 'opacity-75 cursor-wait' : ''}
                                        `}
                                    >
                                        {loadingDocs[doc._id] ? (
                                            <>
                                                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Sending
                                            </>
                                        ) : authorizedDocs[doc._id] ? (
                                            <>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                Sent
                                            </>
                                        ) : (
                                            <>
                                                Send Report
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
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
        analysis: PropTypes.shape({
            condition_suspected: PropTypes.string,
            urgency: PropTypes.string,
            recommended_specialist: PropTypes.string,
            reasoning: PropTypes.string,
        }),
        matched_doctors: PropTypes.arrayOf(
            PropTypes.shape({
                _id: PropTypes.string.isRequired,
                name: PropTypes.string,
                speciality: PropTypes.string,
                image: PropTypes.string,
                fees: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                degree: PropTypes.string,
                experience: PropTypes.string,
                address: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
            })
        )
    })
};

export default AIResponseDisplay;