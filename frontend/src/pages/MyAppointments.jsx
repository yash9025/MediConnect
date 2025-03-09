import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const MyAppointments = () => {

  const { currencySymbol, backendUrl, token, getDoctorData } = useContext(AppContext);

  const [appointments, setAppointments] = useState([]);
  const months = [" ", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  //function to get date format correctly
  const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split('_');
    return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
  }

  const navigate = useNavigate();

  const getUserAppointments = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/appointments`, { headers: { token } });

      if (data.success) {
        // Fetch latest doctor data
        const { data: doctorData } = await axios.get(`${backendUrl}/api/doctor/list`);

        // Update appointments to use the latest doctor data
        const updatedAppointments = data.appointments.map(appointment => {
          const updatedDoctor = doctorData.doctors.find(doc => doc._id === appointment.docData._id);
          return updatedDoctor ? { ...appointment, docData: updatedDoctor } : appointment;
        });

        setAppointments(updatedAppointments.reverse());
        // Show recent first
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const cancelAppointment = async (appointmentId) => {

    try {

      const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } });

      if (data.success) {
        toast.success(data.message);
        getUserAppointments()
        getDoctorData()
      } else {
        toast.error(data.message);
      }


    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  }

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
        console.log(response);

        try {

          const { data } = await axios.post(backendUrl + '/api/user/verifyrazorpay', response, { headers: { token } });
          getUserAppointments();
          navigate('/my-appointments')
        } catch (error) {
          console.log(error);
          toast.error(error.message);

        }
      }
    }

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  const appointmentRazorpay = async (appointmentId) => {

    try {

      const { data } = await axios.post(backendUrl + '/api/user/payment-razorpay', { appointmentId }, { headers: { token } });

      if (data.success) {
        console.log("Razorpay Order Response:", data);

        intitPay(data.order)

      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  }

  useEffect(() => {
    if (token) {
      getUserAppointments();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">My Appointments</h1>
      <div className="space-y-6">
        {appointments.map((doctor, index) => (
          <div key={index} className="flex items-center justify-between bg-white shadow-xl rounded-lg p-6 hover:shadow-2xl transition-shadow duration-300">

            {/* Image Section (Left) */}
            <div className="w-40 h-40 flex-shrink-0">
              <img src={doctor.docData.image} alt="" className="w-full h-full rounded-full object-cover" />
            </div>

            {/* Information Section (Center) */}
            <div className="flex-1 mx-6">
              <p className="text-2xl font-semibold text-gray-800">{doctor.docData.name}</p>
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

            {/* Buttons Section (Right) */}
            <div className="flex flex-col justify-between items-center space-y-2">
              {!doctor.cancelled && doctor.payment && !doctor.isCompleted && <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold shadow-md hover:bg-green-700 transition duration-300">
                Paid
              </button>
              }
              {!doctor.cancelled && !doctor.payment && !doctor.isCompleted && <button onClick={() => appointmentRazorpay(doctor._id)} className="cursor-pointer bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300">Pay Online</button>}
              {!doctor.cancelled && !doctor.isCompleted && <button onClick={() => cancelAppointment(doctor._id)} className="cursor-pointer bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors duration-300">Cancel Appointment</button>}
              {doctor.cancelled && !doctor.isCompleted && <button className="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl shadow-lg cursor-not-allowed opacity-80 transform hover:scale-105 transition duration-300">
                Appointment Cancelled
              </button>
              }
              {doctor.isCompleted && <button className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl shadow-lg cursor-not-allowed opacity-80 transform hover:scale-105 transition duration-300">Appointment Completed</button>}
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}

export default MyAppointments;
