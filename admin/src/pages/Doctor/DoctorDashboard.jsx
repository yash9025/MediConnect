import React, { useContext, useEffect } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { assets } from '../../assets/assets';
import { AppContext } from '../../context/AppContext';

const DoctorDashboard = () => {
  const { dToken, dashData, getDashData ,cancelAppointment, completeAppointment} = useContext(DoctorContext);
  const { currency, slotDateFormat } = useContext(AppContext);

  useEffect(() => {
    if (dToken) {
      getDashData();
    }
  }, [dToken]);

  return (
    dashData && (
      <div className="mt-24 p-6 sm:p-8 bg-white min-h-screen transition-all duration-300
                      ml-[250px] sm:ml-[80px] w-[calc(100%-250px)] sm:w-[calc(100%-80px)]
                      overflow-hidden">
        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-screen-lg mx-auto">
          {[
            { label: 'Earnings', count: `${currency}${dashData?.earnings ?? 0}`, icon: assets.earning_icon },
            { label: 'Appointments', count: dashData?.appointments || 0, icon: assets.appointment_icon },
            { label: 'Patients', count: dashData?.patients || 0, icon: assets.patients_icon },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-green-100 p-6 rounded-xl shadow-lg flex flex-col items-center space-y-3 
                         text-gray-800 hover:scale-105 transition-transform duration-300 
                         w-full max-w-[250px] sm:max-w-[300px] mx-auto"
            >
              <div className="w-14 h-14">
                <img src={item.icon} alt={item.label} className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">{item.count}</h2>
                <p className="text-md">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-6 bg-white min-h-screen transition-all duration-300 w-full lg:ml-[150px]">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">
            Latest Appointments
          </h2>

          <div className="space-y-4 max-w-5xl">
            {dashData.latestAppointments.map((appointment, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-100 p-6 rounded-lg shadow-sm hover:shadow-md transition w-full"
              >
                {/* Doctor Image & Info */}
                <div className="flex items-center space-x-3">
                  <img
                    src={appointment.userData.image}
                    alt={appointment.userData.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-300"
                  />

                  <div className="text-sm">
                    <p className="font-medium text-gray-800">{appointment.userData.name}</p>
                    <p className="text-gray-600">Booking for {slotDateFormat(appointment.slotDate)}</p>
                  </div>
                </div>

                {/* Cancel Button */}
                {appointment.cancelled ? (
                  <p className="text-red-500 font-medium">Cancelled</p>
                ) : appointment.isCompleted ? (
                  <p className="text-green-500 font-medium">Completed</p>
                ) : (
                  <div className="flex items-center gap-3"> {/* Flexbox to align buttons side by side */}
                    <img
                      src={assets.cancel_icon}
                      alt="Cancel"
                      className="bg-red-500 rounded-4xl h-10 cursor-pointer hover:opacity-80 transition-all active:scale-90"
                      onClick={() => cancelAppointment(appointment._id)}
                    />
                    <img
                      src={assets.tick_icon}
                      alt="Confirm"
                      className="bg-green-500 rounded-4xl w-10 h-10 cursor-pointer hover:opacity-80 transition-all active:scale-90"
                      onClick={() => completeAppointment(appointment._id)}
                    />
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>

      </div>
    )
  );
};

export default DoctorDashboard;
