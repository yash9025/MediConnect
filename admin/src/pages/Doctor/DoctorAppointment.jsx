import React, { useContext, useEffect, useState } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';

const DoctorAppointment = () => {
  const { dToken, appointments, getAppointments, completeAppointment, cancelAppointment } = useContext(DoctorContext);
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    if (dToken) {
      getAppointments();
    }
  }, [dToken, getAppointments]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`min-h-screen bg-[#F8F9FD] p-6 sm:p-12 transition-all duration-300 pt-24 ${isMobile ? 'ml-16' : 'md:ml-64'}`}>
      
      <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 tracking-tight">
          All Appointments
        </h1>
        <div className="hidden sm:block text-gray-500 font-medium">
          Total: {appointments.length}
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        
        {isMobile ? (
          <div className="grid grid-cols-1 gap-6">
            {appointments.reverse().map((item) => (
              <div key={item._id} className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 flex flex-col gap-4">
                
                <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                  <img 
                    src={item.userData.image} 
                    alt="User" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-50" 
                  />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{item.userData.name}</h2>
                    <p className="text-sm text-gray-500 font-medium">{calculateAge(item.userData.dob)} years old</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-400">Date & Time</span>
                    <span className="font-medium text-gray-800">{slotDateFormat(item.slotDate)} | {item.slotTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Payment</span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${item.payment ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {item.payment ? 'Online' : 'Cash'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Fees</span>
                    <span className="font-bold text-lg text-gray-800">{currency}{item.amount}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  {item.cancelled ? (
                    <span className="w-full text-center py-2 text-red-500 font-bold bg-red-50 rounded-lg border border-red-100">
                      Cancelled
                    </span>
                  ) : item.isCompleted ? (
                    <span className="w-full text-center py-2 text-green-500 font-bold bg-green-50 rounded-lg border border-green-100">
                      Completed
                    </span>
                  ) : (
                    <div className="flex gap-4 w-full">
                       <button 
                        onClick={() => cancelAppointment(item._id)}
                        className="flex-1 py-3 rounded-lg border border-red-200 text-red-500 font-bold hover:bg-red-50 transition active:scale-95 flex items-center justify-center gap-2"
                      >
                         <img src={assets.cancel_icon} className="w-5" alt="Cancel"/> Cancel
                      </button>
                      <button 
                        onClick={() => completeAppointment(item._id)}
                        className="flex-1 py-3 rounded-lg bg-green-500 text-white font-bold shadow-md hover:bg-green-600 transition active:scale-95 flex items-center justify-center gap-2"
                      >
                         <img src={assets.tick_icon} className="w-5 brightness-0 invert" alt="Complete"/> Complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm uppercase tracking-wider">
                    <th className="py-6 px-6 font-semibold">#</th>
                    <th className="py-6 px-6 font-semibold">Patient</th>
                    <th className="py-6 px-6 font-semibold">Age</th>
                    <th className="py-6 px-6 font-semibold">Date & Time</th>
                    <th className="py-6 px-6 font-semibold">Fees</th>
                    <th className="py-6 px-6 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 divide-y divide-gray-100">
                  {appointments.length > 0 ? (
                    appointments.reverse().map((item, index) => (
                      <tr key={item._id} className="hover:bg-gray-50/50 transition-colors duration-200 group">
                        <td className="py-6 px-6 font-medium text-gray-400">{index + 1}</td>
                        
                        <td className="py-6 px-6">
                          <div className="flex items-center gap-4">
                            <img 
                              src={item.userData.image} 
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-110 transition-transform" 
                              alt="User" 
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800 text-lg">{item.userData.name}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded w-fit mt-1 ${item.payment ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                {item.payment ? 'Online' : 'Cash'}
                              </span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-6 px-6 font-medium text-gray-600">{calculateAge(item.userData.dob)}</td>
                        
                        <td className="py-6 px-6">
                          <p className="font-bold text-gray-800">{slotDateFormat(item.slotDate)}</p>
                          <p className="text-sm text-gray-500 font-medium">{item.slotTime}</p>
                        </td>
                        
                        <td className="py-6 px-6">
                          <div className="font-bold text-xl text-gray-800">{currency}{item.amount}</div>
                        </td>
                        
                        <td className="py-6 px-6 text-center">
                          {item.cancelled ? (
                            <span className="inline-block px-4 py-2 rounded-lg bg-red-50 text-red-500 font-bold text-sm border border-red-100">
                              Cancelled
                            </span>
                          ) : item.isCompleted ? (
                            <span className="inline-block px-4 py-2 rounded-lg bg-green-50 text-green-500 font-bold text-sm border border-green-100">
                              Completed
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-4">
                              <button 
                                onClick={() => cancelAppointment(item._id)}
                                className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all duration-300 group/btn border border-red-100"
                                title="Cancel"
                              >
                                <img src={assets.cancel_icon} className="w-5 group-hover/btn:brightness-0 group-hover/btn:invert transition" alt="Cancel" />
                              </button>
                              
                              <button 
                                onClick={() => completeAppointment(item._id)}
                                className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all duration-300 group/btn border border-green-100"
                                title="Complete"
                              >
                                <img src={assets.tick_icon} className="w-5 group-hover/btn:brightness-0 group-hover/btn:invert transition" alt="Complete" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <p className="text-gray-400 text-xl font-medium">No appointments found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorAppointment;