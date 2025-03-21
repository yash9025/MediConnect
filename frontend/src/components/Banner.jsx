import React from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';

const Banner = () => {
    const navigate = useNavigate();
    const isLoggedIn = localStorage.getItem('token'); // Replace with actual auth logic

    return (
        <div className="relative bg-gradient-to-br from-blue-600 to-green-500 text-white overflow-hidden py-12 w-full mx-auto rounded-none shadow-lg">
            {/* Floating Background Elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>

            <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-20 lg:px-32 relative z-10 max-w-[1400px] mx-auto">
                {/* Left Side */}
                <div className="text-center md:text-left max-w-lg">
                    <p className="text-3xl md:text-4xl font-bold drop-shadow-lg mb-2">
                        Your Health, Our Priority!
                    </p>
                    <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-6">
                        Consult Top-Rated Doctors Anytime, Anywhere.
                    </p>
                    {isLoggedIn ? (
                        <button onClick={() => {navigate('/doctors'); scrollTo(0,0); }} className="bg-white text-blue-600 font-semibold py-3 px-6 rounded-full shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 hover:bg-gray-200">
                            Book Appointment
                        </button>
                    ) : (
                        <button onClick={() => { navigate('/login'); scrollTo(0, 0); }} className="bg-white text-blue-600 font-semibold py-3 px-6 rounded-full shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 hover:bg-gray-200">
                            Create Account
                        </button>
                    )}
                </div>

                {/* Right Side */}
                <div className="mt-8 md:mt-0">
                    <img
                        src={assets.appointment_img}
                        alt="Doctor Appointment"
                        className="w-64 md:w-80 lg:w-96 rounded-lg drop-shadow-2xl transform transition-all duration-500 hover:scale-105"
                    />
                </div>
            </div>
        </div>
    );
};

export default Banner;
