import { useState, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

/**
 * Score = (10 * experience) - (5 * slots_booked)
 */
const calculateDoctorScore = (doc) => {
    const experience = parseInt(doc.experience) || 0;
    const slots = doc.slots_booked || 0;
    return (10 * experience) - (5 * slots);
};

const AIResponseDisplay = ({ responseData }) => {
    const { report_id = "", analysis = {}, matched_doctors = [] } = responseData || {};
    const { token, backendUrl } = useContext(AppContext);
    const navigate = useNavigate();

    const [authorizedDocs, setAuthorizedDocs] = useState({});
    const [loadingDocs, setLoadingDocs] = useState({});

    // Memoized sorting to prevent re-calculation on every render
    const sortedDoctors = useMemo(() => {
        return [...matched_doctors].sort((a, b) => 
            calculateDoctorScore(b) - calculateDoctorScore(a)
        );
    }, [matched_doctors]);

    const handleAuthorize = async (doctorId) => {
        if (!token) return toast.error("Please login to authorize doctors.");

        setLoadingDocs(prev => ({ ...prev, [doctorId]: true }));
        try {
            const { data } = await axios.post(
                `${backendUrl}/api/user/authorize-doc`,
                { reportId: report_id, doctorId },
                { headers: { token } }
            );

            if (data.success) {
                toast.success("Report sent to doctor successfully!");
                setAuthorizedDocs(prev => ({ ...prev, [doctorId]: true }));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Failed to authorize. Try again.");
        } finally {
            setLoadingDocs(prev => ({ ...prev, [doctorId]: false }));
        }
    };

    const getUrgencyStyles = (level = "") => {
        const styles = {
            HIGH: 'bg-red-50 text-red-700 border-red-200 ring-red-500/20',
            MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
            LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20'
        };
        return styles[level.toUpperCase()] || 'bg-slate-50 text-slate-700 border-slate-200';
    };

    return (
        <div className="w-full mt-4 space-y-6 font-sans">
            {/* AI Diagnosis Card */}
            <section className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
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
                            {(analysis.urgency || "UNKNOWN").toUpperCase()} PRIORITY
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Condition</label>
                            <p className="text-base font-bold text-slate-800 mt-0.5">{analysis.condition_suspected || "Not Specified"}</p>
                        </div>
                        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Specialist</label>
                            <p className="text-base font-bold text-blue-700 mt-0.5">{analysis.recommended_specialist || "General Physician"}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 italic text-sm text-slate-600 leading-relaxed">
                        "{analysis.reasoning || "No detailed reasoning provided."}"
                    </div>
                </div>
            </section>

            {/* Recommended Doctors List */}
            <section>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                        <span>👨‍⚕️</span> Recommended Doctors
                    </h4>
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {sortedDoctors.length} Matches
                    </span>
                </div>
                
                {sortedDoctors.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                        <p className="text-sm text-slate-500">No specialists found for this condition.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedDoctors.map((doc) => (
                            <div key={doc._id} className="group bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="flex items-start gap-4">
                                    <div className="relative flex-shrink-0">
                                        <img 
                                            src={doc.image || "https://via.placeholder.com/150"} 
                                            alt={doc.name} 
                                            className="w-14 h-14 rounded-full object-cover border-2 border-slate-100"
                                        />
                                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h5 className="text-sm font-bold text-slate-800 truncate">{doc.name}</h5>
                                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                ${doc.fees}
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-600 font-medium">{doc.speciality}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {doc.degree} • {doc.experience} Experience
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => navigate(`/appointment/${doc._id}`)}
                                        className="py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition"
                                    >
                                        Book Now
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleAuthorize(doc._id)}
                                        disabled={loadingDocs[doc._id] || authorizedDocs[doc._id]}
                                        className={`py-1.5 rounded-lg text-xs font-semibold text-white transition-all flex justify-center items-center gap-1.5
                                            ${authorizedDocs[doc._id] ? 'bg-emerald-500 cursor-default' : 'bg-blue-600 hover:bg-blue-700'}
                                            ${loadingDocs[doc._id] ? 'opacity-70 cursor-wait' : ''}`}
                                    >
                                        {loadingDocs[doc._id] ? 'Sending...' : authorizedDocs[doc._id] ? 'Sent' : 'Send Report'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
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
        matched_doctors: PropTypes.arrayOf(PropTypes.shape({
            _id: PropTypes.string.isRequired,
            name: PropTypes.string,
            speciality: PropTypes.string,
            image: PropTypes.string,
            fees: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            degree: PropTypes.string,
            experience: PropTypes.string,
            slots_booked: PropTypes.number
        }))
    })
};

export default AIResponseDisplay;