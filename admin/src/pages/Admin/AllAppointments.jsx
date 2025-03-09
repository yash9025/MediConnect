import React, { useContext, useEffect } from "react";
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
    <div className=" min-h-screen bg-gray-100 p-4 md:ml-[250px] ml-15 md:mt-[20px] mt-8">
      <h1 className="mt-16 text-xl sm:text-3xl font-bold mb-6 text-gray-800">
        All Appointments
      </h1>

      <div className=" bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm sm:text-lg">
            <thead>
              <tr className="bg-gray-200 text-gray-700 font-semibold">
                <th className="py-4 sm:py-5 px-4 text-left w-12 sm:w-16">#</th>
                <th className="py-4 sm:py-5 px-4 text-left min-w-[160px]">Patient</th>
                <th className="py-4 sm:py-5 px-4 text-center w-20">Age</th>
                <th className="py-4 sm:py-5 px-4 text-left w-64">Date & Time</th>
                <th className="py-4 sm:py-5 px-4 text-left min-w-[160px]">Doctor</th>
                <th className="py-4 sm:py-5 px-4 text-center w-28">Fees</th>
                <th className="py-4 sm:py-5 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>

            <tbody>
              {appointments.length > 0 ? (
                appointments.map((appointment, index) => (
                  <tr
                    key={appointment._id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    {/* Index */}
                    <td className="py-5 px-4">{index + 1}</td>

                    {/* Patient */}
                    <td className="py-5 px-4 flex items-center space-x-4">
                      <img
                        src={appointment.userData.image}
                        alt="Patient"
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border"
                      />
                      <span className="text-gray-700 truncate w-[100px] sm:w-auto">
                        {appointment.userData.name}
                      </span>
                    </td>

                    {/* Age */}
                    <td className="py-5 px-4 text-center">
                      {calculateAge(appointment.userData.dob)}
                    </td>

                    {/* Date & Time */}
                    <td className="py-5 px-4">
                      {slotDateFormat(appointment.slotDate)}, {appointment.slotTime}
                    </td>

                    {/* Doctor */}
                    <td className="py-5 px-4 flex items-center space-x-4">
                      <img
                        src={appointment.docData.image}
                        alt="Doctor"
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border"
                      />
                      <span className="text-gray-700 truncate w-[100px] sm:w-auto">
                        Dr. {appointment.docData.name}
                      </span>
                    </td>

                    {/* Fees */}
                    <td className="py-5 px-4 text-center">
                      {currency}
                      {appointment.amount}
                    </td>

                    {/* Actions */}
                    <td className="py-5 px-4 text-center">
                      {appointment.cancelled ? (
                        <p className="text-red-400 font-medium">Cancelled</p>
                      ) : appointment.isCompleted
                        ? <p className="text-green-400 font-medium">Completed</p>
                        : (
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
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500 text-lg">
                    No appointments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllAppointments;
