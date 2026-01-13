import  { useContext, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";

const AdminDashboard = () => {
  const { aToken, getDashData, cancelAppointment, dashData } = useContext(AdminContext);
  const { slotDateFormat } = useContext(AppContext);

  useEffect(() => {
    if (aToken) {
      getDashData();
    }
  }, [aToken, getDashData]);

  console.log("Dash Data:", dashData);

  return dashData && (

    <div className="md:mt-[90px] mt-20 p-8 bg-white min-h-screen md:ml-[250px] ml-16 transition-all duration-300 w-full">
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
        {[
          { label: "Doctors", count: dashData?.doctors || 0, icon: assets.doctor_icon },
          { label: "Appointments", count: dashData?.appointments || 0, icon: assets.appointment_icon },
          { label: "Patients", count: dashData?.patients || 0, icon: assets.patients_icon },
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

      {/* Latest Appointments */}
      <div className="bg-white shadow-lg rounded-xl p-8 w-full">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">
          Latest Appointments
        </h2>

        <div className="space-y-6">
          {dashData.latestAppointments.map((appointment, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm hover:shadow-md transition gap-4"
            >
              {/* Doctor Image & Details */}
              <div className="flex items-center space-x-4 w-full sm:w-auto">
                <img
                  src={appointment.docData.image}
                  alt={appointment.docData.name}
                  className="w-16 h-16 rounded-full object-cover border border-gray-300 shrink-0"
                />

                <div className="min-w-0">
                  <p className="text-lg font-medium text-gray-800 truncate">{appointment.docData.name}</p>
                  <p className="text-sm text-gray-600">Booking for {slotDateFormat(appointment.slotDate)}</p>
                </div>
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end w-full sm:w-auto">
                {appointment.cancelled ? (
                  <p className="text-red-400 font-medium">Cancelled</p>
                ) : appointment.isCompleted ? (
                  <p className="text-green-400 font-medium">Completed</p>
                ) : (
                  <button
                    className="cursor-pointer bg-red-100 text-red-500 rounded-full p-3 hover:bg-red-200 transition"
                    onClick={() => cancelAppointment(appointment._id)}
                  >
                    <img
                      src={assets.cancel_icon}
                      alt=""
                      className="w-6 h-6 sm:w-7 sm:h-7"
                    />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;