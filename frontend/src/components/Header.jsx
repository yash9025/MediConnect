import React from 'react'
import { assets } from '../assets/assets'

const Header = () => {
    const handleSmoothScroll = (e) => {
        e.preventDefault();
        const target = document.querySelector("#speciality");
        if (target) {
            window.scrollTo({
                top: target.offsetTop,
                behavior: "smooth"
            });
        }
    };

    return (
        <div className="relative bg-gradient-to-br from-blue-600 to-green-500 text-white overflow-hidden py-12 max-w-[1800px] mx-auto ">
        {/* Floating Background Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
    
        <div className="flex flex-col lg:flex-row justify-between items-center px-6 lg:px-20 relative z-10">
            {/* ------ Left Side ------ */}
            <div className="w-full lg:w-1/2 flex flex-col gap-5 text-center lg:text-left">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-snug drop-shadow-lg">
                    Book an Appointment <br /> with <span className="text-yellow-300">Trusted Doctors</span>
                </h1>
    
                {/* Profile Image & Description */}
                <div className="flex flex-col items-center lg:items-start gap-3">
                    <img src={assets.group_profiles} alt="Group Profiles" className="w-36 md:w-44 drop-shadow-xl" />
                    <p className="text-base md:text-lg text-gray-200 max-w-md leading-relaxed">
                    Connect with top specialists and book your appointment with ease-quality healthcare at your fingertips.
                    </p>
                </div>
    
                {/* Book Appointment Button */}
                <a href="#speciality" onClick={handleSmoothScroll} className="relative mt-4 flex items-center justify-center lg:justify-start gap-2 px-4 py-2 w-fit rounded-full text-base font-semibold shadow-md bg-gradient-to-r from-yellow-300 to-yellow-500 text-gray-900 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:from-yellow-400 hover:to-yellow-600">
                    Book Appointment
                    <img src={assets.arrow_icon} alt="Arrow Icon" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
            </div>
    
            {/* ------ Right Side (Image) ------ */}
            <div className="w-full lg:w-1/2 flex justify-center relative">
                <img src={assets.header_img} alt="Header Image" className="w-full sm:max-w-[70%] md:max-w-[60%] lg:max-w-[90%] drop-shadow-2xl transform transition-all duration-500 hover:scale-105" />
            </div>
        </div>
    </div>
    );
}

export default Header
