import React, {
  useState,
  useRef,
  useContext,
  useEffect,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { AppContext } from "../../../context/AppContext";
import AIResponseDisplay from "./AIResponseDisplay";

// --- CONFIGURATION ---
const CONFIG = {
  ENDPOINTS: {
    GET_HISTORY: "/api/chat/get",
    SAVE_MESSAGE: "/api/chat/save",
    DELETE_HISTORY: "/api/chat/delete",
    ANALYZE: "/api/lab/analyze",
  },
  INITIAL_MSG: {
    type: "bot",
    text: "Hello! I am LabLens AI. Upload your blood report or describe your symptoms to get started.",
  },
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
};

// --- CUSTOM HOOK ---
const useMedicalChat = () => {
  const { token } = useContext(AppContext);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [state, setState] = useState({
    isOpen: false,
    isLoading: false,
    messages: [CONFIG.INITIAL_MSG],
    input: "",
    file: null,
    showResetModal: false,
    isDeleting: false,
  });

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Helper to update specific state properties
  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // 1. Auto-scroll to bottom
  useEffect(() => {
    if (state.isOpen) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [state.messages.length, state.isLoading, state.isOpen]);

  // 2. Load History on Open
  useEffect(() => {
    if (!token || !state.isOpen) return;
    const controller = new AbortController();

    const fetchHistory = async () => {
      try {
        const { data } = await axios.post(
          `${backendUrl}${CONFIG.ENDPOINTS.GET_HISTORY}`,
          {},
          { headers: { token }, signal: controller.signal }
        );
        if (data.success && data.history?.length > 0) {
          updateState({ messages: data.history });
        }
      } catch (err) {
        if (!axios.isCancel(err)) console.error("History fetch failed:", err);
      }
    };
    fetchHistory();
    return () => controller.abort();
  }, [token, state.isOpen, backendUrl, updateState]);

  // 3. Background Save (Fire & Forget)
  const saveMessageToDb = useCallback(
    async (msg) => {
      if (!token) return;
      try {
        await axios.post(
          `${backendUrl}${CONFIG.ENDPOINTS.SAVE_MESSAGE}`,
          { message: msg },
          { headers: { token } }
        );
      } catch (err) {
        console.warn("Failed to save message history:", err);
      }
    },
    [token, backendUrl]
  );

  // 4. Handlers
  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
        alert("Invalid file type. Please upload PDF or Images.");
        return;
      }
      if (file.size > CONFIG.MAX_FILE_SIZE) {
        alert("File too large. Max size is 5MB.");
        return;
      }
      updateState({ file });
    },
    [updateState]
  );

  const clearFile = useCallback(() => {
    updateState({ file: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [updateState]);

  // Show reset confirmation modal
  const showResetConfirm = useCallback(() => {
    updateState({ showResetModal: true });
  }, [updateState]);

  // Hide reset confirmation modal
  const hideResetConfirm = useCallback(() => {
    updateState({ showResetModal: false });
  }, [updateState]);

  // Delete chat history from database and reset local state
  const confirmResetChat = useCallback(async () => {
    if (!token) {
      updateState({ 
        messages: [CONFIG.INITIAL_MSG], 
        file: null, 
        input: "", 
        showResetModal: false 
      });
      return;
    }

    updateState({ isDeleting: true });
    
    try {
      const { data } = await axios.delete(
        `${backendUrl}${CONFIG.ENDPOINTS.DELETE_HISTORY}`,
        { headers: { token } }
      );
      
      if (data.success) {
        updateState({ 
          messages: [CONFIG.INITIAL_MSG], 
          file: null, 
          input: "", 
          showResetModal: false,
          isDeleting: false 
        });
      } else {
        console.error("Failed to delete chat history:", data.message);
        updateState({ showResetModal: false, isDeleting: false });
      }
    } catch (err) {
      console.error("Delete history error:", err);
      // Still clear local state even if API fails
      updateState({ 
        messages: [CONFIG.INITIAL_MSG], 
        file: null, 
        input: "", 
        showResetModal: false,
        isDeleting: false 
      });
    }
  }, [token, backendUrl, updateState]);

  const toggleChat = useCallback(() => {
    updateState({ isOpen: !state.isOpen });
  }, [state.isOpen, updateState]);

  const setInput = useCallback(
    (val) => updateState({ input: val }),
    [updateState]
  );

  // 5. Main Send Logic
  const sendMessage = useCallback(async () => {
    const { input, file } = state;
    if (!input.trim() && !file) return;

    // Optimistic Update
    const userMsg = { type: "user", text: input, fileName: file?.name || null };
    updateState({
      messages: [...state.messages, userMsg],
      input: "",
      file: null,
      isLoading: true,
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
    saveMessageToDb(userMsg);

    try {
      const formData = new FormData();
      if (input) formData.append("user_context", input);
      if (file) formData.append("pdf", file);

      const { data } = await axios.post(
        `${backendUrl}${CONFIG.ENDPOINTS.ANALYZE}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data", token } }
      );

      const botMsg = data.analysis
        ? { type: "bot", isReport: true, data }
        : {
            type: "bot",
            text:
              data.message || "I processed that but found no specific results.",
          };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, botMsg],
        isLoading: false,
      }));
      saveMessageToDb(botMsg);
    } catch (error) {
      console.error("Analysis Error:", error);
      const errorText =
        error.response?.data?.message || "Connection failed. Please try again.";
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { type: "bot", text: `Error: ${errorText}` },
        ],
        isLoading: false,
      }));
    }
  }, [state, backendUrl, token, saveMessageToDb, updateState]);

  return {
    ...state,
    setInput,
    toggleChat,
    showResetConfirm,
    hideResetConfirm,
    confirmResetChat,
    handleFileSelect,
    clearFile,
    sendMessage,
    chatEndRef,
    fileInputRef,
  };
};

// --- PRESENTATIONAL COMPONENTS (Memoized) ---

const ChatTrigger = React.memo(({ isOpen, onClick }) => (
  <div className="fixed bottom-8 right-8 z-[9990]">
    <button
      onClick={onClick}
      aria-label={isOpen ? "Close Chat" : "Open Chat"}
      className="cursor-pointer group flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-full px-6 py-4 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ring-4 ring-white border border-emerald-400/20"
    >
      <div className="relative">
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        {/* Chat Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
          />
        </svg>
      </div>
      <div className="text-left leading-tight">
        <span className="block font-bold text-base tracking-wide drop-shadow-md">
          LabLens AI
        </span>
        <span className="block text-[10px] font-medium text-white/90 uppercase tracking-widest">
          {isOpen ? "Close" : "Analyze Report"}
        </span>
      </div>
    </button>
  </div>
));

const ChatHeader = React.memo(({ onReset }) => (
  <header className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex justify-between items-center shadow-md z-10 shrink-0">
    <div className="flex items-center gap-3">
      <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 text-emerald-400"
        >
          <path
            fillRule="evenodd"
            d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div>
        <h3 className="font-bold text-lg">LabLens Assistant</h3>
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Online & Ready
        </p>
      </div>
    </div>
    <button
      onClick={onReset}
      className="cursor-pointer text-slate-400 hover:text-white transition-colors p-2 rounded-md hover:bg-white/10 group"
      aria-label="Reset Chat History"
      title="Reset Chat"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    </button>
  </header>
));

const LoadingBubble = React.memo(function LoadingBubble() {
  const [currentStep, setCurrentStep] = React.useState(0);
  
  const steps = [
    { text: "STEP 1: Processing Lab Report...", duration: 1500 },
    { text: "STEP 2: Extracting data from PDF...", duration: 2500 },
    { text: "STEP 3: Filtering abnormal values...", duration: 2000 },
    { text: "STEP 5: Converting to text for RAG query...", duration: 1500 },
    { text: "STEP 6: Querying medical knowledge base (RAG)...", duration: 3000 },
    { text: "STEP 7: Generating AI response with RAG context...", duration: 4000 },
    { text: "STEP 8: Finding matching specialists...", duration: 2000 },
  ];

  React.useEffect(() => {
    if (currentStep >= steps.length - 1) return;
    
    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, steps[currentStep].duration);
    
    return () => clearTimeout(timer);
  }, [currentStep]);

  return (
    <div className="flex justify-start animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 px-5 py-4 rounded-2xl rounded-tl-none shadow-lg min-w-[340px]">
        <div className="font-mono text-xs space-y-1">
          {steps.slice(0, currentStep + 1).map((step, idx) => (
            <div 
              key={idx}
              className={`flex items-center gap-2 ${
                idx === currentStep ? 'text-white' : 'text-emerald-400'
              }`}
            >
              {idx === currentStep ? (
                <svg className="w-3 h-3 text-emerald-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : (
                <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span>{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Reset Confirmation Modal
const ResetConfirmModal = React.memo(({ isOpen, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Icon */}
        <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-7 h-7 text-rose-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
          Reset Chat History?
        </h3>
        <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
          This will permanently delete your entire chat history including all uploaded reports and analysis results. This action cannot be undone.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="cursor-pointer flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="cursor-pointer flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 transition-all shadow-sm hover:shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Reset Chat
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

ResetConfirmModal.displayName = "ResetConfirmModal";
ResetConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isDeleting: PropTypes.bool,
};

const MessageList = React.memo(({ messages, isLoading, chatEndRef }) => (
  <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-slate-50 to-slate-100 scroll-smooth">
    {messages.map((msg, idx) => (
      <div
        key={idx}
        className={`flex ${
          msg.type === "user" ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`max-w-[90%] rounded-2xl p-5 shadow-md text-[15px] leading-relaxed ${
            msg.type === "user"
              ? "bg-gradient-to-br from-slate-800 to-slate-900 text-slate-50 rounded-tr-none"
              : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
          }`}
        >
          {msg.text && (
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          )}

          {msg.fileName && (
            <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm4.75 6.75a.75.75 0 0 1 1.5 0v2.546l.943-1.048a.75.75 0 0 1 1.114 1.004l-2.25 2.5a.75.75 0 0 1-1.114 0l-2.25-2.5a.75.75 0 1 1 1.114-1.004l.943 1.048V8.75Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-semibold truncate">
                {msg.fileName}
              </span>
            </div>
          )}

          {msg.isReport && msg.data && (
            <div className="mt-4">
              <AIResponseDisplay responseData={msg.data} />
            </div>
          )}
        </div>
      </div>
    ))}
    {isLoading && <LoadingBubble />}
    <div ref={chatEndRef} />
  </div>
));

const InputArea = React.memo(
  ({
    input,
    setInput,
    file,
    fileRef,
    onFileSelect,
    onClearFile,
    onSend,
    isLoading,
  }) => (
    <div className="bg-white p-4 border-t border-slate-100">
      {/* File Preview */}
      {file && (
        <div className="flex items-center justify-between bg-sky-50 border border-sky-100 rounded-lg p-2 mb-3 animate-in slide-in-from-bottom-2 fade-in">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="bg-sky-500 text-white p-1 rounded">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3 h-3"
              >
                <path
                  fillRule="evenodd"
                  d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-sky-900 truncate max-w-[180px]">
              {file.name}
            </span>
          </div>
          <button
            onClick={onClearFile}
            className="cursor-pointer text-slate-400 hover:text-red-500 transition-colors p-1"
            aria-label="Remove file"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
        <label
          className="cursor-pointer p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
          title="Attach Report"
        >
          <input
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            ref={fileRef}
            onChange={onFileSelect}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
            />
          </svg>
        </label>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={isLoading}
          placeholder={
            file
              ? "Add context about this report..."
              : "Ask LabLens or upload a report..."
          }
          className="flex-1 bg-transparent border-none focus:ring-0 p-2 text-sm text-slate-800 placeholder:text-slate-400 resize-none max-h-32 disabled:opacity-50"
          rows={1}
        />

        <button
          onClick={onSend}
          disabled={isLoading || (!input.trim() && !file)}
          className="cursor-pointer p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
          aria-label="Send Message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </div>
    </div>
  )
);

// --- PROPTYPES ---
ChatTrigger.displayName = "ChatTrigger";
ChatHeader.displayName = "ChatHeader";
MessageList.displayName = "MessageList";
InputArea.displayName = "InputArea";

ChatTrigger.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};
ChatHeader.propTypes = { onReset: PropTypes.func.isRequired };
MessageList.propTypes = {
  messages: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  chatEndRef: PropTypes.object.isRequired,
};
InputArea.propTypes = {
  input: PropTypes.string.isRequired,
  setInput: PropTypes.func.isRequired,
  file: PropTypes.object,
  fileRef: PropTypes.object.isRequired,
  onFileSelect: PropTypes.func.isRequired,
  onClearFile: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

// --- MAIN COMPONENT ---
const MedicalChatBot = () => {
  const chat = useMedicalChat();

  return (
    <>
      <ChatTrigger isOpen={chat.isOpen} onClick={chat.toggleChat} />

      {/* Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={chat.showResetModal}
        onConfirm={chat.confirmResetChat}
        onCancel={chat.hideResetConfirm}
        isDeleting={chat.isDeleting}
      />

      {chat.isOpen && (
        <div className="fixed bottom-28 right-4 md:right-8 w-[calc(100vw-2rem)] md:w-[600px] lg:w-[700px] h-[700px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-[9999] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 ring-1 ring-black/5">
          <ChatHeader onReset={chat.showResetConfirm} />

          <MessageList
            messages={chat.messages}
            isLoading={chat.isLoading}
            chatEndRef={chat.chatEndRef}
          />

          <InputArea
            input={chat.input}
            setInput={chat.setInput}
            file={chat.file}
            fileRef={chat.fileInputRef}
            onFileSelect={chat.handleFileSelect}
            onClearFile={chat.clearFile}
            onSend={chat.sendMessage}
            isLoading={chat.isLoading}
          />
        </div>
      )}
    </>
  );
};

export default MedicalChatBot;
