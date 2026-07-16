import { useState, useCallback, useContext, useRef } from "react";
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
    label: "Standard AI",
    tag: "V1",
    tagColor: "bg-green-100 text-green-700 border-green-200",
    description: "Fast single-pipeline RAG analysis with Redis caching",
    activeRing: "ring-green-500",
    activeBg: "bg-green-50",
    activeBorder: "border-green-400",
  },
  {
    id: "v2",
    label: "Deep Agentic Research",
    tag: "V2",
    tagColor: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Parallel multi-agent specialists with live research streaming",
    activeRing: "ring-blue-500",
    activeBg: "bg-blue-50",
    activeBorder: "border-blue-400",
  },
  {
    id: "auto",
    label: "Auto-Cascade",
    tag: "SMART",
    tagColor: "bg-orange-100 text-orange-700 border-orange-200",
    description: "V1 first — auto-escalates to V2 for complex reports",
    activeRing: "ring-orange-500",
    activeBg: "bg-orange-50",
    activeBorder: "border-orange-400",
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
  const { token, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  // Input
  const [inputMode, setInputMode] = useState("text");
  const [rawText, setRawText]     = useState("");
  const [pdfFile, setPdfFile]     = useState(null);
  const fileInputRef              = useRef(null);

  // Execution
  const [mode, setMode]             = useState("auto");
  const [loading, setLoading]       = useState(false);
  const [v1Result, setV1Result]     = useState(null);
  const [sseLogs, setSseLogs]       = useState([]);
  const [streaming, setStreaming]   = useState(false);
  const abortRef                    = useRef(null);

  const addLog = (agent, message, type = "log") => {
    setSseLogs(prev => [...prev, { agent, message, type, ts: Date.now() }]);
  };

  const reset = () => {
    setV1Result(null); setSseLogs([]); setStreaming(false);
    abortRef.current?.abort?.(); abortRef.current = null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") { setPdfFile(file); }
    else { toast.error("Please upload a valid PDF file."); setPdfFile(null); }
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

  // V2 SSE stream
  const runSSE = useCallback((execMode) => {
    return new Promise((resolve, reject) => {
      setStreaming(true); setSseLogs([]); setSseReport(null);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const textPayload = inputMode === "pdf" && pdfFile
        ? `[PDF: ${pdfFile.name}] — PDF upload uses Standard AI.`
        : rawText;

      fetch(`${backendUrl}/api/agent/v2/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
        body: JSON.stringify({ rawPdfText: textPayload, executionMode: execMode }),
        signal: ctrl.signal,
      })
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
                setV1Result({ success: true, analysis: p.analysis, rag_sources: [{ source: "Deep Agentic Research Pipeline" }] }); 
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
  }, [backendUrl, rawText, pdfFile, inputMode, token]);

  // Analyze handler
  const handleAnalyze = async () => {
    if (inputMode === "text" && !rawText.trim()) { toast.error("Please paste your lab report text."); return; }
    if (inputMode === "pdf" && !pdfFile)         { toast.error("Please upload a PDF file.");           return; }
    if (!token)                                  { toast.error("You must be logged in.");              return; }

    if (inputMode === "pdf" && mode === "v2") {
      toast.info("PDF uploads use Standard AI. Switching to V1.");
      setMode("v1");
    }

    setLoading(true);
    reset();

    try {
      if (mode === "v1" || inputMode === "pdf") {
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
    }
  };

  const isRunning = loading || streaming;
  const activeMode = MODES.find(m => m.id === mode);

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4">

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">
            AI <span className="text-blue-600">Diagnostics</span>
          </h1>
          <p className="text-lg text-gray-600 mt-3">
            Upload your blood report or paste the text. Powered by ICMR & MoHFW clinical guidelines.
          </p>
        </div>
        {!token ? (
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
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-100">

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
              Paste Text
            </button>
            <button
              onClick={() => setInputMode("pdf")}
              className={`cursor-pointer flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 border-2 ${
                inputMode === "pdf"
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Upload PDF
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
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200 ${
                  pdfFile
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                {pdfFile ? (
                  <>
                    <p className="text-3xl mb-2">✅</p>
                    <p className="font-semibold text-green-700 text-sm">{pdfFile.name}</p>
                    <p className="text-xs text-green-600 mt-1">{(pdfFile.size / 1024).toFixed(1)} KB · Click to change</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl text-gray-300 mb-2">📄</p>
                    <p className="font-semibold text-gray-500 text-sm">Click to upload your blood report PDF</p>
                    <p className="text-xs text-gray-400 mt-1">Max 10MB · Blood test reports only</p>
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
              {inputMode === "pdf" && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                  PDF upload uses Standard AI (V1). For multi-agent deep research, paste the report text.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Analysis Mode ── */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Select Analysis Mode</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            {MODES.map(m => {
              const isActive = (inputMode === "pdf" ? "v1" : mode) === m.id;
              const isDisabled = inputMode === "pdf" && m.id !== "v1";
              return (
                <button
                  key={m.id}
                  onClick={() => !isDisabled && setMode(m.id)}
                  disabled={isDisabled}
                  className={`cursor-pointer relative flex-1 text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                    isActive
                      ? `${m.activeBorder} ${m.activeBg} shadow-md ring-1 ${m.activeRing}`
                      : isDisabled
                        ? "border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed"
                        : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {m.recommended && (
                    <span className="absolute -top-2.5 right-3 text-[9px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      Recommended
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800 text-sm">{m.label}</span>
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.tagColor}`}>
                      {m.id !== "v1" && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${m.id === 'v2' ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${m.id === 'v2' ? 'bg-blue-600' : 'bg-orange-600'}`}></span>
                        </span>
                      )}
                      {m.tag}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">{m.description}</p>
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

        {/* ── V1 Result ── */}
        {v1Result && <V1ResultPanel data={v1Result} />}

          </>
        )}

      </div>
      <MedicalChatBot />
    </div>
  );
};

export default AiDiagnostic;
