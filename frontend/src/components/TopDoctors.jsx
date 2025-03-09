import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { motion } from "framer-motion";

const TopDoctors = () => {
  const navigate = useNavigate();
  const { doctors } = useContext(AppContext);

  return (
    <motion.div
      className="py-12 px-4 sm:px-6 bg-gray-50"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Title */}
      <h1 className="text-4xl md:text-5xl lg:text-5xl font-extrabold text-center text-gray-900 mb-4">
        Top Doctors To Book
      </h1>
      <p className="text-lg text-center text-gray-600 mb-6">Some of our best doctors</p>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
        {doctors.slice(0, 10).map((item, index) => (
          <motion.div
            key={index}
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll to top
              navigate(`/appointment/${item._id}`);
            }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer 
                       w-full sm:w-[180px] md:w-[220px] lg:w-[250px] mx-auto"
            whileHover={{ scale: 1.05, boxShadow: "0px 10px 20px rgba(0,0,0,0.15)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Doctor Image */}
            <div className="w-full h-40 sm:h-44 md:h-48 bg-gray-100 flex justify-center items-center">
              <motion.img
                src={item.image}
                alt=""
                className="w-full h-full object-cover rounded-t-2xl"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Doctor Info */}
            <div className="p-3 text-center">
              {/* Availability Status */}
              <div className="flex items-center justify-center mb-2">
                <div className={`w-2 h-2 rounded-full mr-2 ${item.available ? "bg-green-500" : "bg-red-500"}`}></div>
                <p className={`text-sm font-semibold ${item.available ? "text-green-600" : "text-red-500"}`}>
                  {item.available ? "Available" : "Not Available"}
                </p>
              </div>

              {/* Name & Specialty */}
              <p className="text-lg font-semibold text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-600">{item.speciality}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* More Button (Properly Centered) */}
      <motion.button
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          navigate("/doctors");
        }}
        className="bg-yellow-500 text-gray-900 px-10 py-3 rounded-full mt-8 mx-auto block text-md font-semibold 
                   shadow hover:bg-yellow-600 transition-all duration-300"
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        View More
      </motion.button>
    </motion.div>
  );
};

export default TopDoctors;
