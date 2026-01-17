import  { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { MedicalChatBot } from "../features/rag";
import LiveQueue from "../components/LiveQueue";

const MyAppointments = () => {
  const { currencySymbol, backendUrl, token, getDoctorData } =
    useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const months = [
    " ",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const navigate = useNavigate();

  const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split("_");
    return `${dateArray[0]} ${months[Number(dateArray[1])]} ${dateArray[2]}`;
  };

  const getUserAppointments = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/appointments`, {
        headers: { token },
      });
      if (data.success) {
        const { data: doctorData } = await axios.get(
          `${backendUrl}/api/doctor/list`
        );
        const updatedAppointments = data.appointments.map((appointment) => {
          const updatedDoctor = doctorData.doctors.find(
            (doc) => doc._id === appointment.docData._id
          );
          return updatedDoctor
            ? { ...appointment, docData: updatedDoctor }
            : appointment;
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
      const { data } = await axios.post(
        `${backendUrl}/api/user/cancel-appointment`,
        { appointmentId },
        { headers: { token } }
      );
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
      name: "Appointment Payment",
      description: "Appointment Payment",
      order_id: order.id,
      receipt: order.receipt,
      handler: async (response) => {
        try {
          await axios.post(
            `${backendUrl}/api/user/verifyrazorpay`,
            response,
            { headers: { token } }
          );
          getUserAppointments();
          navigate("/my-appointments");
        } catch (error) {
          console.log(error);
          toast.error(error.message);
        }
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const appointmentRazorpay = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/payment-razorpay`,
        { appointmentId },
        { headers: { token } }
      );
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
          My Appointments
        </h1>
        {/* Decorative Accent Bar */}
        <div className="h-1.5 w-16 bg-blue-500 rounded-full mx-auto my-3 opacity-80"></div>
      </div>

      <div className="flex flex-col space-y-6">
        {appointments.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:border-blue-100 transition-all duration-300 relative overflow-hidden group"
          >
            {/* Status Strip on Left - CHANGED TO BLUE-500 */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                item.cancelled
                  ? "bg-red-400"
                  : item.isCompleted
                  ? "bg-green-400"
                  : (item.status === "Absent" || item.status === "Skipped")
                  ? "bg-amber-400"
                  : "bg-blue-500"
              }`}
            ></div>

            <div className="flex flex-col lg:flex-row gap-6 pl-2">
              {/* 1. DOCTOR & SLOT TIME SECTION */}
              <div className="flex gap-5 flex-1 items-start">
                <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
                  <img
                    src={item.docData.image}
                    alt=""
                    className="w-full h-full rounded-2xl object-cover bg-slate-50 shadow-sm"
                  />

                  {/* --- SLOT TIME BADGE --- */}
                  <div className="absolute -bottom-3 -right-3 bg-white p-1 rounded-xl shadow-md">
                    <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                      {item.slotTime}
                    </div>
                  </div>
                  {/* --- BOOKING ID BADGE --- */}
                  <div className="absolute -top-2 -left-2 bg-white p-0.5 rounded-lg shadow-md">
                    <div className="bg-slate-700 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      #{item._id?.slice(-6).toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center pt-1">
                  <p className="text-xl md:text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {item.docData.name}
                  </p>
                  <p className="text-sm text-blue-500 font-semibold uppercase tracking-wide mb-2">
                    {item.docData.speciality}
                  </p>

                  <p className="text-xs text-slate-500 font-medium mb-0.5 uppercase tracking-wider">
                    Location
                  </p>
                  <p className="text-sm text-slate-600 leading-tight">
                    {item.docData.address.line1}
                  </p>
                  <p className="text-sm text-slate-600 leading-tight">
                    {item.docData.address.line2}
                  </p>

                  {/* INFO PILLS */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {/* Date Pill */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <svg
                        className="w-4 h-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        ></path>
                      </svg>
                      <span className="text-sm font-semibold text-slate-700">
                        {slotDateFormat(item.slotDate)}
                      </span>
                    </div>
                    {/* Time Pill */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <svg
                        className="w-4 h-4 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <span className="text-sm font-semibold text-slate-700">
                        {item.slotTime}
                      </span>
                    </div>
                    {/* Fees Pill */}
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <span className="text-sm font-bold text-green-700">
                        {currencySymbol}
                        {item.docData.fees}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. LIVE QUEUE COMPONENT (Middle) */}
              {/* Only visible if appointment is Valid and not Absent */}
              {!item.cancelled && !item.isCompleted && item.status !== "Absent" && item.status !== "Skipped" && (
                <div className="w-full lg:w-96 flex-shrink-0">
                  <LiveQueue docId={item.docId} mySlotTime={item.slotTime} />
                </div>
              )}

              {/* 3. BUTTONS (Right) */}
              <div className="flex flex-col justify-center space-y-3 w-full lg:w-48 pt-4 lg:pt-0 lg:border-l lg:pl-6 border-slate-100">
                {!item.cancelled && item.payment && !item.isCompleted && item.status !== "Absent" && item.status !== "Skipped" && (
                  <button className="w-full bg-emerald-50 text-emerald-600 py-3 px-4 rounded-xl font-bold cursor-default border border-emerald-100 flex items-center justify-center gap-2 shadow-sm">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Paid
                  </button>
                )}

                {!item.cancelled && !item.payment && !item.isCompleted && item.status !== "Absent" && item.status !== "Skipped" && (
                  <button
                    onClick={() => appointmentRazorpay(item._id)}
                    className="cursor-pointer w-full bg-gradient-to-r from-blue-600 to-sky-600 text-white py-3 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 font-semibold text-sm transform hover:-translate-y-0.5"
                  >
                    Pay Online
                  </button>
                )}

                {!item.cancelled && !item.isCompleted && item.status !== "Absent" && item.status !== "Skipped" && (
                  <button
                    onClick={() => cancelAppointment(item._id)}
                    className="cursor-pointer w-full bg-white text-slate-500 border border-slate-200 py-3 px-4 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all duration-300 font-semibold text-sm"
                  >
                    Cancel
                  </button>
                )}

                {item.cancelled && (
                  <div className="w-full bg-slate-50 text-slate-400 py-3 px-4 rounded-xl font-medium text-center border border-slate-200 flex flex-col items-center">
                    <span className="text-xs uppercase tracking-widest">
                      Status
                    </span>
                    <span className="font-bold">Cancelled</span>
                  </div>
                )}

                {item.isCompleted && (
                  <div className="w-full bg-green-50 text-green-600 py-3 px-4 rounded-xl font-medium text-center border border-green-200 flex flex-col items-center">
                    <span className="text-xs uppercase tracking-widest text-green-400">
                      Status
                    </span>
                    <span className="font-bold">Completed</span>
                  </div>
                )}

                {(item.status === "Absent" || item.status === "Skipped") && !item.cancelled && !item.isCompleted && (
                  <div className="w-full space-y-3">
                    <div className="w-full bg-amber-50 text-amber-600 py-3 px-4 rounded-xl font-medium text-center border border-amber-200 flex flex-col items-center">
                      <span className="text-xs uppercase tracking-widest text-amber-400">
                        Status
                      </span>
                      <span className="font-bold">Marked Absent</span>
                    </div>
                    <button
                      onClick={() => navigate(`/appointment/${item.docId}`)}
                      className="cursor-pointer w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 font-semibold text-sm transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <span>Book New Appointment</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <MedicalChatBot />
    </div>
  );
};

export default MyAppointments;
