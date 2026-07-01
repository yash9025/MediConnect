import { useContext, useEffect, useState, useRef } from 'react';
import { AdminContext } from '../../context/AdminContext';
import { io } from 'socket.io-client';

const DoctorList = () => {
  const { doctors, aToken, getAllDoctors, changeAvailability, backendUrl } = useContext(AdminContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [liveQueues, setLiveQueues] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    if (aToken) {
      getAllDoctors();
    }
  }, [aToken]);

  useEffect(() => {
      if (aToken && backendUrl) {
          socketRef.current = io(backendUrl);
          const socket = socketRef.current;
          
          socket.emit('join-admin-room');

          socket.on('global-queue-update', (data) => {
              const { docId, currentSlotTime, opdActive, lastUpdate } = data;
              setLiveQueues(prev => ({
                  ...prev,
                  [docId]: {
                      currentSlotTime: currentSlotTime !== undefined ? currentSlotTime : prev[docId]?.currentSlotTime,
                      opdActive: opdActive !== undefined ? opdActive : prev[docId]?.opdActive,
                      lastUpdate: lastUpdate || prev[docId]?.lastUpdate
                  }
              }));
          });

          return () => {
              socket.disconnect();
          };
      }
  }, [aToken, backendUrl]);

  const filteredDoctors = doctors.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="md:ml-[250px] ml-16 pt-24 pb-12 px-4 sm:px-8 bg-gray-50 min-h-screen transition-all duration-300">
      
      <h1 className="text-3xl md:text-5xl font-extrabold text-center mb-8 
              bg-gradient-to-r from-blue-500 to-green-500 text-transparent bg-clip-text">
        All Doctors
      </h1>

      {/* Search Bar */}
      <div className="max-w-lg mx-auto mb-10 relative">
        <input 
            type="text" 
            placeholder="Search doctor by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 bg-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform transition duration-300 hover:scale-105 hover:shadow-2xl w-full"
            >
              <img
                src={item.image}
                alt=''
                className="w-full h-48 object-cover object-center rounded-t-2xl"
              />
              <div className="p-4 text-center">
                <p className="text-xl font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-sm text-gray-600 mt-1">{item.speciality}</p>

                <div className="flex items-center justify-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={item.available}
                    onChange={() => changeAvailability(item._id)}
                    className="w-5 h-5 cursor-pointer accent-blue-500"
                  />
                  <p className={`text-sm font-semibold ${item.available ? "text-green-500" : "text-red-500"}`}>
                    {item.available ? "Available" : "Not Available"}
                  </p>
                </div>

                {/* LIVE QUEUE DISPLAY */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2 min-h-[4rem]">
                    {liveQueues[item._id]?.opdActive && (
                        <div className="flex items-center justify-center gap-1.5 bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            EMERGENCY OT
                        </div>
                    )}
                    
                    {liveQueues[item._id]?.currentSlotTime && (
                        <div className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-100 shadow-sm">
                            <span className="text-xs uppercase font-bold tracking-widest text-blue-400">Serving</span>
                            <span className="font-bold">{liveQueues[item._id].currentSlotTime}</span>
                        </div>
                    )}
                    
                    {!liveQueues[item._id]?.opdActive && !liveQueues[item._id]?.currentSlotTime && (
                        <div className="text-xs text-gray-400 font-medium italic py-1 mt-auto text-center">
                            Queue Inactive
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))
        ) : (
            <div className="col-span-full text-center text-gray-500 mt-10 text-lg">
                No doctors found matching &quot;{searchTerm}&quot;
            </div>
        )}
      </div>
    </div>
  );
};

export default DoctorList;