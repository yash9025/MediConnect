import  { useContext, useEffect } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { assets } from '../../assets/assets';
import { AppContext } from '../../context/AppContext';

const DoctorDashboard = () => {
  const { dToken, dashData, getDashData, cancelAppointment, completeAppointment } = useContext(DoctorContext);
  const { currency, slotDateFormat } = useContext(AppContext);

  useEffect(() => {
    if (dToken) {
      getDashData();
    }
  }, [dToken]);

  return (
    dashData && (
      <div className="md:mt-[90px] mt-24 p-4 sm:p-8 bg-white min-h-screen md:ml-64 ml-16 transition-all duration-300">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-screen-lg mx-auto">
          {[
            { label: 'Earnings', count: `${currency}${dashData?.earnings ?? 0}`, icon: assets.earning_icon },
            { label: 'Appointments', count: dashData?.appointments || 0, icon: assets.appointment_icon },
            { label: 'Patients', count: dashData?.patients || 0, icon: assets.patients_icon },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-green-100 p-6 rounded-xl shadow-lg flex flex-col items-center space-y-3 
                           text-gray-800 hover:scale-105 transition-transform duration-300 w-full"
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

        <div className="mt-10 w-full max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">
            Latest Appointments
          </h2>

          <div className="space-y-4">
            {dashData.latestAppointments.map((appointment, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-100 p-6 rounded-lg shadow-sm hover:shadow-md transition w-full gap-4"
              >
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <img
                    src={appointment.userData.image}
                    alt={appointment.userData.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-300 flex-shrink-0"
                  />

                  <div className="text-sm min-w-0">
                    <p className="font-medium text-gray-800 truncate">{appointment.userData.name}</p>
                    <p className="text-gray-600 truncate">Booking for {slotDateFormat(appointment.slotDate)}</p>
                  </div>
                </div>

                <div className="flex justify-end w-full sm:w-auto">
                  {appointment.cancelled ? (
                    <p className="text-red-500 font-medium">Cancelled</p>
                  ) : appointment.isCompleted ? (
                    <p className="text-green-500 font-medium">Completed</p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img
                        src={assets.cancel_icon}
                        alt="Cancel"
                        className="bg-red-500 rounded-full w-10 h-10 p-2 cursor-pointer hover:opacity-80 transition-all active:scale-90"
                        onClick={() => cancelAppointment(appointment._id)}
                      />
                      <img
                        src={assets.tick_icon}
                        alt="Confirm"
                        className="bg-green-500 rounded-full w-10 h-10 p-2 cursor-pointer hover:opacity-80 transition-all active:scale-90"
                        onClick={() => completeAppointment(appointment._id)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    )
  );
};

export default DoctorDashboard;