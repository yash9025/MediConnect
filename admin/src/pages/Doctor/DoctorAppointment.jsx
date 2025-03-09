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
  }, [dToken]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`min-h-screen bg-gray-50 p-4 sm:p-10 transition-all duration-300 ${isMobile ? 'ml-16' : 'ml-64'}`}>
      <h1 className="mt-18 text-2xl sm:text-4xl font-bold mb-6 text-gray-800 text-center sm:text-left">
        All Appointments
      </h1>

      {/* Mobile View - Card Layout */}
      {isMobile ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 place-items-center">
          {appointments.length > 0 ? (
            appointments.reverse().map((appointment, index) => (
              <div key={index} className="bg-white w-full max-w-[500px] p-6 rounded-lg shadow-lg min-h-[220px]">
                <div className="flex items-center space-x-4">
                  <img
                    src={appointment.userData.image}
                    alt="Patient"
                    className="w-14 h-14 rounded-full border object-cover"
                  />
                  <div>
                    <h2 className="text-lg font-medium text-gray-800">{appointment.userData.name}</h2>
                    <p className="text-sm text-gray-500">{calculateAge(appointment.userData.dob)} years old</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p><span className="font-semibold">Date:</span> {slotDateFormat(appointment.slotDate)}</p>
                  <p><span className="font-semibold">Time:</span> {appointment.slotTime}</p>
                  <p><span className="font-semibold">Payment:</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium text-white rounded-full ${appointment.payment ? 'bg-green-500' : 'bg-red-500'}`}>
                      {appointment.payment ? 'Online' : 'Cash'}
                    </span>
                  </p>
                  <p><span className="font-semibold">Fees:</span> {currency}{appointment.amount}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end mt-4 space-x-4">
                  {appointment.cancelled ? (
                    <p className="text-red-500 font-medium">Cancelled</p>
                  ) : appointment.isCompleted ? (
                    <p className="text-green-500 font-medium">Completed</p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img
                        src={assets.cancel_icon}
                        alt="Cancel"
                        className="w-10 h-10 cursor-pointer hover:opacity-80 transition-all active:scale-90"
                        onClick={() => cancelAppointment(appointment._id)}
                      />
                      <img
                        src={assets.tick_icon}
                        alt="Confirm"
                        className="w-10 h-10 cursor-pointer hover:opacity-80 transition-all active:scale-90"
                        onClick={() => completeAppointment(appointment._id)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 text-lg">No appointments found</p>
          )}
        </div>
      ) : (

        // Desktop View - Table Layout
        <div className=" bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className=" w-full border-collapse text-sm sm:text-lg">
              <thead>
                <tr className="bg-gradient-to-r from-gray-300 to-gray-100 text-gray-700 font-semibold">
                  <th className="py-4 px-2 text-left w-8 sm:w-12">#</th>
                  <th className="py-4 px-4 text-left min-w-[140px] sm:min-w-[180px]">Patient</th>
                  <th className="py-4 px-4 text-center w-20 sm:w-24">Payment</th>
                  <th className="py-4 px-4 text-center w-16 sm:w-20">Age</th>
                  <th className="py-4 px-4 text-left min-w-[140px] sm:w-64">Date & Time</th>
                  <th className="py-4 px-4 text-center w-24 sm:w-28">Fees</th>
                  <th className="py-4 px-4 text-center w-20 sm:w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length > 0 ? (
                  appointments.reverse().map((appointment, index) => (
                    <tr key={index} className="border-b hover:bg-gray-100 transition duration-300">
                      <td className="py-4 px-2 text-gray-700 font-medium text-center">{index + 1}</td>
                      <td className="py-4 px-4 flex items-center space-x-3 sm:space-x-4">
                        <img
                          src={appointment.userData.image}
                          alt="Patient"
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border object-cover"
                        />
                        <span className="text-gray-700 truncate w-[80px] sm:w-auto font-medium">
                          {appointment.userData.name}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-white text-xs sm:text-sm ${appointment.payment ? 'bg-green-500' : 'bg-red-500'}`}>
                          {appointment.payment ? 'Online' : 'Cash'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-700 font-medium">
                        {calculateAge(appointment.userData.dob)}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {slotDateFormat(appointment.slotDate)}, {appointment.slotTime}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-800 font-medium">
                        {currency}{appointment.amount}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {appointment.cancelled ? (
                          <p className="text-red-500 font-medium">Cancelled</p>
                        ) : appointment.isCompleted ? (
                          <p className="text-green-500 font-medium">Completed</p>
                        ) : (
                          <div className="flex items-center justify-center gap-4">
                            <img
                              src={assets.cancel_icon}
                              alt="Cancel"
                              className="w-8 h-8 sm:w-10 sm:h-10 cursor-pointer hover:opacity-80 transition-all active:scale-90"
                              onClick={() => cancelAppointment(appointment._id)}
                            />
                            <img
                              src={assets.tick_icon}
                              alt="Confirm"
                              className="w-8 h-8 sm:w-10 sm:h-10 cursor-pointer hover:opacity-80 transition-all active:scale-90"
                              onClick={() => completeAppointment(appointment._id)}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500 text-lg">No appointments found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointment;
