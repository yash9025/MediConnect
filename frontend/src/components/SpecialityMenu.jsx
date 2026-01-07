import { specialityData } from "../assets/assets";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const SpecialityMenu = () => {
  const handleNavigation = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <motion.div
      id="speciality"
      className="relative text-black py-16 w-full bg-gray-50"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.5 }}
    >
      {/* Floating Background Elements */}
      <div className="absolute top-0 left-0 w-20 h-20 bg-white opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-3xl"></div>

      <div className="flex flex-col lg:flex-row justify-between items-center px-8 md:px-16 lg:px-24 max-w-[1400px] mx-auto relative z-10">
        {/* Left Side */}
        <div className="w-full lg:w-1/2 text-center lg:text-left mb-8 lg:mb-0">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
            Explore Doctors by <span className="text-yellow-400">Speciality</span>
          </h1>
          <p className="text-base md:text-lg text-gray-700 max-w-lg mx-auto lg:mx-0 mt-2">
            Find trusted doctors in various specialities and book appointments easily.
          </p>
        </div>

        {/* Right Side (Speciality Items) */}
        <div className="w-full lg:w-1/2 grid grid-cols-2 gap-6 md:grid-cols-3 lg:gap-8">
          {specialityData.map((item, index) => (
            <Link
              key={index}
              to={`/doctors/${item.speciality}`}
              onClick={handleNavigation}
              className="relative bg-transparent text-gray-900 shadow-lg rounded-xl overflow-hidden transition-transform duration-300 transform hover:scale-105 hover:bg-gradient-to-br hover:from-yellow-300 hover:to-yellow-500 hover:shadow-md"
            >
              <div className="w-full h-28 flex flex-col items-center justify-center p-3">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex justify-center items-center mb-2 shadow-md">
                  <img
                    src={item.image}
                    alt={item.speciality}
                    className="w-18 h-18 object-cover rounded-full"
                  />
                </div>
                <p className="text-center text-sm font-semibold">{item.speciality}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SpecialityMenu;
