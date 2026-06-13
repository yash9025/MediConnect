import React, { useEffect, useRef } from "react";

// Color config per agent — light theme version
const AGENT_CONFIG = {
  "System":                     { bg: "bg-slate-100",  border: "border-slate-300", text: "text-slate-600",  dot: "bg-slate-400"   },
  "Extractor Agent":            { bg: "bg-violet-50",  border: "border-violet-200",text: "text-violet-700", dot: "bg-violet-500"  },
  "Triage Agent":               { bg: "bg-amber-50",   border: "border-amber-200", text: "text-amber-700",  dot: "bg-amber-500"   },
  "Router":                     { bg: "bg-cyan-50",    border: "border-cyan-200",  text: "text-cyan-700",   dot: "bg-cyan-500"    },
  "Synthesizer Agent":          { bg: "bg-green-50",   border: "border-green-200", text: "text-green-700",  dot: "bg-green-500"   },
  "Cardiology Specialist":      { bg: "bg-rose-50",    border: "border-rose-200",  text: "text-rose-700",   dot: "bg-rose-500"    },
  "Endocrinology Specialist":   { bg: "bg-orange-50",  border: "border-orange-200",text: "text-orange-700", dot: "bg-orange-500"  },
  "Nephrology Specialist":      { bg: "bg-blue-50",    border: "border-blue-200",  text: "text-blue-700",   dot: "bg-blue-500"    },
  "Hematology Specialist":      { bg: "bg-red-50",     border: "border-red-200",   text: "text-red-700",    dot: "bg-red-500"     },
  "Pulmonology Specialist":     { bg: "bg-sky-50",     border: "border-sky-200",   text: "text-sky-700",    dot: "bg-sky-500"     },
  "Gastroenterology Specialist":{ bg: "bg-yellow-50",  border: "border-yellow-200",text: "text-yellow-700", dot: "bg-yellow-500"  },
  "Dermatology Specialist":     { bg: "bg-pink-50",    border: "border-pink-200",  text: "text-pink-700",   dot: "bg-pink-500"    },
  "Infectious Disease Specialist":{ bg: "bg-lime-50",  border: "border-lime-200",  text: "text-lime-700",   dot: "bg-lime-600"    },
  "General Medicine Specialist":{ bg: "bg-teal-50",    border: "border-teal-200",  text: "text-teal-700",   dot: "bg-teal-500"    },
  "Cache":                      { bg: "bg-indigo-50",  border: "border-indigo-200",text: "text-indigo-700", dot: "bg-indigo-500"  },
  "Gemini":                     { bg: "bg-blue-50",    border: "border-blue-200",  text: "text-blue-700",   dot: "bg-blue-500"    },
  "Pinecone":                   { bg: "bg-green-50",   border: "border-green-200", text: "text-green-700",  dot: "bg-green-600"   },
  "error":                      { bg: "bg-red-50",     border: "border-red-300",   text: "text-red-700",    dot: "bg-red-500"     },
};

function getConfig(agent, isError) {
  if (isError) return AGENT_CONFIG["error"];
  return AGENT_CONFIG[agent] || AGENT_CONFIG["System"];
}

const LogLine = ({ log, isLast }) => {
  const isError = log.type === "error";
  const cfg = getConfig(log.agent, isError);
  const timestamp = new Date(log.ts).toLocaleTimeString("en-IN", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${cfg.bg} ${cfg.border}`}>
      {/* Dot */}
      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${cfg.dot} ${isLast ? "animate-pulse" : ""}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{log.agent}</span>
          <span className="text-xs text-gray-400">{timestamp}</span>
        </div>
        <p className={`text-sm mt-0.5 leading-relaxed ${isError ? "text-red-700 font-medium" : "text-gray-700"}`}>
          {log.message}
        </p>
      </div>
    </div>
  );
};

const AgentStatusBoard = ({ logs, isStreaming }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (logs.length === 0 && !isStreaming) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-sm">
            <span className="text-lg">🧬</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Agent Execution Log</h3>
            <p className="text-xs text-slate-500">Real-time multi-agent research pipeline</p>
          </div>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
            LIVE
          </span>
        )}
      </div>

      {/* Log Body */}
      <div className="max-h-80 overflow-y-auto p-4 space-y-2 scroll-smooth bg-white">
        {logs.map((log, i) => (
          <LogLine key={i} log={log} isLast={i === logs.length - 1 && isStreaming} />
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <svg className="animate-spin h-4 w-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm text-blue-600 font-medium">Agents processing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

    </div>
  );
};

export default AgentStatusBoard;
