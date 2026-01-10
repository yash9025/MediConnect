import { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from "jspdf";
import { AppContext } from '../context/AppContext';
import AIResponseDisplay from './AIResponseDisplay';

const MedicalChatBot = () => {
    const { token } = useContext(AppContext);
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // UI States
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Data States
    const [messages, setMessages] = useState([
        { type: 'bot', text: "Hello! I am your AI Medical Assistant. Upload a lab report PDF or Image, or describe your symptoms." }
    ]);
    const [input, setInput] = useState("");
    const [file, setFile] = useState(null);

    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- 1. LOAD HISTORY ---
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
            console.error("History fetch error:", err);
        }
    };

    // --- 2. SAVE HELPER ---
    const saveToDb = async (msgObject) => {
        if (!token) return;
        try {
            await axios.post(`${backendUrl}/api/chat/save`, { message: msgObject }, { headers: { token } });
        } catch (err) {
            console.error("Message save error:", err);
        }
    };

    // --- 3. AUTO-SCROLL ---
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading, isOpen]);

    // --- 4. FILE HANDLING ---
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

    // --- 5. IMAGE TO PDF CONVERTER ---
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
                        format: [img.width, img.height]
                    });
                    pdf.addImage(img, "JPEG", 0, 0, img.width, img.height);
                    resolve(pdf.output("blob"));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });
    };

    const clearChat = () => {
        if (window.confirm("Start a new conversation? This will clear the current view.")) {
            const initialMsg = { type: 'bot', text: "Hello! I am your AI Medical Assistant. Upload a lab report PDF or Image, or describe your symptoms." };
            setMessages([initialMsg]);
        }
    };

    // --- 6. MAIN SEND LOGIC ---
    const handleSend = async () => {
        if (!input && !file) return;

        const userMsg = {
            type: 'user',
            text: input,
            fileName: file ? file.name : null
        };

        setMessages(prev => [...prev, userMsg]);
        saveToDb(userMsg);

        const currentInput = input;
        const originalFile = file;

        setInput("");
        clearFileSelection();
        setLoading(true);

        try {
            const formData = new FormData();
            if (currentInput) formData.append('user_context', currentInput);

            if (originalFile) {
                if (originalFile.type.startsWith("image/")) {
                    const pdfBlob = await convertImageToPDF(originalFile);
                    formData.append('pdf', pdfBlob, "report.pdf");
                } else {
                    formData.append('pdf', originalFile);
                }
            }

            const { data } = await axios.post(`${backendUrl}/api/lab/analyze`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'token': token
                }
            });

            let botResponse;
            if (data.analysis) {
                botResponse = { type: 'bot', isReport: true, data: data };
            } else if (data.message) {
                botResponse = { type: 'bot', text: `Result: ${data.message}` };
            } else {
                botResponse = { type: 'bot', text: "Request processed. No clear diagnosis found. Please provide more details." };
            }

            setMessages(prev => [...prev, botResponse]);
            saveToDb(botResponse);

        } catch (error) {
            console.error("Chat API Error:", error);
            const errorMsg = error.response?.data?.message || "An error occurred. Please try again.";
            const errorResponse = { type: 'bot', text: `Error: ${errorMsg}` };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl hover:scale-105 transition-transform flex items-center justify-center w-14 h-14"
                >
                    {isOpen ? (
                        <span className="text-xl font-bold">Close</span>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                        </svg>
                    )}
                </button>
            </div>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[400px] md:w-[450px] h-[600px] bg-gray-50 rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shadow-md z-10">
                        <h3 className="font-bold">MediConnect AI</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
                            <button onClick={clearChat} className="text-white/80 hover:text-white transition" title="New Conversation">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                            </button>
                        </div>
                    </div>

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
                                        <div className="mt-2 flex items-center gap-2 bg-black/10 p-2 rounded text-xs">
                                            <span>File: {msg.fileName}</span>
                                        </div>
                                    )}
                                    {msg.isReport && <AIResponseDisplay responseData={msg.data} />}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    <span className="text-xs text-gray-500 font-medium ml-2">Analyzing Report...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-3 bg-white border-t">
                        {file && (
                            <div className="mb-2 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                <span className="text-xs text-blue-700 font-medium truncate w-4/5">File selected: {file.name}</span>
                                <button onClick={clearFileSelection} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Remove</button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <label className="cursor-pointer p-2 text-gray-400 hover:text-blue-600 transition bg-gray-100 rounded-full">
                                <input
                                    type="file"
                                    accept=".pdf,image/*"
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
                                placeholder={file ? "Type 'Analyze' to begin..." : "Describe symptoms..."}
                                className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                            />

                            <button
                                onClick={handleSend}
                                disabled={loading || (!input && !file)}
                                className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
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