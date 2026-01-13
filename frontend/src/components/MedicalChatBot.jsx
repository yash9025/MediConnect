import { useState, useRef, useContext, useEffect, useCallback } from "react";
import PropTypes from "prop-types"; // Import PropTypes
import axios from "axios";
import { jsPDF } from "jspdf";
import { AppContext } from "../context/AppContext";
import AIResponseDisplay from "./AIResponseDisplay";

// --- CONSTANTS & CONFIG ---
const CONSTANTS = {
  INITIAL_MESSAGE: {
    type: "bot",
    text: "Analyze blood report. Upload your file or describe symptoms.",
  },
  API_ENDPOINTS: {
    GET_HISTORY: "/api/chat/get",
    SAVE_MESSAGE: "/api/chat/save",
    ANALYZE: "/api/lab/analyze",
  },
};

// --- UTILITIES ---
const convertImageToPDF = (imageFile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const pdf = new jsPDF({
          orientation: img.width > img.height ? "l" : "p",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(img, "JPEG", 0, 0, img.width, img.height);
        resolve(pdf.output("blob"));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(imageFile);
  });
};

// --- CUSTOM HOOK: LOGIC LAYER ---
const useMedicalChat = () => {
  const { token } = useContext(AppContext);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([CONSTANTS.INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (token && isOpen) {
      const loadHistory = async () => {
        try {
          const { data } = await axios.post(
            `${backendUrl}${CONSTANTS.API_ENDPOINTS.GET_HISTORY}`,
            {},
            { headers: { token } }
          );
          if (data.success && data.history.length > 0) {
            setMessages(data.history);
          }
        } catch (err) {
          console.error("Failed to load history:", err);
        }
      };
      loadHistory();
    }
  }, [token, isOpen, backendUrl]);

  const saveToDb = useCallback(async (msgObject) => {
    if (!token) return;
    try {
      await axios.post(
        `${backendUrl}${CONSTANTS.API_ENDPOINTS.SAVE_MESSAGE}`,
        { message: msgObject },
        { headers: { token } }
      );
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  }, [token, backendUrl]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const clearFileSelection = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearChat = () => {
    if (window.confirm("Start a new analysis session?")) {
      setMessages([CONSTANTS.INITIAL_MESSAGE]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !file) return;

    const userMsg = {
      type: "user",
      text: input,
      fileName: file ? file.name : null,
    };

    setMessages((prev) => [...prev, userMsg]);
    saveToDb(userMsg);

    const currentInput = input;
    const originalFile = file;

    setInput("");
    clearFileSelection();
    setLoading(true);

    try {
      const formData = new FormData();
      if (currentInput) formData.append("user_context", currentInput);

      if (originalFile) {
        if (originalFile.type.startsWith("image/")) {
          const pdfBlob = await convertImageToPDF(originalFile);
          formData.append("pdf", pdfBlob, "report.pdf");
        } else {
          formData.append("pdf", originalFile);
        }
      }

      const { data } = await axios.post(
        `${backendUrl}${CONSTANTS.API_ENDPOINTS.ANALYZE}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data", token },
        }
      );

      let botResponse;
      if (data.analysis) {
        botResponse = { type: "bot", isReport: true, data: data };
      } else if (data.message) {
        botResponse = { type: "bot", text: `Analysis Result: ${data.message}` };
      } else {
        botResponse = { type: "bot", text: "Data processed but no specific diagnosis found." };
      }

      setMessages((prev) => [...prev, botResponse]);
      saveToDb(botResponse);
    } catch (error) {
      console.error("Chat API Error:", error);
      const errorMsg = error.response?.data?.message || "Connection error. Please try again.";
      setMessages((prev) => [...prev, { type: "bot", text: `System Error: ${errorMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    loading,
    messages,
    input,
    setInput,
    file,
    fileInputRef,
    chatEndRef,
    handleFileChange,
    clearFileSelection,
    clearChat,
    handleSend,
  };
};

// --- SUB-COMPONENTS (UI LAYER) ---

const ChatTriggerButton = ({ isOpen, onClick }) => (
  <div className="fixed bottom-8 right-8 z-[9999]">
    <button
      onClick={onClick}
      className="group flex items-center gap-3 bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 text-white rounded-full px-6 py-4 
                shadow-xl hover:shadow-2xl 
                ring-4 ring-white border border-emerald-400/20
                hover:scale-105 transition-all duration-300 cursor-pointer"
      aria-label={isOpen ? "Close Chat Assistant" : "Open Chat Assistant"}
    >
      <div className="relative">
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      </div>
      <div className="flex flex-col items-start leading-tight">
        <span className="font-bold text-base tracking-wide text-white drop-shadow-md">Lab Lens AI</span>
        <span className="text-[10px] font-medium text-white/90 uppercase tracking-widest">
          {isOpen ? "Close Assistant" : "Analyze Blood Report"}
        </span>
      </div>
    </button>
  </div>
);

ChatTriggerButton.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

const ChatHeader = ({ onClear }) => (
  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex justify-between items-center relative overflow-hidden shrink-0">
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>

    <div className="flex items-center gap-4 z-10">
      <div className="bg-gradient-to-br from-emerald-400 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-emerald-900/50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
        </svg>
      </div>
      <div>
        <h3 className="font-bold text-xl leading-none tracking-tight flex items-center gap-2">
          Lab Lens <span className="text-emerald-400">AI</span>
          <span className="text-[10px] font-normal text-slate-400 bg-white/10 px-2 py-0.5 rounded-full border border-white/5 tracking-normal">
            Analyze Your Blood Report
          </span>
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <p className="text-[10px] text-emerald-100/70 font-medium uppercase tracking-widest">System Online</p>
        </div>
      </div>
    </div>

    <button onClick={onClear} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10" title="Reset Session">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    </button>
  </div>
);

ChatHeader.propTypes = {
  onClear: PropTypes.func.isRequired,
};

const MessageList = ({ messages, loading, chatEndRef }) => (
  <div className="flex-1 p-5 overflow-y-auto space-y-6 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
    {messages.map((msg, index) => (
      <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
        <div className={`relative max-w-[85%] px-5 py-4 text-sm leading-relaxed shadow-sm ${
          msg.type === "user" ? "bg-slate-800 text-slate-50 rounded-2xl rounded-tr-none" : "bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-tl-none"
        }`}>
          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
          {msg.fileName && (
            <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-600 shrink-0">
                <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-emerald-800 truncate">{msg.fileName}</span>
            </div>
          )}
          {msg.isReport && <div className="mt-4 -mx-2"><AIResponseDisplay responseData={msg.data} /></div>}
        </div>
      </div>
    ))}

    {loading && (
      <div className="flex justify-start">
        <div className="bg-white border border-emerald-100 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Analyzing...</span>
        </div>
      </div>
    )}
    <div ref={chatEndRef} />
  </div>
);

MessageList.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      text: PropTypes.string,
      fileName: PropTypes.string,
      isReport: PropTypes.bool,
      data: PropTypes.object,
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  chatEndRef: PropTypes.shape({ current: PropTypes.any }), // Refs can be tricky, using shape is safe
};

const InputArea = ({ input, setInput, file, fileInputRef, onFileChange, onClearFile, onSend, loading }) => (
  <div className="p-4 bg-white border-t border-slate-100 shrink-0">
    {file && (
      <div className="mb-3 flex items-center justify-between bg-sky-50 px-4 py-2.5 rounded-xl border border-sky-100 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="bg-sky-500 text-white p-1 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-xs text-sky-900 font-semibold truncate max-w-[200px]">{file.name}</span>
        </div>
        <button onClick={onClearFile} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    )}

    <div className="flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
      <label className="cursor-pointer p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all group" title="Upload Report">
        <input type="file" accept=".pdf,image/*" className="hidden" onChange={onFileChange} ref={fileInputRef} />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 group-hover:scale-110 transition-transform">
          <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
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
        placeholder={file ? "Type 'Analyze' to process..." : "Ask Lab Lens or upload a report..."}
        className="flex-1 bg-transparent border-0 p-3 text-sm focus:ring-0 text-slate-700 placeholder:text-slate-400 resize-none max-h-32"
        rows={1}
      />

      <button onClick={onSend} disabled={loading || (!input && !file)} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-200">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
        </svg>
      </button>
    </div>
  </div>
);

InputArea.propTypes = {
  input: PropTypes.string.isRequired,
  setInput: PropTypes.func.isRequired,
  file: PropTypes.object,
  fileInputRef: PropTypes.shape({ current: PropTypes.any }),
  onFileChange: PropTypes.func.isRequired,
  onClearFile: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

// --- MAIN COMPONENT ---
const MedicalChatBot = () => {
  const chat = useMedicalChat();

  return (
    <>
      <ChatTriggerButton isOpen={chat.isOpen} onClick={() => chat.setIsOpen(!chat.isOpen)} />

      {chat.isOpen && (
        <div className="fixed bottom-28 right-6 md:right-10 w-[95vw] md:w-[550px] h-[600px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-[9999] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 ring-1 ring-black/5">
          
          <ChatHeader onClear={chat.clearChat} />

          <MessageList 
            messages={chat.messages} 
            loading={chat.loading} 
            chatEndRef={chat.chatEndRef} 
          />

          <InputArea
            input={chat.input}
            setInput={chat.setInput}
            file={chat.file}
            fileInputRef={chat.fileInputRef}
            onFileChange={chat.handleFileChange}
            onClearFile={chat.clearFileSelection}
            onSend={chat.handleSend}
            loading={chat.loading}
          />
        </div>
      )}
    </>
  );
};

export default MedicalChatBot;