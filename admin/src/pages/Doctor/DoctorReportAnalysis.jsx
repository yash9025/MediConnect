import React, { useEffect, useState, useContext } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const DoctorReportAnalysis = () => {
    const { dToken } = useContext(DoctorContext);
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState({});
    const [actionLoading, setActionLoading] = useState({});

    // --- 1. Fetch Reports ---
    useEffect(() => {
        if (dToken) {
            fetchReports();
        }
    }, [dToken]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data } = await axios.post(
                `${backendUrl}/api/doctor/verification-requests`,
                {},
                { headers: { dToken } }
            );

            if (data.success) {
                setReports(data.reports.reverse());
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load reports.");
        } finally {
            setLoading(false);
        }
    };

    // --- 2. Smart PDF Handler (THE FIX) ---
    const handleViewPdf = (url) => {
        console.log("Attempting to open PDF URL:", url); // 🔍 Debug Log

        if (!url) {
            toast.error("Report URL is missing.");
            return;
        }

        // Check if it's a "poisoned" local path (Old data)
        if (url.startsWith("C:") || url.startsWith("file:") || url.startsWith("uploads\\")) {
            toast.error("Invalid File Path (Old Data). Please delete this report.");
            return;
        }

        // Fix for "Downloading instead of Opening":
        // If the URL doesn't end in .pdf, we force it open in Google Docs Viewer
        const isRawCloudinary = url.includes("cloudinary") && !url.toLowerCase().endsWith(".pdf");
        
        if (isRawCloudinary) {
            // Open in Google Viewer fallback
            window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`, '_blank');
        } else {
            // Open normally
            window.open(url, '_blank');
        }
    };

    // --- 3. Send Advice ---
    const handleSendAdvice = async (reportId) => {
        const doctorNote = notes[reportId];

        if (!doctorNote || doctorNote.trim() === "") {
            toast.error("Please add your medical advice before sending.");
            return;
        }

        setActionLoading(prev => ({ ...prev, [reportId]: true }));

        try {
            const { data } = await axios.post(
                `${backendUrl}/api/doctor/send-advice`,
                { reportId, doctorNotes: doctorNote },
                { headers: { dToken } }
            );

            if (data.success) {
                toast.success("Advice sent successfully!");
                setReports(prev => prev.filter(item => item._id !== reportId));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to send advice.");
        } finally {
            setActionLoading(prev => ({ ...prev, [reportId]: false }));
        }
    };

    // --- Styles ---
    const getUrgencyBadge = (level) => {
        const styles = {
            HIGH: 'bg-red-50 text-red-600 border-red-100',
            MEDIUM: 'bg-amber-50 text-amber-600 border-amber-100',
            LOW: 'bg-emerald-50 text-emerald-600 border-emerald-100'
        };
        const style = styles[level?.toUpperCase()] || 'bg-gray-50 text-gray-600';
        return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${style}`}>
                {level}
            </span>
        );
    };

    return (
        <div className="ml-16 w-full max-w-4xl p-6 font-sans">
            
            {/* Header */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Pending Reports</h1>
                    <p className="text-slate-500 text-xs">Review AI insights and verify patient results.</p>
                </div>
                <button onClick={fetchReports} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </div>

            {/* List Content */}
            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm">No reports pending verification.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <div key={report._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200">
                            
                            {/* Card Header */}
                            <div className="px-4 py-3 flex justify-between items-center bg-slate-50 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                                        {report.patientName.charAt(0)}
                                    </div>
                                    <div className="leading-tight">
                                        <h3 className="text-sm font-bold text-slate-800">{report.patientName}</h3>
                                        <span className="text-[10px] text-slate-400 font-mono">ID: {report.userId.slice(-6).toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {getUrgencyBadge(report.aiAnalysis?.urgency)}
                                    
                                    {/* 🔴 Button using the Smart Handler */}
                                    <button 
                                        onClick={() => handleViewPdf(report.pdfUrl)} 
                                        className="text-slate-400 hover:text-blue-600 transition flex items-center gap-1 text-xs font-semibold"
                                        title="Open PDF"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                        </svg>
                                        View PDF
                                    </button>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 flex flex-col gap-4">
                                {/* AI Insight */}
                                <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg mt-0.5">🤖</span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                                Suspected: <span className="text-blue-700 normal-case">{report.aiAnalysis?.condition_suspected}</span>
                                            </p>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                {report.aiAnalysis?.reasoning}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Doctor Action */}
                                <div>
                                    <textarea 
                                        className="w-full h-20 p-3 text-sm text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none bg-slate-50 focus:bg-white transition placeholder:text-slate-400"
                                        placeholder="Write diagnosis & prescription..."
                                        value={notes[report._id] || ""}
                                        onChange={(e) => setNotes({ ...notes, [report._id]: e.target.value })}
                                    ></textarea>
                                    
                                    <div className="flex justify-end items-center gap-3 mt-2">
                                        <button className="text-xs font-medium text-slate-400 hover:text-red-500 transition">
                                            Reject
                                        </button>
                                        <button 
                                            onClick={() => handleSendAdvice(report._id)}
                                            disabled={actionLoading[report._id]}
                                            className={`
                                                flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all
                                                ${actionLoading[report._id] ? 'bg-slate-300 cursor-wait' : 'bg-green-600 hover:bg-green-700 hover:shadow-md'}
                                            `}
                                        >
                                            {actionLoading[report._id] ? (
                                                <span>Sending...</span>
                                            ) : (
                                                <>
                                                    Verify & Send <span className="text-xs">➔</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DoctorReportAnalysis;