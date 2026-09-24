import { useState, useCallback, useContext, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import AgentStatusBoard from "../components/AgentStatusBoard";
import { MedicalChatBot } from "../features/rag";

// ─── Mode configuration ─────────────────────────────────────────────────────

const MODES = [
  {
    id: "v1",
    label: "Standard AI RAG",
    tag: "V1 FAST",
    price: "$1.00",
    costCredit: "1 Credit",
    speed: "~2-3 sec",
    tagColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Fast single-pipeline RAG search with Redis semantic caching.",
    advantages: ["Ultra-fast response (~2-3s)", "Low token cost ($1.00)", "Ideal for routine PDF checks"],
    activeRing: "ring-emerald-500",
    activeBg: "bg-emerald-50/70",
    activeBorder: "border-emerald-500",
  },
  {
    id: "v2",
    label: "Deep Multi-Agent",
    tag: "V2 SOTA",
    price: "$2.00",
    costCredit: "2 Credits",
    speed: "~8-15 sec",
    tagColor: "bg-blue-100 text-blue-800 border-blue-300",
    description: "Parallel domain specialist agents (Cardiology, Nephrology) with live SSE reasoning & validation.",
    advantages: ["Parallel specialist agents", "Live SSE reasoning stream", "Self-correcting validation", "Supports PDF & text"],
    activeRing: "ring-blue-500",
    activeBg: "bg-blue-50/70",
    activeBorder: "border-blue-500",
  },
  {
    id: "auto",
    label: "Smart Cascade",
    tag: "AUTO SMART",
    price: "Dynamic",
    costCredit: "1-2 Credits",
    speed: "Adaptive",
    tagColor: "bg-purple-100 text-purple-800 border-purple-300",
    description: "Fast V1 scan first — auto-escalates to V2 if complex report anomalies are detected.",
    advantages: ["Speed & cost optimized", "Seamless escalation", "Recommended for general use"],
    activeRing: "ring-purple-500",
    activeBg: "bg-purple-50/70",
    activeBorder: "border-purple-500",
    recommended: true,
  },
];

// ─── Urgency config ──────────────────────────────────────────────────────────

const URGENCY = {
  HIGH:   { bg: "bg-red-50",   border: "border-red-200",   text: "text-red-700",   dot: "bg-red-500",   label: "High Urgency" },
  MEDIUM: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", label: "Medium Urgency" },
  LOW:    { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500", label: "Low Urgency" },
};

// ─── V1 Result Panel ─────────────────────────────────────────────────────────

const V1ResultPanel = ({ data }) => {
  if (!data) return null;
  const u = URGENCY[data.analysis?.urgency] || URGENCY.LOW;

  return (
    <div className="space-y-5 mt-8">
      {/* Urgency card */}
      <div className={`p-5 rounded-lg border-l-4 ${u.bg} ${u.border}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`h-2.5 w-2.5 rounded-full ${u.dot} animate-pulse`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${u.text}`}>{u.label}</span>
        </div>
        <p className="text-xl font-bold text-gray-800">{data.analysis?.condition_suspected || "Analysis Complete"}</p>
      </div>

      {/* Reasoning */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Clinical Reasoning</h4>
        <p className="text-gray-700 text-sm leading-relaxed">{data.analysis?.reasoning}</p>
      </div>

      {/* Two-column info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
          <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Recommended Specialist</h4>
          <p className="text-gray-800 font-semibold text-lg">{data.analysis?.recommended_specialist}</p>
          {data.matched_doctors?.length > 0 && (
            <p className="text-gray-500 text-xs mt-1">{data.matched_doctors.length} doctor(s) available</p>
          )}
        </div>

        <div className="bg-green-50 p-5 rounded-lg border border-green-100">
          <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Lifestyle Advice</h4>
          <ul className="space-y-1">
            {(data.analysis?.lifestyle_advice || []).slice(0, 4).map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                <span className="text-green-500 mt-1 shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Warnings */}
      {data.analysis?.warning_signs?.length > 0 && (
        <div className="bg-red-50 p-5 rounded-lg border border-red-100">
          <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">⚠ Warning Signs — Seek Immediate Care If:</h4>
          <div className="flex flex-wrap gap-2">
            {data.analysis.warning_signs.map((sign, i) => (
              <span key={i} className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1 rounded-full font-medium">{sign}</span>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {data.rag_sources?.length > 0 && (
        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Knowledge Sources</h4>
          <div className="flex flex-wrap gap-2">
            {data.rag_sources.map((s, i) => (
              <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full font-medium shadow-sm">
                {s.source}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

V1ResultPanel.propTypes = { data: PropTypes.object };
V1ResultPanel.defaultProps = { data: null };

// ─── Main Page Component ─────────────────────────────────────────────────────

const AiDiagnostic = () => {
  const { isAuthenticated, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  // Input
  const [inputMode, setInputMode] = useState("text");
  const [rawText, setRawText]     = useState("");
  const [pdfFile, setPdfFile]     = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const fileInputRef              = useRef(null);

  // Execution
  const [mode, setMode]             = useState("auto");
  const [loading, setLoading]       = useState(false);
  const [v1Result, setV1Result]     = useState(null);
  const [sseLogs, setSseLogs]       = useState([]);
  const [streaming, setStreaming]   = useState(false);
  const abortRef                    = useRef(null);

  // Past reports history
  const [pastReports, setPastReports] = useState([]);

  const fetchPastReports = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/lab/user-reports`, { withCredentials: true });
      if (data.success) {
        setPastReports(data.reports || []);
      }
    } catch (err) {
      console.error("Failed to fetch past reports:", err);
    }
  }, [backendUrl, isAuthenticated]);

  useEffect(() => {
    fetchPastReports();
  }, [fetchPastReports]);

  const handleSelectPastReport = (report) => {
    setV1Result({
      success: true,
      analysis: report.aiAnalysis,
      rag_sources: report.aiAnalysis?.ragSourcesUsed?.map(s => ({ source: s })) || [{ source: "Saved Diagnostic Analysis" }],
    });
    setTimeout(() => {
      document.getElementById("diagnostic-results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const addLog = (agent, message, type = "log") => {
    setSseLogs(prev => [...prev, { agent, message, type, ts: Date.now() }]);
  };

  const reset = () => {
    setV1Result(null); setSseLogs([]); setStreaming(false);
    abortRef.current?.abort?.(); abortRef.current = null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") { 
      setPdfFile(file); 
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(URL.createObjectURL(file));
    }
    else { 
      toast.error("Please upload a valid PDF file."); 
      setPdfFile(null); 
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  // V1 call
  const runV1 = useCallback(async () => {
    const url = `${backendUrl}/api/lab/analyze`;
    if (inputMode === "pdf" && pdfFile) {
      const fd = new FormData();
      fd.append("pdf", pdfFile);
      const { data } = await axios.post(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    }
    const { data } = await axios.post(url, { user_context: rawText });
    return data;
  }, [backendUrl, rawText, pdfFile, inputMode]);

  // V2 SSE stream (handles raw text OR multipart PDF)
  const runSSE = useCallback((execMode) => {
    return new Promise((resolve, reject) => {
      setStreaming(true); setSseLogs([]); setV1Result(null);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let fetchOpts = {};
      if (inputMode === "pdf" && pdfFile) {
        const formData = new FormData();
        formData.append("pdf", pdfFile);
        formData.append("executionMode", execMode);
        fetchOpts = {
          method: "POST",
          headers: { Accept: "text/event-stream" },
          credentials: "include",
          body: formData,
          signal: ctrl.signal,
        };
      } else {
        fetchOpts = {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          credentials: "include",
          body: JSON.stringify({ rawPdfText: rawText, executionMode: execMode }),
          signal: ctrl.signal,
        };
      }

      fetch(`${backendUrl}/api/agent/v2/stream`, fetchOpts)
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Stream failed");
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          const processChunk = (chunk) => {
            const lines = chunk.split("\n").map(l => l.trim()).filter(Boolean);
            let evType = "log", dataStr = null;
            for (const line of lines) {
              if (line.startsWith("event: ")) evType = line.slice(7).trim();
              else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
            }
            if (!dataStr) return;
            try {
              const p = JSON.parse(dataStr);
              if (evType === "log")      addLog(p.agent || "System", p.message, "log");
              else if (evType === "result") { 
                setV1Result({ success: true, analysis: p.analysis, rag_sources: [{ source: "Deep Agentic Research Pipeline (V2)" }] }); 
                addLog(p.agent || "Synthesizer Agent", p.message, "success"); 
              }
              else if (evType === "complete") resolve({ mode: "v1" });
              else if (evType === "done")    resolve({ mode: "v2" });
              else if (evType === "error")   addLog(p.agent || "System", p.message, "error");
            } catch (e) { console.debug('SSE parse skip', e); }
          };

          const pump = async () => {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split("\n\n");
              buffer = parts.pop();
              for (const part of parts) { if (part.trim()) processChunk(part); }
            }
            setStreaming(false);
            resolve({ mode: execMode });
          };
          pump().catch(reject);
        })
        .catch(reject);
    });
  }, [backendUrl, rawText, pdfFile, inputMode]);

  // Analyze handler
  const handleAnalyze = async () => {
    if (inputMode === "text" && !rawText.trim()) { toast.error("Please paste your lab report text."); return; }
    if (inputMode === "pdf" && !pdfFile)         { toast.error("Please upload a PDF file.");           return; }
    if (!isAuthenticated)                         { toast.error("You must be logged in.");              return; }

    setLoading(true);
    reset();

    try {
      if (mode === "v1") {
        addLog("System", "Starting Standard AI analysis (V1)...");
        addLog("Gemini", inputMode === "pdf" ? "Extracting data from PDF report..." : "Processing report text...");
        addLog("Cache", "Checking Redis semantic cache...");
        addLog("Pinecone", "Searching ICMR/MoHFW knowledge base...");
        addLog("Gemini", "Generating diagnosis from retrieved guidelines...");
        const data = await runV1();
        if (!data.success) throw new Error(data.error || "Analysis failed.");
        setV1Result(data);
        addLog("System", "Analysis complete!", "success");
      } else if (mode === "v2") {
        await runSSE("v2");
      } else {
        // Auto Cascade mode
        const result = await runSSE("auto");
        if (result?.mode === "v1") {
          addLog("System", "Auto-Cascade: escalating to deep research...");
          await runSSE("v2");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Analysis failed.");
      addLog("System", err.message || "An error occurred.", "error");
    } finally {
      setLoading(false);
      fetchPastReports();
    }
  };

  const isRunning = loading || streaming;
  const activeMode = MODES.find(m => m.id === mode);

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            AI <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Diagnostics</span>
          </h1>
          <p className="text-base text-gray-600 mt-2 max-w-xl mx-auto">
            Upload your lab report (PDF) or paste clinical findings. Choose between fast RAG search or deep multi-agent research.
          </p>
        </div>
        {!isAuthenticated ? (
          <div className="bg-white rounded-lg shadow-lg p-12 mb-6 border border-gray-100 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Login Required</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You must be logged in to access the AI Diagnostics feature. Please login or create an account to get your reports analysed by our advanced AI.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full transition-all shadow-md transform hover:scale-105"
            >
              Login to Access
            </button>
          </div>
        ) : (
          <>
        {/* ── Input Card ── */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">

          {/* Input toggle */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => setInputMode("text")}
              className={`cursor-pointer flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 border-2 ${
                inputMode === "text"
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Paste Report Text
            </button>
            <button
              onClick={() => setInputMode("pdf")}
              className={`cursor-pointer flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 border-2 ${
                inputMode === "pdf"
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Upload PDF Report
            </button>
          </div>

          {/* Text input */}
          {inputMode === "text" && (
            <textarea
              id="report-text"
              rows={6}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              disabled={isRunning}
              placeholder={"Paste your blood report text here...\n\nExample:\nHemoglobin: 9.2 g/dL (LOW)\nLDL Cholesterol: 190 mg/dL (HIGH)\nFasting Glucose: 128 mg/dL (HIGH)"}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-700 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none disabled:opacity-50 bg-gray-50"
            />
          )}

          {/* PDF upload */}
          {inputMode === "pdf" && (
            <>
              <div
                onClick={() => !pdfFile && fileInputRef.current?.click()}
                className={`w-full relative rounded-xl text-center overflow-hidden transition-all duration-300 ${
                  pdfFile
                    ? "border-0 shadow-lg bg-white ring-1 ring-gray-200 h-[450px]"
                    : "border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 p-10 cursor-pointer"
                }`}
              >
                {pdfFile ? (
                  <div className="w-full h-full relative group flex flex-col">
                    <div className="bg-gray-100 px-4 py-2 flex items-center justify-between border-b border-gray-200 shrink-0">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xl">📄</span>
                        <span className="font-semibold text-gray-700 text-sm truncate">{pdfFile.name}</span>
                        <span className="text-xs text-gray-500 font-medium">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer shrink-0"
                      >
                        Change File
                      </button>
                    </div>
                    <object
                      data={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      type="application/pdf"
                      className="w-full flex-1"
                    >
                      <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-2">
                        <span className="text-4xl">📄</span>
                        <p>Preview not available in this browser.</p>
                      </div>
                    </object>
                  </div>
                ) : (
                  <>
                    <p className="text-4xl text-gray-300 mb-2 mt-4">📄</p>
                    <p className="font-semibold text-gray-700 text-sm">Click to upload your blood report PDF</p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Max 10MB · Fully supported in both V1 Standard RAG & V2 Multi-Agent</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={isRunning}
              />
            </>
          )}
        </div>

        {/* ── Analysis Mode Comparison ── */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-800">Choose AI Pipeline Engine</h3>
              <p className="text-xs text-gray-500">Select based on your clinical accuracy requirement & credit budget</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-full border border-gray-200">
              PDF & Text Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODES.map(m => {
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`cursor-pointer relative flex flex-col justify-between text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                    isActive
                      ? `${m.activeBorder} ${m.activeBg} shadow-md ring-2 ${m.activeRing}`
                      : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {m.recommended && (
                    <span className="absolute -top-2.5 right-3 text-[9px] font-extrabold bg-purple-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      Smart Recommended
                    </span>
                  )}

                  <div>
                    {/* Header line */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${m.tagColor}`}>
                        {m.tag}
                      </span>
                      <div className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-0.5 rounded-md text-[11px] font-bold text-gray-700 shadow-2xs">
                        <span>{m.price}</span>
                        <span className="text-[9px] text-gray-400">({m.costCredit})</span>
                      </div>
                    </div>

                    <h4 className="font-extrabold text-gray-900 text-base mb-1">{m.label}</h4>
                    <p className="text-gray-600 text-xs leading-relaxed mb-3">{m.description}</p>
                  </div>

                  {/* Advantages bullet list */}
                  <div className="border-t border-gray-200/60 pt-3 mt-1 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
                      <span>Speed:</span>
                      <span className="text-gray-800">{m.speed}</span>
                    </div>
                    {m.advantages.map((adv, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{adv}</span>
                      </div>
                    ))}
                  </div>

                  {isActive && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Analyze Button ── */}
        <button
          id="analyze-btn"
          onClick={handleAnalyze}
          disabled={isRunning}
          className="cursor-pointer w-full py-4 rounded-lg font-bold text-lg text-white transition-all duration-300
            bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-500 hover:to-green-400
            shadow-md hover:shadow-lg hover:shadow-blue-500/30 transform hover:scale-[1.01]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-[0.99]"
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {streaming ? "Agents researching..." : "Analysing report..."}
            </span>
          ) : (
            `Run ${activeMode?.label} Analysis`
          )}
        </button>

        {/* ── Agent Status Board ── */}
        {(sseLogs.length > 0 || streaming) && (
          <AgentStatusBoard logs={sseLogs} isStreaming={streaming} />
        )}

        {/* ── V1/V2 Result ── */}
        <div id="diagnostic-results">
          {v1Result && <V1ResultPanel data={v1Result} />}
        </div>

        {/* ── Past Reports History ── */}
        {isAuthenticated && pastReports.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100 mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                  <span>📋</span> Previous Diagnostic History
                </h3>
                <p className="text-xs text-gray-500">View and inspect your previously analyzed lab reports and diagnostic records</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full border border-blue-200">
                {pastReports.length} {pastReports.length === 1 ? 'Report' : 'Reports'} Saved
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {pastReports.map((report) => {
                const dateStr = new Date(report.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });
                const condition = report.aiAnalysis?.condition_suspected || "Lab Analysis Record";
                const urgency = report.aiAnalysis?.urgency || "MEDIUM";
                const urgencyColor = urgency === "HIGH" ? "bg-red-100 text-red-700 border-red-200" : urgency === "LOW" ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200";

                return (
                  <div key={report._id} className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-blue-50/50 border border-gray-200 rounded-lg transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-sm">{condition}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${urgencyColor}`}>
                          {urgency}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-3">
                        <span>📅 {dateStr}</span>
                        {report.patientName && <span>👤 {report.patientName}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectPastReport(report)}
                      className="cursor-pointer text-xs font-bold bg-white text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white px-3.5 py-1.5 rounded-lg transition-all shadow-2xs"
                    >
                      View Report →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

          </>
        )}

      </div>
      <MedicalChatBot />
    </div>
  );
};

export default AiDiagnostic;
