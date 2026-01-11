import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { assets } from '../assets/assets';
import RelatedDoctors from '../components/RelatedDoctors';
import { toast } from "react-toastify";
import axios from 'axios';
import MedicalChatBot from '../components/MedicalChatBot';

const Appointment = () => {
  const { docId } = useParams();
  const { doctors, currencySymbol, backendUrl, token, getDoctorData } = useContext(AppContext);
  const slotContainerRef = useRef(null);

  const navigate = useNavigate();

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const [docInfo, setDocInfo] = useState(null);
  const [docSlots, setDocSlots] = useState([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotTime, setSlotTime] = useState('');
  const [selectedDate, setSelectedDate] = useState('');



  useEffect(() => {
    const foundDoctor = doctors.find(doc => doc._id === docId);
    setDocInfo(foundDoctor);
  }, [doctors, docId]);

  

  useEffect(() => {
    const getAvailableSlots = () => {
      if (!docInfo || !docInfo.slots_booked) return;
      let slots = [];
      let today = new Date();

      for (let i = 0; i < 30; i++) {
        let currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);

        let endTime = new Date(currentDate);
        endTime.setHours(21, 0, 0, 0);

        if (i === 0) {
          currentDate.setHours(Math.max(today.getHours(), 9));
          currentDate.setMinutes(today.getMinutes() > 30 ? 30 : 0);
        } else {
          currentDate.setHours(9, 0, 0, 0);
        }

        let timeSlots = [];
        while (currentDate < endTime) {
          let formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          let day = currentDate.getDate();
          let month = currentDate.getMonth() + 1;
          let year = currentDate.getFullYear();

          const slotDate = day + "_" + month + "_" + year;
          const slotTime = formattedTime;

          const isSlotAvailable = docInfo.slots_booked[slotDate] && docInfo.slots_booked[slotDate].includes(slotTime) ? false : true;

          if (isSlotAvailable) {
            timeSlots.push({
              datetime: new Date(currentDate),
              time: formattedTime
            })

          }


          currentDate.setMinutes(currentDate.getMinutes() + 30);
        }
        slots.push(timeSlots);
      }
      setDocSlots(slots);
    };

    getAvailableSlots();
  }, [docId,docInfo]);

  const bookAppointment = async () => {
    if (!token) {
      toast.warn('Login to book appointment');
      return navigate('/login');
    }

    try {

      const date = docSlots[slotIndex][0].datetime;

      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();

      const slotDate = day + "_" + month + "_" + year

      const { data } = await axios.post(backendUrl + '/api/user/book-appointment', { docId, slotDate, slotTime }, { headers: { token } });

      if (data.success) {
        toast.success(data.message);
        getDoctorData();
        navigate('/my-appointments');
      } else {
        toast.error(data.message);
      }

    } catch (error) {
      console.log(error);
      toast.error(error.message);

    }
  }

  

  const scrollSlots = (direction) => {
    if (slotContainerRef.current) {
      const scrollAmount = 200;
      slotContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };



  return docInfo && (
    <div className="w-full bg-white py-12">
      <div className="max-w-screen-xl mx-auto p-6 bg-white shadow-xl rounded-2xl border-t-8 border-blue-500">
        <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-8">
          <div className="w-24 h-24 lg:w-32 lg:h-32 relative">
            <img src={docInfo.image} alt="Doctor" className="w-full h-full object-cover rounded-full border-4 border-blue-500 shadow-sm" />
            <img src={assets.verified_icon} alt="Verified" className="absolute top-0 right-0 w-6 h-6 bg-white rounded-full p-1 shadow-md border-2 border-blue-500 transform translate-x-2 translate-y-2" />
          </div>

          <div className="flex-1 text-center lg:text-left">
            <p className="text-4xl font-semibold text-gray-800 hover:text-blue-600 transition-all duration-300">{docInfo.name}</p>
            <p className="text-xs lg:text-sm text-gray-600">{docInfo.degree} - {docInfo.speciality}</p>
            <div className="mt-2">
              <button className="py-1 px-4 bg-gray-50 text-black text-xs rounded-full shadow transition duration-300">{docInfo.experience}</button>
            </div>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              Appointment fee: <span className="text-blue-500">{currencySymbol}{docInfo.fees}</span>
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xl font-semibold text-gray-800 flex items-center justify-center lg:justify-start">
            About <img src={assets.info_icon} alt="Info" className="w-6 h-6 ml-2 text-blue-500" />
          </p>
          <p className="mt-4 text-gray-700 leading-relaxed text-sm lg:text-base">{docInfo.about}</p>
        </div>
      </div>

      <div className="mt-8 mx-auto max-w-screen-lg px-4">
        <p className="text-lg font-semibold text-gray-800">Select a Booking Slot</p>
        <div className="relative flex items-center">
          <button
            onClick={() => scrollSlots("left")}
            className="absolute left-0 z-10 bg-gray-200 p-2 rounded-full shadow-md hover:bg-gray-300 transition hidden sm:block"
          >
            ◀
          </button>

          <div ref={slotContainerRef} className="flex gap-4 items-center w-full overflow-x-auto mt-4 pb-2 scroll-smooth">
            {docSlots.length > 0 ? (
              docSlots.map((item, index) => {
                const dateObj = item[0]?.datetime ? new Date(item[0].datetime) : null;
                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSlotIndex(index);
                      setSelectedDate(`${daysOfWeek[dateObj.getDay()]}, ${months[dateObj.getMonth()]} ${dateObj.getDate()}`);
                      setSlotTime('');
                    }}
                    className={`text-center py-4 px-6 min-w-[100px] rounded-lg cursor-pointer border transition-all ${slotIndex === index ? " bg-blue-500 text-white border-blue-500" : "border-gray-300 hover:border-blue-500 hover:text-blue-500"
                      }`}
                  >
                    <p className="text-sm font-medium">{dateObj ? `${daysOfWeek[dateObj.getDay()]}, ${months[dateObj.getMonth()]} ${dateObj.getDate()}` : "Invalid Date"}</p>
                  </div>
                );
              })
            ) : (
              <p>No slots available</p>
            )}
          </div>

          <button
            onClick={() => scrollSlots("right")}
            className="absolute right-0 z-10 bg-gray-200 p-2 rounded-full shadow-md hover:bg-gray-300 transition hidden sm:block"
          >
            ▶
          </button>
        </div>

        {docSlots.length > 0 && docSlots[slotIndex] && (
          <div className="mt-6">
            <p className="text-lg font-semibold text-gray-800">Select a Time</p>
            <div className="grid grid-cols-4 gap-4 mt-4">
              {docSlots[slotIndex].map((slot, i) => (
                <button
                  key={i}
                  onClick={() => setSlotTime(slot.time)}
                  className={`py-2 px-4 rounded-lg border transition-all ${slotTime === slot.time ? "bg-blue-500 text-white border-blue-500" : "border-gray-300 hover:border-blue-500 hover:text-blue-500"
                    }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className={`mt-10 w-full py-3 text-lg font-semibold rounded-lg transition ${slotTime ? "cursor-pointer bg-blue-500 text-white hover:bg-blue-600" : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          disabled={!slotTime}
          onClick={() => {
            bookAppointment();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Book Appointment
        </button>

      </div>

      {/* Listing related doctors */}
      <RelatedDoctors docId={docId} speciality={docInfo.speciality} />
      <MedicalChatBot/>
    </div>
  );
};

export default Appointment;
