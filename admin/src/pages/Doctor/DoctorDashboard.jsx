import { useContext, useEffect } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";

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
      <div className="md:mt-[90px] mt-20 p-8 bg-white min-h-screen md:ml-[250px] ml-16 transition-all duration-300 w-full">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {[
            { label: "Earnings", count: `${currency} ${dashData.earnings}`, icon: assets.earning_icon },
            { label: "Appointments", count: dashData.appointments, icon: assets.appointment_icon },
            { label: "Patients", count: dashData.patients, icon: assets.patients_icon },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-green-100 p-6 rounded-xl shadow-lg flex flex-col items-center space-y-4 text-gray-800 hover:scale-105 transition-transform overflow-hidden"
            >
              <div className="w-16 h-16">
                <img src={item.icon} alt={item.label} className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold">{item.count}</h2>
                <p className="text-lg">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white shadow-lg rounded-xl p-8 w-full">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">
            Latest Appointments
          </h2>

          <div className="space-y-6">
            {dashData.latestAppointments.map((item) => (
              <div
                key={item._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm hover:shadow-md transition gap-4"
              >
                <div className="flex items-center space-x-4 w-full sm:w-auto">
                  <img
                    src={item.userData.image}
                    alt={item.userData.name}
                    className="w-16 h-16 rounded-full object-cover border border-gray-300 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-lg font-medium text-gray-800 truncate">{item.userData.name}</p>
                    <p className="text-sm text-gray-600">Booking for {slotDateFormat(item.slotDate)}</p>
                  </div>
                </div>

                <div className="flex justify-end w-full sm:w-auto">
                  {item.cancelled ? (
                    <p className="text-red-400 font-medium">Cancelled</p>
                  ) : item.isCompleted ? (
                    <p className="text-green-400 font-medium">Completed</p>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => cancelAppointment(item._id)}
                        className="cursor-pointer bg-red-100 text-red-500 rounded-full p-3 hover:bg-red-200 transition"
                      >
                         <img src={assets.cancel_icon} className="w-6 h-6 sm:w-7 sm:h-7" alt="Cancel" />
                      </button>
                      
                      <button
                        onClick={() => completeAppointment(item._id)}
                        className="cursor-pointer bg-green-100 text-green-500 rounded-full p-3 hover:bg-green-200 transition"
                      >
                         <img src={assets.tick_icon} className="w-6 h-6 sm:w-7 sm:h-7" alt="Confirm" />
                      </button>
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