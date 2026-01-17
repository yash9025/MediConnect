import { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AppContext } from '../context/AppContext';

// Helper to parse "10:30 AM" into minutes for comparison
const parseSlotMinutes = (slotTime) => {
    if (!slotTime) return 0;
    const match = slotTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;

    let [_, hours, minutes, period] = match;
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    period = period.toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
};

const LiveQueue = ({ docId, mySlotTime }) => {
    const { backendUrl } = useContext(AppContext);
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const [queueState, setQueueState] = useState({
        currentSlotTime: "",
        timePerVisit: 15,
        lastUpdate: null,
        isLiveAvg: false,
    });
    
    const [myStatus, setMyStatus] = useState("Pending");
    const [timeInside, setTimeInside] = useState(0);
    const [isSlotTimeReached, setIsSlotTimeReached] = useState(false);

    const queuePosition = useMemo(() => {
        if (!queueState.currentSlotTime) return -1;
        const myMins = parseSlotMinutes(mySlotTime);
        const currentMins = parseSlotMinutes(queueState.currentSlotTime);

        if (myMins <= currentMins) return 0;
        return Math.max(1, Math.floor((myMins - currentMins) / 15));
    }, [queueState.currentSlotTime, mySlotTime]);

    // Monitor if slot time has arrived
    useEffect(() => {
        if (!mySlotTime) return;
        const checkTime = () => {
            const now = new Date();
            const slotMins = parseSlotMinutes(mySlotTime);
            const currentMins = now.getHours() * 60 + now.getMinutes();
            setIsSlotTimeReached(currentMins >= slotMins - 15);
        };
        checkTime();
        const timer = setInterval(checkTime, 60000);
        return () => clearInterval(timer);
    }, [mySlotTime]);

    // Fetch initial data and setup socket listener
    useEffect(() => {
        if (!backendUrl || !docId) return;

        socketRef.current = io(backendUrl);
        const socket = socketRef.current;

        const fetchData = async () => {
            try {
                const [docRes, userRes] = await Promise.all([
                    axios.post(`${backendUrl}/api/doctor/status`, { docId }),
                    axios.post(`${backendUrl}/api/user/get-status`, { docId, mySlotTime })
                ]);

                if (docRes.data.success) {
                    setQueueState({
                        currentSlotTime: docRes.data.currentSlotTime || "",
                        timePerVisit: docRes.data.avgConsultationTime || 15,
                        lastUpdate: docRes.data.lastUpdate,
                        isLiveAvg: docRes.data.usingLast3 || false
                    });
                }

                if (userRes.data.success) {
                    setMyStatus(userRes.data.status);
                }
            } catch (error) {
                console.error("Queue Sync Error:", error);
            }
        };

        fetchData();
        socket.emit('join-doctor-room', docId);

        const handleQueueUpdate = (data) => {
            setQueueState(prev => ({
                ...prev,
                currentSlotTime: data.currentSlotTime ?? prev.currentSlotTime,
                lastUpdate: data.lastUpdate ?? prev.lastUpdate,
                timePerVisit: data.avgTime ?? prev.timePerVisit,
                isLiveAvg: !!data.avgTime
            }));
        };

        socket.on('queue-update', handleQueueUpdate);
        
        socket.on('patient-skipped', ({ skippedSlotTime }) => {
            if (skippedSlotTime === mySlotTime) setMyStatus("Absent");
        });

        socket.on('appointment-completed', ({ slotTime }) => {
            if (slotTime === mySlotTime) setMyStatus("Completed");
        });

        socket.on('appointment-cancelled', ({ slotTime }) => {
            if (slotTime === mySlotTime) setMyStatus("Cancelled");
        });

        return () => {
            socket.off('queue-update', handleQueueUpdate);
            socket.disconnect();
        };
    }, [docId, mySlotTime, backendUrl]);

    // Update time elapsed counter
    useEffect(() => {
        if (!queueState.lastUpdate) return;
        const updateTimer = () => {
            const diff = moment().diff(moment(queueState.lastUpdate), 'minutes');
            setTimeInside(Math.max(0, diff));
        };
        updateTimer();
        const interval = setInterval(updateTimer, 30000);
        return () => clearInterval(interval);
    }, [queueState.lastUpdate]);

    const renderCancelled = () => (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center">
            <h3 className="text-xl font-bold text-rose-900 mb-2">Appointment Cancelled</h3>
            <p className="text-rose-700 text-sm mb-4">Your {mySlotTime} appointment has been cancelled.</p>
            <button 
                onClick={() => navigate(`/appointment/${docId}`)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all"
            >
                Book New Appointment
            </button>
        </div>
    );

    const renderAbsent = () => (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
            <h3 className="text-xl font-bold text-amber-900 mb-2">You were marked absent</h3>
            <p className="text-amber-700 text-sm mb-4">Your slot was called but you were not present.</p>
            <button 
                onClick={() => navigate(`/appointment/${docId}`)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all"
            >
                Book New Appointment
            </button>
        </div>
    );

    const renderCompleted = () => (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex items-center gap-4 opacity-75">
            <div className="bg-gray-200 p-2 rounded-full text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
                <p className="text-gray-800 font-bold">Appointment Completed</p>
                <p className="text-xs text-gray-500">Your session has ended.</p>
            </div>
        </div>
    );

    const renderNotStarted = () => (
        <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-200">
            <p className="text-gray-500 font-medium text-sm">Doctor has not started yet.</p>
            <p className="text-xs text-gray-400 mt-1">Your slot: <b>{mySlotTime}</b></p>
        </div>
    );

    const renderActiveTurn = () => {
        if (!isSlotTimeReached && mySlotTime) {
            return (
                <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-white shadow-lg text-center">
                    <h3 className="text-xl font-bold">You are Next!</h3>
                    <p className="text-amber-100 text-sm mt-1">Please arrive at your slot time: {mySlotTime}</p>
                </div>
            );
        }
        return (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 p-6 text-white shadow-lg text-center">
                <h3 className="text-2xl font-bold">It is Your Turn!</h3>
                <p className="text-emerald-50 text-sm mt-1">Please proceed to the doctor room.</p>
                <div className="mt-4 inline-block bg-white text-emerald-600 px-4 py-1.5 rounded-full text-sm font-bold">
                    Slot: {mySlotTime}
                </div>
            </div>
        );
    };

    const renderQueue = () => (
        <div className="bg-white border border-indigo-50 rounded-2xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400"></div>
            <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                        </span>
                        <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Live Status</span>
                    </div>
                    <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">
                        In: {timeInside}m
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                        <p className="text-xs text-slate-400 font-medium uppercase">Currently</p>
                        <p className="text-lg font-bold text-slate-700">{queueState.currentSlotTime}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                        <p className="text-xs text-blue-400 font-medium uppercase">Your Slot</p>
                        <p className="text-lg font-bold text-blue-600">{mySlotTime}</p>
                    </div>
                </div>

                <div className="bg-blue-600 rounded-xl p-4 text-white text-center shadow-md">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <p className="text-blue-100 text-xs font-medium uppercase">Estimated Wait</p>
                        {queueState.isLiveAvg && (
                            <span className="bg-emerald-400/30 text-emerald-200 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">Live</span>
                        )}
                    </div>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold">{queuePosition * queueState.timePerVisit}</span>
                        <span className="text-sm font-medium opacity-80">mins</span>
                    </div>
                    <p className="text-[10px] text-blue-200 mt-1">
                        {queuePosition} slot{queuePosition !== 1 ? 's' : ''} ahead • ~{queueState.timePerVisit}m per visit
                    </p>
                </div>
            </div>
        </div>
    );

    if (myStatus === "Cancelled") return renderCancelled();
    if (myStatus === "Absent" || myStatus === "Skipped") return renderAbsent();
    if (myStatus === "Completed") return renderCompleted();
    if (!queueState.currentSlotTime || queuePosition === -1) return renderNotStarted();
    if (queuePosition === 0 || queueState.currentSlotTime === mySlotTime) return renderActiveTurn();

    return renderQueue();
};

LiveQueue.propTypes = {
    docId: PropTypes.string.isRequired,
    mySlotTime: PropTypes.string.isRequired
};

export default LiveQueue;