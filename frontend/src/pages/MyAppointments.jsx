import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const MyAppointments = () => {
  const { currencySymbol, backendUrl, token, getDoctorData } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const months = [" ", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const navigate = useNavigate();

  const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split('_');
    return `${dateArray[0]} ${months[Number(dateArray[1])]} ${dateArray[2]}`;
  };

  const getUserAppointments = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/appointments`, { headers: { token } });

      if (data.success) {
        const { data: doctorData } = await axios.get(`${backendUrl}/api/doctor/list`);
        const updatedAppointments = data.appointments.map(appointment => {
          const updatedDoctor = doctorData.doctors.find(doc => doc._id === appointment.docData._id);
          return updatedDoctor ? { ...appointment, docData: updatedDoctor } : appointment;
        });
        setAppointments(updatedAppointments.reverse());
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/cancel-appointment`, { appointmentId }, { headers: { token } });

      if (data.success) {
        toast.success(data.message);
        getUserAppointments();
        getDoctorData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const intitPay = (order) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Appointment Payment',
      description: 'Appointment Payment',
      order_id: order.id,
      receipt: order.receipt,
      handler: async (response) => {
        try {
          const { data } = await axios.post(`${backendUrl}/api/user/verifyrazorpay`, response, { headers: { token } });
          getUserAppointments();
          navigate('/my-appointments');
        } catch (error) {
          console.log(error);
          toast.error(error.message);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const appointmentRazorpay = async (appointmentId) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/payment-razorpay`, { appointmentId }, { headers: { token } });

      if (data.success) {
        intitPay(data.order);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (token) {
      getUserAppointments();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">My Appointments</h1>
      <div className="flex flex-col space-y-6">
        {appointments.map((doctor, index) => (
          <div key={index} className="w-full bg-white shadow-lg rounded-lg p-4 md:p-6 flex flex-col md:flex-row items-center md:items-start md:justify-between hover:shadow-xl transition-shadow duration-300">
            {/* Image Section */}
            <div className="w-24 h-24 md:w-40 md:h-40 flex-shrink-0">
              <img src={doctor.docData.image} alt="" className="w-full h-full rounded-full object-cover" />
            </div>

            {/* Information Section */}
            <div className="flex-1 text-center md:text-left px-4">
              <p className="text-xl md:text-2xl font-semibold text-gray-800">{doctor.docData.name}</p>
              <p className="text-sm text-gray-600">{doctor.docData.speciality}</p>
              <p className="text-sm text-gray-500">{doctor.docData.email}</p>
              <div className="mt-2">
                <p className="text-sm text-gray-600">Address:</p>
                <p className="text-sm text-gray-500">{doctor.docData.address.line1}</p>
                <p className="text-sm text-gray-500">{doctor.docData.address.line2}</p>
              </div>
              <p className="text-sm text-gray-600 mt-2"><span className="font-semibold">Date & Time:</span> {slotDateFormat(doctor.slotDate)} | {doctor.slotTime}</p>
              <p className="text-sm text-gray-600"><span className="font-semibold">Fees:</span> {currencySymbol}{doctor.docData.fees}</p>
            </div>

            {/* Buttons Section */}
            <div className="flex flex-col space-y-2">
              {!doctor.cancelled && doctor.payment && !doctor.isCompleted && (
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold shadow-md hover:bg-green-700 transition duration-300">
                  Paid
                </button>
              )}
              {!doctor.cancelled && !doctor.payment && !doctor.isCompleted && (
                <button onClick={() => appointmentRazorpay(doctor._id)} className="mt-6 cursor-pointer bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300">
                  Pay Online
                </button>
              )}
              {!doctor.cancelled && !doctor.isCompleted && (
                <button onClick={() => cancelAppointment(doctor._id)} className="cursor-pointer bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors duration-300">
                  Cancel Appointment
                </button>
              )}
              {doctor.cancelled && !doctor.isCompleted && (
                <button className="mt-6 bg-red-500 text-white py-3 px-6 rounded-xl shadow-lg cursor-not-allowed opacity-80">
                  Appointment Cancelled
                </button>
              )}
              {doctor.isCompleted && (
                <button className="mt-6 bg-green-500 text-white py-3 px-6 rounded-xl shadow-lg cursor-not-allowed opacity-80">
                  Appointment Completed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyAppointments;
