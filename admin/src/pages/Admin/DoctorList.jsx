import  { useContext, useEffect, useState } from 'react';
import { AdminContext } from '../../context/AdminContext';
import { assets } from '../../assets/assets'; 

const DoctorList = () => {
  const { doctors, aToken, getAllDoctors, changeAvailability } = useContext(AdminContext);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (aToken) {
      getAllDoctors();
    }
  }, [aToken]);

  const filteredDoctors = doctors.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="md:ml-[250px] ml-16 pt-24 pb-12 px-4 sm:px-8 bg-gray-50 min-h-screen transition-all duration-300">
      
      <h1 className="text-3xl md:text-5xl font-extrabold text-center mb-8 
              bg-gradient-to-r from-blue-500 to-green-500 text-transparent bg-clip-text">
        All Doctors
      </h1>

      {/* Search Bar */}
      <div className="max-w-lg mx-auto mb-10 relative">
        <input 
            type="text" 
            placeholder="Search doctor by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 bg-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform transition duration-300 hover:scale-105 hover:shadow-2xl w-full"
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
          ))
        ) : (
            <div className="col-span-full text-center text-gray-500 mt-10 text-lg">
                No doctors found matching &quot;{searchTerm}&quot;
            </div>
        )}
      </div>
    </div>
  );
};

export default DoctorList;