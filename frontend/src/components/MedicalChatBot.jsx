import React, { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from '../context/AppContext';
import AIResponseDisplay from './AIResponseDisplay';
// import { assets } from '../assets/assets'; // Ensure this path is correct if using icons

const MedicalChatBot = () => {
  const { token } = useContext(AppContext);
  const backendUrl = import.meta.env.VITE_BACKEND_URL; 
  
  // UI States
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [messages, setMessages] = useState([
    { type: 'bot', text: "👋 Hello! I'm your AI Medical Assistant. Upload a lab report PDF or describe your symptoms." }
  ]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);

  // Refs
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null); 

  // --- 1. LOAD HISTORY FROM DATABASE ---
  useEffect(() => {
    if (token && isOpen) {
        loadChatHistory();
    }
  }, [token, isOpen]);

  const loadChatHistory = async () => {
    try {
        const { data } = await axios.post(`${backendUrl}/api/chat/get`, {}, { headers: { token } });
        if (data.success && data.history.length > 0) {
            setMessages(data.history);
        }
    } catch (err) {
        console.error("Could not load history:", err);
    }
  };

  // --- 2. SAVE HELPER ---
  const saveToDb = async (msgObject) => {
      if (!token) return; // Don't save for guests
      try {
        await axios.post(`${backendUrl}/api/chat/save`, { message: msgObject }, { headers: { token } });
      } catch (err) {
        console.error("Failed to save message:", err);
      }
  };

  // Auto-scroll logic
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isOpen]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
    }
  };

  const clearFileSelection = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  // Clear Chat (Optional - clears from UI only or add API to clear DB)
  const clearChat = () => {
    if (window.confirm("Start a new conversation? This will clear the current view.")) {
      const initialMsg = [{ type: 'bot', text: "👋 Hello! I'm your AI Medical Assistant. Upload a lab report PDF or describe your symptoms." }];
      setMessages(initialMsg);
      // Optional: Add API call here to clear DB history if you implemented that endpoint
    }
  };

  const handleSend = async () => {
    if (!input && !file) return;

    // 1. CREATE USER MESSAGE
    const userMsg = { 
        type: 'user', 
        text: input, 
        fileName: file ? file.name : null 
    };

    // Update UI & Save to DB
    setMessages(prev => [...prev, userMsg]);
    saveToDb(userMsg); 
    
    // Capture data & Reset Inputs
    const currentInput = input;
    const currentFile = file;

    setInput("");
    clearFileSelection(); 
    setLoading(true);

    try {
      // 2. PREPARE API CALL
      const formData = new FormData();
      if (currentInput) formData.append('user_context', currentInput);
      if (currentFile) formData.append('pdf', currentFile);

      // Call Analysis API
      const { data } = await axios.post(`${backendUrl}/api/lab/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'token': token 
        }
      });

      // 3. HANDLE RESPONSE
      let botResponse;
      if (data.analysis) {
        botResponse = {
          type: 'bot',
          isReport: true, 
          data: data 
        };
      } else {
         botResponse = { 
            type: 'bot', 
            text: "I processed your request but didn't get a clear diagnosis. Please try again with more details." 
         };
      }

      // Update UI & Save to DB
      setMessages(prev => [...prev, botResponse]);
      saveToDb(botResponse);

    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || "Sorry, I encountered an error. Please try again.";
      const errorResponse = { type: 'bot', text: `⚠️ ${errorMsg}` };
      setMessages(prev => [...prev, errorResponse]);
      // Optional: save error messages to DB
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center justify-center w-14 h-14"
        >
          {isOpen ? (
            <span className="text-2xl font-bold">✕</span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          )}
        </button>
      </div>

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[400px] md:w-[450px] h-[600px] bg-gray-50 rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden animate-fade-in-up">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shadow-md z-10">
            <h3 className="font-bold flex items-center gap-2">
              <span className="text-xl">🩺</span> MediConnect AI
            </h3>
            
            <div className="flex items-center gap-2">
               <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
               {/* RESET BUTTON */}
               <button onClick={clearChat} className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10" title="New Conversation">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
               </button>
            </div>
          </div>

          {/* Messages Area  */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-3 rounded-2xl text-sm shadow-sm ${
                  msg.type === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                  
                  {msg.fileName && (
                    <div className="mt-2 flex items-center gap-2 bg-white/20 p-2 rounded text-xs">
                        <span>📎 {msg.fileName}</span>
                    </div>
                  )}

                  {msg.isReport && (
                    <AIResponseDisplay responseData={msg.data} />
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                 <div className="bg-white border px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    <span className="text-xs text-gray-500 font-medium">Analyzing Report...</span>
                 </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t">
             {/* File Preview */}
             {file && (
                 <div className="mb-2 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium truncate w-4/5">📎 {file.name}</span>
                    <button onClick={clearFileSelection} className="text-red-500 hover:text-red-700 text-xs font-bold">Remove</button>
                 </div>
             )}

             <div className="flex items-center gap-2">
                <label className="cursor-pointer p-2 text-gray-400 hover:text-blue-600 transition bg-gray-100 rounded-full hover:bg-blue-50">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    ref={fileInputRef} 
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                </label>

                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={file ? "Type 'Analyze' to send..." : "Type symptoms..."}
                  className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />

                <button 
                  onClick={handleSend}
                  disabled={loading || (!input && !file)}
                  className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
             </div>
          </div>

        </div>
      )}
    </>
  );
};

export default MedicalChatBot;