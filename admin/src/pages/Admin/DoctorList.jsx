import React, { useContext, useEffect } from 'react';
import { AdminContext } from '../../context/AdminContext';

const DoctorList = () => {
  const { doctors, aToken, getAllDoctors, changeAvailability } = useContext(AdminContext);

  useEffect(() => {
    if (aToken) {
      getAllDoctors();
    }
  }, [aToken]);

  return (
    <div className="md:ml-[250px] ml-15 w-[calc(100%-16rem)] pt-24 pb-12 px-4 sm:px-8 lg:px-16 bg-gray-50 min-h-screen">
      <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-10 
              bg-gradient-to-r from-blue-500 to-green-500 text-transparent bg-clip-text">
        All Doctors
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {doctors.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform transition duration-300 hover:scale-105 hover:shadow-2xl w-full max-w-sm mx-auto"
          >
            <img
              src={item.image}
              alt=''
              className="w-full h-48 object-cover object-center rounded-t-2xl"
            />
            <div className="p-4 text-center">
              <p className="text-xl font-semibold text-gray-900 truncate">{item.name}</p>
              <p className="text-sm text-gray-600 mt-1">{item.speciality}</p>

              <div className="flex items-center justify-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={item.available}
                  onChange={() => changeAvailability(item._id)}
                  className="w-5 h-5 cursor-pointer accent-blue-500"
                />
                <p className={`text-sm font-semibold ${item.available ? "text-green-500" : "text-red-500"}`}>
                  {item.available ? "Available" : "Not Available"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorList;
