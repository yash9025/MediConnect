import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import { AppContext } from '../context/AppContext';

const QueueChat = ({ docId, appointmentId, userId, tokenNumber }) => {
    const { backendUrl, userData } = useContext(AppContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [isBlocked, setIsBlocked] = useState(false);
    const socketRef = useRef(null);
    const chatContainerRef = useRef(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Small timeout to allow the DOM to render the container first
            setTimeout(scrollToBottom, 50);
        }
    }, [messages, isOpen]);

    useEffect(() => {
        if (!backendUrl || !docId) return;

        socketRef.current = io(backendUrl);
        const socket = socketRef.current;

        socket.emit('join-doctor-room', docId);

        socket.on('receive-queue-message', (data) => {
            if (String(data.appointmentId) === String(appointmentId)) {
                // Ignore if it's our own message (handled optimistically)
                if (data.sender === 'Patient' && data.userId === userId) return;
                
                setMessages(prev => [...prev, data]);
            }
        });

        socket.on('chat-error', (data) => {
            setIsBlocked(true);
        });

        return () => {
            socket.off('receive-queue-message');
            socket.off('chat-error');
            socket.disconnect();
        };
    }, [backendUrl, docId, appointmentId]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!inputMsg.trim() || isBlocked) return;

        const msgData = {
            docId,
            userId,
            appointmentId,
            sender: "Patient",
            message: inputMsg,
            senderName: userData?.name || "Patient",
            tokenNumber
        };

        // Optimistically update the UI instantly
        setMessages(prev => [...prev, { ...msgData, _id: Date.now().toString() }]);

        socketRef.current.emit('send-queue-message', msgData);
        setInputMsg('');
    };

    return (
        <div className="mt-4 border border-blue-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-300">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-blue-50 hover:bg-blue-100 px-4 py-3 flex items-center justify-between text-blue-700 font-semibold transition-colors"
            >
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    Message Doctor
                </div>
                <svg className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>

            {isOpen && (
                <div className="flex flex-col h-80 bg-slate-50 relative">
                    <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 text-xs text-amber-800 font-medium leading-relaxed">
                        ⚠️ <strong className="font-bold">Important:</strong> Please do not share personal medical details here. Only use this chat to notify the doctor if you have an emergency or are running late so others don't wait unnecessarily.
                    </div>
                    
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                No messages yet.
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.sender === 'Patient' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.sender === 'Patient' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                        {msg.sender === 'Doctor' && <p className="text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wide">Doctor</p>}
                                        <p>{msg.message}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 bg-white border-t border-slate-200">
                        {isBlocked ? (
                            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm py-2 px-3 rounded-lg text-center font-medium">
                                You have been restricted from sending messages.
                            </div>
                        ) : (
                            <form onSubmit={sendMessage} className="flex gap-2 relative">
                                <input
                                    type="text"
                                    value={inputMsg}
                                    onChange={(e) => setInputMsg(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!inputMsg.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center min-w-[2.75rem]"
                                >
                                    <svg className="w-5 h-5 -ml-1 mt-0.5 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueueChat;
