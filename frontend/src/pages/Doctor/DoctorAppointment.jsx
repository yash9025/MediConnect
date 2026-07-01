import  { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useRef } from 'react';
const DoctorAppointment = () => {
  const { dToken, appointments, getAppointments, completeAppointment, cancelAppointment, backendUrl, profileData, getProfileData } = useContext(DoctorContext);
  const { calculateAge, slotDateFormat } = useContext(AppContext);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [opdActive, setOpdActive] = useState(false);
  const [isStartingOpd, setIsStartingOpd] = useState(false);
  const [messages, setMessages] = useState([]);
  const [reportedUsers, setReportedUsers] = useState(new Set());
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Date filter state - defaults to today
  const getTodayStr = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}_${month}_${year}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 280 });
  const calendarRef = useRef(null);
  const calendarBtnRef = useRef(null);

  const openCalendar = () => {
    if (calendarBtnRef.current) {
      const rect = calendarBtnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 280),
      });
    }
    setIsCalendarOpen(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (dToken) {
      getAppointments();
      getProfileData();
    }
  }, [dToken, getAppointments, getProfileData]);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
       messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages]);

  useEffect(() => {
      if (dToken && backendUrl && profileData?._id) {
          socketRef.current = io(backendUrl);
          const socket = socketRef.current;
          socket.emit('join-doctor-room', profileData._id);

          socket.on('receive-queue-message', (data) => {
              setMessages((prev) => [...prev, data]);
          });

          return () => {
              socket.off('receive-queue-message');
              socket.disconnect();
          };
      }
  }, [dToken, backendUrl, profileData?._id]);

  const handleReportSpam = (userId) => {
      if (!socketRef.current || !profileData?._id) return;
      socketRef.current.emit('report-spam', { docId: profileData._id, userId });
      setReportedUsers((prev) => new Set(prev).add(userId));
      toast.success("User reported. Their messages will be hidden.");
  };

  const visibleMessages = messages.filter(msg => !reportedUsers.has(msg.userId));

  // Fetch OPD status on load
  useEffect(() => {
    if (dToken && backendUrl) {
      const fetchStatus = async () => {
        try {
               const { data } = await axios.post(backendUrl + '/api/doctor/status', {}, { headers: { Authorization: `Bearer ${dToken}` } });
          if (data.success) {
            setOpdActive(data.opdActive || false);
          }
        } catch (error) {
          console.error("Error fetching OPD status:", error);
        }
      };
      fetchStatus();
    }
  }, [dToken, backendUrl]);

  // Start OPD function
  const startOPD = async () => {
    setIsStartingOpd(true);
    try {
         const { data } = await axios.post(backendUrl + '/api/doctor/start-opd', {}, { headers: { Authorization: `Bearer ${dToken}` } });
      
      if (data.success) {
        setOpdActive(true);
        toast.success("🟢 OPD Started! All patients have been notified.");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsStartingOpd(false);
    }
  };

  // --- NEW FUNCTION: CALL NEXT PATIENT (Triggers Live Queue) ---
  const callNextPatient = async () => {
    setIsCalling(true);
    try {
         const { data } = await axios.post(backendUrl + '/api/doctor/next-patient', {}, { headers: { Authorization: `Bearer ${dToken}` } });
      
      if (data.success) {
        toast.success(`Calling patient for ${data.currentSlotTime}!`);
        setOpdActive(false);  // Turn off OPD waiting mode, queue is now active
        // We re-fetch appointments to reflect changes if needed
        getAppointments(); 
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsCalling(false);
    }
  };

  const markAbsent = async (appointmentId) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/doctor/mark-absent',
        { appointmentId },
            { headers: { Authorization: `Bearer ${dToken}` } }
      );

      if (data.success) {
        toast.info("Patient marked as absent");
        getAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const isToday = (dateString) => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return dateString === `${day}_${month}_${year}`;
  };

  // Returns true only if the appointment date is TODAY or PAST — actions are locked for future dates
  const isDateReached = (dateString) => {
    const [day, month, year] = dateString.split('_').map(Number);
    const slotDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return slotDate <= today;
  };

  // Get unique dates from appointments for the dropdown
  const availableDates = [...new Set(appointments.map(a => a.slotDate))].sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('_').map(Number);
    const [dayB, monthB, yearB] = b.split('_').map(Number);
    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    return dateA - dateB;
  });

  // Filter appointments by selected date first, then by status filter
  const dateFilteredAppointments = selectedDate === 'all' 
    ? appointments 
    : appointments.filter(item => item.slotDate === selectedDate);

  const filteredAppointments = dateFilteredAppointments.filter(item => {
    const matchesSearch = item.userData.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isAbsent = item.status === "Skipped" || item.status === "Absent";
    if (filter === 'all') return matchesSearch;
    if (filter === 'pending') return matchesSearch && !item.cancelled && !item.isCompleted && !isAbsent;
    if (filter === 'completed') return matchesSearch && item.isCompleted;
    if (filter === 'cancelled') return matchesSearch && item.cancelled;
    if (filter === 'absent') return matchesSearch && isAbsent;
    return matchesSearch;
  });

  // Helper to convert slot time to minutes for sorting (e.g., "2:30 PM" -> 870)
  const slotTimeToMinutes = (time) => {
    if (!time) return 0;
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  // Sort appointments by slot time (earliest first)
  const sortedAppointments = filteredAppointments.sort((a, b) => slotTimeToMinutes(a.slotTime) - slotTimeToMinutes(b.slotTime));

  // Stats are now based on the selected date
  const stats = {
    total: dateFilteredAppointments.length,
    pending: dateFilteredAppointments.filter(a => !a.cancelled && !a.isCompleted && a.status !== "Skipped" && a.status !== "Absent").length,
    completed: dateFilteredAppointments.filter(a => a.isCompleted).length,
    cancelled: dateFilteredAppointments.filter(a => a.cancelled).length,
    absent: dateFilteredAppointments.filter(a => a.status === "Skipped" || a.status === "Absent").length
  };

  // Format date for display in dropdown
  const formatDateForDropdown = (dateStr) => {
    if (dateStr === 'all') return 'All Dates';
    const todayStr = getTodayStr();
    const formattedDate = slotDateFormat(dateStr);
    if (dateStr === todayStr) return ` Today - ${formattedDate}`;
    
    // Check if it's tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${String(tomorrow.getDate()).padStart(2, '0')}_${String(tomorrow.getMonth() + 1).padStart(2, '0')}_${tomorrow.getFullYear()}`;
    if (dateStr === tomorrowStr) return ` Tomorrow - ${formattedDate}`;
    
    return `${formattedDate}`;
  };

  return (
    <div className="ml-16 md:ml-52 pt-20 min-h-screen bg-slate-50 font-sans overflow-x-hidden w-full">
      
      {/* --- HERO HEADER --- */}
      <div className="relative z-10 bg-gradient-to-r from-blue-500 via-blue-600 to-green-600 shadow-2xl pb-28 md:pb-36 pt-12 px-6 md:px-12">
        {/* Background Patterns */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="flex-1">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-blue-50 text-[10px] font-bold uppercase tracking-widest">Doctor Panel Live</span>
             </div>
             <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">Patient Queue</h1>
             <p className="text-blue-100/90 text-sm md:text-base max-w-xl font-medium leading-relaxed">
               Manage daily appointments, track live tokens, and update patient statuses with a single click.
             </p>
          </div>

          {/* Search & Date Filter */}
          <div className="w-full lg:w-auto flex flex-col lg:flex-row gap-3">
             
             {/* Date Picker Dropdown */}
             <div className="relative group">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md group-hover:bg-white/30 transition-all"></div>
                <div 
                  ref={calendarBtnRef}
                  className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-1 shadow-lg group-hover:border-white/40 transition-all cursor-pointer min-w-[200px]"
                  onClick={openCalendar}
                >
                   <div className="pl-4 text-blue-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                   </div>
                   <div className="flex-1 text-white text-sm py-3 px-3 font-medium truncate select-none">
                      {formatDateForDropdown(selectedDate)}
                   </div>
                   <div className="pr-3 text-blue-200">
                      <svg className={`w-4 h-4 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                   </div>
                 </div>
              </div>

             {/* Glass Search Bar */}
             <div className="relative group lg:w-[300px]">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md group-hover:bg-white/30 transition-all"></div>
                <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-1 shadow-lg group-hover:border-white/40 transition-all">
                   <div className="pl-4 text-blue-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                   </div>
                   <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search patient..." 
                      className="w-full bg-transparent border-none text-white placeholder-blue-200/60 focus:ring-0 text-sm py-3 px-3 font-medium"
                   />
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* --- STATS GRID --- */}
      {/* Calendar Portal Dropdown - renders at body level to escape ALL z-index stacking */}
      {createPortal(
        <div
          ref={calendarRef}
          style={{
            position: 'absolute',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 99999,
          }}
          className={`bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transition-all duration-200 origin-top-left ${
            isCalendarOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'
          }`}
        >
          <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Date</span>
            <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{availableDates.length} Days</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => { setSelectedDate('all'); setIsCalendarOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm font-medium rounded-xl transition-all flex items-center justify-between ${selectedDate === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              All Upcoming Dates
              {selectedDate === 'all' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
            </button>
            {availableDates.map(date => {
              const isSelected = selectedDate === date;
              const isTodayDate = getTodayStr() === date;
              return (
                <button
                  key={date}
                  onClick={() => { setSelectedDate(date); setIsCalendarOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium rounded-xl transition-all flex items-center justify-between ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="flex items-center gap-2">
                    {formatDateForDropdown(date).replace(' Today - ', '').replace(' Tomorrow - ', '')}
                    {isTodayDate && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Today</span>}
                  </span>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      <div className="px-6 md:px-12 -mt-20 relative z-20">
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { key: 'all', label: 'Total', value: stats.total, color: 'blue', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path> },
              { key: 'pending', label: 'Pending', value: stats.pending, color: 'indigo', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path> },
              { key: 'completed', label: 'Completed', value: stats.completed, color: 'emerald', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path> },
              { key: 'absent', label: 'Absent', value: stats.absent, color: 'amber', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path> },
              { key: 'cancelled', label: 'Cancelled', value: stats.cancelled, color: 'rose', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path> },
            ].map((stat) => (
               <button 
                  key={stat.key}
                  onClick={() => setFilter(stat.key)}
                  className={`cursor-pointer relative group overflow-hidden bg-white p-5 rounded-2xl shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300 text-left ${filter === stat.key ? `ring-2 ring-${stat.color}-500 ring-offset-2` : 'hover:-translate-y-1'}`}
               >
                  <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500 text-${stat.color}-600`}>
                     <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">{stat.icon}</svg>
                  </div>
                  <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-white bg-${stat.color}-500 shadow-md shadow-${stat.color}-200`}>
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{stat.icon}</svg>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-3xl font-black text-slate-800 mt-1 group-hover:text-${stat.color}-600 transition-colors`}>{stat.value}</p>
               </button>
            ))}
         </div>
      </div>

      {/* --- CONTENT AREA (List + Chat Panel) --- */}
      <div className="px-6 md:px-12 py-10 pb-24 w-full flex flex-col xl:flex-row gap-8">
         <div className="flex-1 min-w-0">
         
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            
            {/* Title & Badge */}
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
               <span className={`w-1.5 h-8 rounded-full ${filter === 'all' ? 'bg-blue-600' : filter === 'pending' ? 'bg-indigo-600' : filter === 'completed' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
               <div className="flex flex-col">
                  <span>{filter === 'all' ? 'All Appointments' : filter.charAt(0).toUpperCase() + filter.slice(1)}</span>
                  {selectedDate !== 'all' && (
                     <span className="text-xs font-medium text-slate-400">
                        {selectedDate === getTodayStr() ? "Today's Schedule" : slotDateFormat(selectedDate)}
                     </span>
                  )}
               </div>
               <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 shadow-sm">{sortedAppointments.length}</span>
            </h2>

            {/* --- RIGHT SIDE: ACTIONS --- */}
            <div className="flex items-center gap-4">
                
                {/* === START OPD BUTTON === */}
                {selectedDate === getTodayStr() && !opdActive && (
                  <button 
                    onClick={startOPD}
                    disabled={isStartingOpd}
                    className="cursor-pointer flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-red-200 hover:bg-red-600 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isStartingOpd ? (
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                      ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      )}
                      <span>{isStartingOpd ? 'Starting...' : 'Emergency Operation'}</span>
                  </button>
                )}

                {/* OPD Active Indicator */}
                {selectedDate === getTodayStr() && opdActive && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-sm border border-emerald-200">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span>OPD Active</span>
                  </div>
                )}

                {/* === THE CALL NEXT BUTTON === */}
                {selectedDate === getTodayStr() ? (
                  <button 
                    onClick={callNextPatient}
                    disabled={isCalling}
                    className="cursor-pointer flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-200 hover:bg-blue-600 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isCalling ? (
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                      ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                      )}
                      <span>{isCalling ? 'Calling...' : 'Call Next Patient'}</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setSelectedDate(getTodayStr())}
                    className="cursor-pointer flex items-center gap-2 bg-slate-200 text-slate-500 px-5 py-2.5 rounded-xl font-bold text-sm border border-slate-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <span>Go to Today</span>
                  </button>
                )}

                {(searchTerm || filter !== 'all' || selectedDate !== getTodayStr()) && (
                  <button onClick={() => {setSearchTerm(''); setFilter('all'); setSelectedDate(getTodayStr());}} className="cursor-pointer text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">Reset to Today</button>
                )}
            </div>
         </div>

         {/* ... Rest of the List Code (Unchanged) ... */}
         <div className="space-y-5">
            {sortedAppointments.length > 0 ? (
               sortedAppointments.map((item, index) => (
                  <div 
                     key={item._id} 
                     className="group relative bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                     style={{ animationDelay: `${index * 50}ms` }}
                  >
                     <div className="flex flex-col lg:flex-row">
                        
                        {/* LEFT: SLOT TIME TICKET */}
                        <div className={`lg:w-32 p-6 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-2 relative overflow-hidden ${
                           item.cancelled ? 'bg-rose-50' : 
                           item.isCompleted ? 'bg-emerald-50' : 
                           (item.status === 'Skipped' || item.status === 'Absent') ? 'bg-amber-50' : 
                           'bg-blue-600'
                        }`}>
                           <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
                           <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full"></div>
                           
                           <span className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'Pending' && !item.cancelled ? 'text-blue-200' : 'text-slate-400'}`}>Slot</span>
                           <span className={`text-xl lg:text-2xl font-black ${item.status === 'Pending' && !item.cancelled ? 'text-white' : 'text-slate-700'}`}>
                              {item.slotTime}
                           </span>
                           <span className={`lg:hidden px-2 py-1 rounded text-[10px] font-bold uppercase ${item.cancelled ? 'bg-rose-200 text-rose-800' : item.isCompleted ? 'bg-emerald-200 text-emerald-800' : (item.status === 'Skipped' || item.status === 'Absent') ? 'bg-amber-200 text-amber-800' : 'bg-blue-500 text-white'}`}>
                              {item.cancelled ? 'Cancelled' : item.isCompleted ? 'Done' : (item.status === 'Skipped' || item.status === 'Absent') ? 'Absent' : 'Pending'}
                           </span>
                        </div>

                        {/* RIGHT: CONTENT */}
                        <div className="flex-1 p-6 flex flex-col justify-center">
                           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                              
                              {/* Patient Details */}
                              <div className="flex items-center gap-3 min-w-0 w-[180px] flex-shrink-0">
                                 <div className="relative">
                                    <img src={item.userData.image} alt={item.userData.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-slate-100 ring-4 ring-slate-50"/>
                                    {isToday(item.slotDate) && !item.cancelled && !item.isCompleted && item.status !== "Skipped" && item.status !== "Absent" && (
                                       <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
                                       </span>
                                    )}
                                 </div>
                                 <div>
                                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{item.userData.name}</h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                       <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">{calculateAge(item.userData.dob)} YRS</span>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase">{item.userData.gender}</span>
                                    </div>
                                 </div>
                              </div>

                              {/* Meta Info Grid */}
                              <div className="flex items-center gap-x-4 gap-y-2 flex-1 flex-wrap min-w-0">
                                 <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date</p>
                                    <p className="text-sm font-bold text-slate-700">{slotDateFormat(item.slotDate)}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Booking ID</p>
                                    <p className="text-sm font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">#{item._id?.slice(-6).toUpperCase()}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Payment</p>
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.payment ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                       <span className={`w-1.5 h-1.5 rounded-full ${item.payment ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                       {item.payment ? 'PAID' : 'CASH'}
                                    </span>
                                 </div>
                              </div>

                              {/* ACTIONS */}
                              <div className="flex-shrink-0 flex items-center">
                                 {item.cancelled ? (
                                    <div className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm border border-rose-100 flex items-center gap-2">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                       Cancelled
                                    </div>
                                 ) : item.isCompleted ? (
                                    <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm border border-emerald-100 flex items-center gap-2">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                       Completed
                                    </div>
                                 ) : (item.status === "Skipped" || item.status === "Absent") ? (
                                    <div className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-bold text-sm border border-amber-100 flex items-center gap-2">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                       Absent - Book New Appointment
                                    </div>
                                 ) : (
                                    <div className="flex items-center gap-2">
                                        
                                        {/* Lock badge shown for future appointments */}
                                        {!isDateReached(item.slotDate) && (
                                          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-bold" title="Actions locked until appointment date">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                            Locked until {slotDateFormat(item.slotDate)}
                                          </div>
                                        )}

                                        {isDateReached(item.slotDate) && (
                                          <>
                                       <button 
                                          onClick={() => markAbsent(item._id)}
                                          disabled={!isToday(item.slotDate)}
                                          className={`cursor-pointer h-10 w-10 rounded-xl border flex items-center justify-center transition-all duration-200 ${!isToday(item.slotDate) ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : 'bg-amber-50 border-amber-100 text-amber-500 hover:bg-amber-500 hover:text-white hover:shadow-md hover:shadow-amber-200'}`}
                                          title={!isToday(item.slotDate) ? 'Can only mark absent on appointment day' : 'Mark Absent'}
                                       >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                                          </svg>
                                       </button>

                                       <button 
                                          onClick={() => cancelAppointment(item._id)}
                                          className="cursor-pointer h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center transition-all duration-200 hover:bg-rose-500 hover:text-white hover:shadow-md hover:shadow-rose-200"
                                          title="Cancel Appointment"
                                       >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                          </svg>
                                       </button>

                                       <button 
                                          onClick={() => completeAppointment(item._id)}
                                          className="cursor-pointer h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-200 flex items-center gap-1.5 transition-all duration-200 hover:scale-105"
                                       >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                          <span>Done</span>
                                       </button>
                                          </>
                                        )}
                                    </div>
                                 )}
                              </div>

                           </div>
                        </div>
                     </div>
                  </div>
               ))
            ) : (
               <div className="flex flex-col items-center justify-center py-24 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                     <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-600">No Appointments Found</h3>
                  <p className="text-slate-400 mt-1 mb-6">
                     {selectedDate === getTodayStr() ? "Your schedule is currently clear for today." : `No appointments on ${slotDateFormat(selectedDate)}.`}
                  </p>
                  {(searchTerm || filter !== 'all' || selectedDate !== getTodayStr()) && (
                     <button onClick={() => {setSearchTerm(''); setFilter('all'); setSelectedDate(getTodayStr());}} className="cursor-pointer px-6 py-2 bg-blue-100 text-blue-600 rounded-full font-bold text-sm hover:bg-blue-200 transition">View Today&apos;s Appointments</button>
                  )}
               </div>
             )}
          </div>
         </div>

         {/* --- LIVE MESSAGES PANEL --- */}
         <div className="w-full xl:w-96 flex-shrink-0 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden sticky top-24" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center justify-between shadow-md z-10">
               <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                  </div>
                  <div>
                     <h2 className="text-white font-bold text-lg leading-tight">Live Messages</h2>
                     <p className="text-blue-100 text-xs font-medium">Patient Updates & Emergencies</p>
                  </div>
               </div>
               <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                  <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider">Live</span>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-slate-50 flex flex-col gap-4">
               {visibleMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic">
                     <svg className="w-12 h-12 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                     No incoming messages yet
                  </div>
               ) : (
                  visibleMessages.map((msg, idx) => (
                     <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 group transition-all hover:shadow-md">
                        <div className="flex items-start justify-between mb-2 gap-2">
                           <div className="flex items-center gap-2">
                              {msg.tokenNumber ? (
                                 <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-lg border border-blue-200">
                                    Token #{msg.tokenNumber}
                                 </span>
                              ) : null}
                              <span className="font-bold text-slate-700 text-sm">{msg.senderName}</span>
                           </div>
                           <button 
                              onClick={() => handleReportSpam(msg.userId)}
                              title="Report Spam and Block User"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg border border-rose-100 cursor-pointer"
                           >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
                           </button>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">{msg.message}</p>
                     </div>
                  ))
               )}
               <div ref={messagesEndRef} />
            </div>
         </div>
      </div>
    </div>
  );
};

export default DoctorAppointment;