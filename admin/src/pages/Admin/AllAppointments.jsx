import  { useContext, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

const AllAppointments = () => {
  const { aToken, appointments, getAllAppointments, cancelAppointment } =
    useContext(AdminContext);
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  useEffect(() => {
    if (aToken) {
      getAllAppointments();
    }
  }, [aToken]);

  return (
    <div className="w-full max-w-6xl m-5 md:ml-[250px] ml-16 md:mt-[20px] mt-8 p-4 min-h-screen">
      <h1 className="text-4xl md:text-5xl font-extrabold text-center mt-16 mb-10 
              bg-gradient-to-r from-blue-500 to-green-500 text-transparent bg-clip-text">
        All Appointments
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {appointments.map((appointment, index) => (
          <div 
            key={appointment._id} 
            className="bg-white shadow-lg rounded-xl p-5 border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            
            {/* Header: ID + Status Badge */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <span className="text-gray-500 font-semibold text-sm">#{index + 1}</span>
              {appointment.cancelled ? (
                <span className="text-xs text-red-600 font-bold bg-red-100 px-3 py-1 rounded-full">Cancelled</span>
              ) : appointment.isCompleted ? (
                <span className="text-xs text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">Completed</span>
              ) : (
                <span className="text-xs text-blue-600 font-bold bg-blue-100 px-3 py-1 rounded-full">Active</span>
              )}
            </div>

            {/* Patient & Doctor Info */}
            <div className="space-y-4">
              
              {/* Patient Row */}
              <div className="flex items-center gap-3">
                <img src={appointment.userData.image} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                <div>
                  <p className="font-bold text-gray-800">{appointment.userData.name}</p>
                  <p className="text-xs text-gray-500">Patient • Age: {calculateAge(appointment.userData.dob)}</p>
                </div>
              </div>

              {/* Doctor Row */}
              <div className="flex items-center gap-3">
                <img src={appointment.docData.image} alt="" className="w-12 h-12 rounded-full object-cover bg-gray-100 border-2 border-white shadow-sm" />
                <div>
                  <p className="font-bold text-gray-800">Dr. {appointment.docData.name}</p>
                  <p className="text-xs text-gray-500">Specialist</p>
                </div>
              </div>
            </div>

            {/* Date, Time & Fees */}
            <div className="mt-5 bg-gray-50 p-3 rounded-lg flex justify-between items-center">
              <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Time</p>
                  <p className="text-sm font-bold text-gray-700 mt-1">
                    {slotDateFormat(appointment.slotDate)} | {appointment.slotTime}
                  </p>
              </div>
              <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fees</p>
                  <p className="text-lg font-bold text-gray-800">{currency}{appointment.amount}</p>
              </div>
            </div>

            {/* Cancel Button */}
            {!appointment.cancelled && !appointment.isCompleted && (
              <button 
                onClick={() => cancelAppointment(appointment._id)} 
                className="w-full mt-4 flex items-center justify-center gap-2 bg-red-50 text-red-500 font-semibold py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300 cursor-pointer"
              >
                <img src={assets.cancel_icon} className="w-4 h-4" alt="" />
                Cancel Appointment
              </button>
            )}

          </div>
        ))}

      </div>

    </div>
  );
};

export default AllAppointments;