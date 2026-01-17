import { useEffect, useState, useContext, useCallback } from 'react';
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
    const fetchReports = useCallback(async () => {
        if (!dToken) return;
        setLoading(true);
        try {
            const { data } = await axios.post(
                `${backendUrl}/api/doctor/verification-requests`,
                {},
                { headers: { dToken } }
            );

            if (data.success) {
                setReports([...data.reports].reverse());
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Failed to load reports.");
        } finally {
            setLoading(false);
        }
    }, [dToken, backendUrl]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    // --- 2. View PDF Handler ---
    const handleViewPdf = (url) => {
        if (!url) return toast.error("Report URL is missing.");
        
        const invalidPaths = ["C:", "file:", "uploads\\"];
        if (invalidPaths.some(path => url.startsWith(path))) {
            return toast.error("Invalid File Path. Please delete this report.");
        }

        const isRawCloudinary = url.includes("cloudinary") && !url.toLowerCase().endsWith(".pdf");
        const finalUrl = isRawCloudinary 
            ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true` 
            : url;

        window.open(finalUrl, '_blank');
    };

    // --- 3. Send Advice ---
    const handleSendAdvice = async (reportId) => {
        const doctorNote = notes[reportId]?.trim();
        if (!doctorNote) return toast.error("Please add advice before sending.");

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
            console.error("Action Error:", error);
            toast.error("Failed to send advice.");
        } finally {
            setActionLoading(prev => ({ ...prev, [reportId]: false }));
        }
    };

    const getUrgencyBadge = (level = "") => {
        const colors = {
            HIGH: 'bg-red-100 text-red-700 border-red-200',
            MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
            LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200'
        };
        const normalized = level.toUpperCase();
        return (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${colors[normalized] || 'bg-gray-100 text-gray-600'}`}>
                {level || 'Normal'}
            </span>
        );
    };

    return (
        // FIX APPLIED HERE: 
        // Changed "md:ml-64" to "ml-16 md:ml-64".
        // "ml-16" pushes content 4rem (64px) to the right on mobile to clear the icon bar.
        // "md:ml-64" pushes it 16rem (256px) on desktop to clear the full sidebar.
        <div className="ml-16 md:ml-64 pt-20 sm:pt-24 px-4 sm:px-8 pb-10 min-h-screen bg-gray-50 font-sans">
            
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">Pending Reports</h1>
                    <p className="text-gray-500 text-sm mt-1">Review AI insights and verify patient results.</p>
                </div>
                <button 
                    onClick={fetchReports} 
                    className="cursor-pointer w-full sm:w-auto flex justify-center items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 shadow-sm transition-all text-sm font-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
                </div>
            ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <span className="text-5xl mb-4 text-green-500">✓</span>
                    <p className="text-gray-500 text-lg font-medium text-center px-4">All caught up! No pending reports.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {reports.map((report) => (
                        <article key={report._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
                            
                            <div className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 border-b border-gray-100 gap-4">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                                        {report.patientName?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 leading-none">{report.patientName}</h3>
                                        <span className="text-xs text-gray-400 font-mono mt-1 block uppercase">ID: {report.userId?.slice(-6)}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                    {getUrgencyBadge(report.aiAnalysis?.urgency)}
                                    <button 
                                        onClick={() => handleViewPdf(report.pdfUrl)} 
                                        className="cursor-pointer flex items-center gap-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition font-semibold text-sm whitespace-nowrap"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                        View PDF
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 grid gap-6 lg:grid-cols-2">
                                <section className="bg-blue-50/60 rounded-xl p-4 sm:p-5 border border-blue-100">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase tracking-wide mb-3">
                                        <span>🤖</span> AI Analysis
                                    </h4>
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-gray-600">
                                            <span className="text-xs font-bold text-gray-400 block uppercase">Suspected Condition</span>
                                            <span className="text-gray-800 font-bold">{report.aiAnalysis?.condition_suspected}</span>
                                        </p>
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            <span className="text-xs font-bold text-gray-400 block uppercase">AI Reasoning</span>
                                            {report.aiAnalysis?.reasoning}
                                        </p>
                                    </div>
                                </section>

                                <section className="flex flex-col">
                                    <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span>🩺</span> Your Clinical Advice
                                    </label>
                                    <textarea 
                                        className="flex-1 w-full p-4 text-sm text-gray-800 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white transition"
                                        placeholder="Enter diagnosis, precautions, or next steps..."
                                        rows="4"
                                        value={notes[report._id] || ""}
                                        onChange={(e) => setNotes({ ...notes, [report._id]: e.target.value })}
                                    />
                                    <div className="flex justify-end gap-3 mt-4">
                                        <button 
                                            onClick={() => handleSendAdvice(report._id)}
                                            disabled={actionLoading[report._id]}
                                            className={`cursor-pointer w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
                                                actionLoading[report._id] ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'
                                            }`}
                                        >
                                            {actionLoading[report._id] ? 'Sending...' : 'Verify & Send'}
                                            {!actionLoading[report._id] && <span>➔</span>}
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DoctorReportAnalysis;