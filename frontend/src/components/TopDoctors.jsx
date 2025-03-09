import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { motion } from "framer-motion";

const TopDoctors = () => {
  const navigate = useNavigate();
  const { doctors } = useContext(AppContext);

  return (
    <motion.div
      className="py-12 px-6 gap-4 bg-gray-50"
      initial={{ opacity: 0, y: 50 }} // Fade in + slide-up
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center text-gray-900 mb-6">
        Top Doctors To Book
      </h1>
      <p className="text-lg text-center text-gray-600 mb-8">Some of our best doctors</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {doctors.slice(0, 10).map((item, index) => (
          <motion.div
            key={index}
            onClick={() => navigate(`/appointment/${item._id}`)}
            className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer max-w-xs mx-auto"
            whileHover={{ scale: 1.05, boxShadow: "0px 10px 20px rgba(0,0,0,0.15)" }} // Smooth hover effect
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="w-full h-48 bg-gray-100 flex justify-center items-center">
              <motion.img
                src={item.image}
                alt=""
                className="w-full h-full object-cover object-center rounded-t-2xl"
                whileHover={{ scale: 1.1 }} // Slight zoom on hover
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-3">
                <div
                  className={`w-1.5 h-1.5 rounded-full mr-2 ${item.available ? "bg-green-500" : "bg-red-500"
                    }`}
                ></div>
                <p
                  className={`text-sm font-semibold ${item.available ? "text-green-500" : "text-red-500"
                    }`}
                >
                  {item.available ? "Available" : "Not Available"}
                </p>
              </div>

              <p className="text-xl font-semibold text-gray-900 truncate">{item.name}</p>
              <p className="text-sm text-gray-600 mt-1">{item.speciality}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={() => {
          navigate("/doctors");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="bg-yellow-500 text-gray-900 px-12 py-3 rounded-full mt-10 mx-auto block hover:bg-yellow-600 transition-all duration-300 cursor-pointer"
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      >
        More
      </motion.button>
    </motion.div>
  );
};

export default TopDoctors;
