import React from "react";
import { useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";

const Footer = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-gray-50 text-white overflow-hidden py-12 w-full mx-auto rounded-none shadow-lg">
      {/* Floating Background Elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>

      <div className="max-w-[1200px] mx-auto flex flex-row flex-wrap justify-around px-4 lg:px-12 gap-8 relative z-10">
        {/* Left Side */}
        <div className="flex flex-col items-center lg:items-start">
          <img src={assets.logo} alt="Logo" className="w-28 h-28 rounded-full mb-3" />
          <p className="text-gray-700 text-xs md:text-sm text-center lg:text-left max-w-xs lg:max-w-md">
            Your health journey starts here. We are committed to providing you with seamless access to the best doctors and healthcare services. Whether you're seeking advice, consultations, or a timely appointment, we are here to make your health our priority.
          </p>
        </div>

        {/* Center Side */}
        <div className="flex flex-col items-center lg:items-start">
          <p className="text-lg font-bold text-gray-800 mb-3">Company</p>
          <ul className="text-gray-600 space-y-1">
            <li className="hover:text-yellow-500 cursor-pointer" onClick={() => handleNavigation("/")}>Home</li>
            <li className="hover:text-yellow-500 cursor-pointer" onClick={() => handleNavigation("/about")}>About</li>
            <li className="hover:text-yellow-500 cursor-pointer" onClick={() => handleNavigation("/contact")}>Contact Us</li>
            <li className="hover:text-yellow-500 cursor-pointer" onClick={() => handleNavigation("/contact")}>Privacy Policy</li>
          </ul>
        </div>

        {/* Right Side */}
        <div className="flex flex-col items-center lg:items-start">
          <p className="text-lg font-bold text-gray-800 mb-3">Get in Touch</p>
          <ul className="text-gray-600 space-y-1">
            <li className="hover:text-yellow-500 cursor-pointer">+91-6353902577</li>
            <li className="hover:text-yellow-500 cursor-pointer">agrawalyash462@gmail.com</li>
          </ul>
        </div>
      </div>

      {/* Copyright Section */}
      <div className="text-center mt-8">
        <hr className="border-t border-gray-300 mb-3" />
        <p className="text-xs text-gray-600">Copyright 2025@ MediConnect - All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
