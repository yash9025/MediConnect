import { useContext, useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { MedicalChatBot } from "../features/rag";

const Doctors = () => {
  const { speciality } = useParams();
  const { doctors } = useContext(AppContext);
  const navigate = useNavigate();

  const doctorsRef = useRef(null);
  const cardRefs = useRef(new Map()); // Store refs for individual cards

  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Filter doctors based on URL parameter
  const filteredDoctors = speciality
    ? doctors.filter(
        (doc) => doc.speciality.toLowerCase() === speciality.toLowerCase()
      )
    : doctors;

  // Scroll to top of list when speciality changes
  useEffect(() => {
    if (speciality) {
      doctorsRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [speciality]);

  const handleSpecialityClick = (spec) => {
    if (speciality === spec) {
      navigate("/doctors");
    } else {
      navigate(`/doctors/${spec}`);
    }
  };

  const handleReadMoreClick = (doctor) => {
    setSelectedDoctor(doctor);
  };

  return (
    <div className="container mx-auto p-4 flex flex-col md:flex-row gap-6">
      {/* Left Sidebar */}
      {/* Left Sidebar */}
      <div className="w-full md:w-1/4 bg-gray-200 p-6 rounded-lg shadow-lg md:sticky md:top-20 h-fit text-center md:text-left md:self-start">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Specialities
        </h2>
        <ul className="space-y-4">
          {[
            "General physician",
            "Gynecologist",
            "Dermatologist",
            "Pediatricians",
            "Neurologist",
            "Gastroenterologist", // Added
            "Endocrinologist", // Added
            "Hematologist", // Added
            "Cardiologist", // Added
            "All",
          ].map((spec) => (
            <li
              key={spec}
              className={`cursor-pointer text-lg ${
                speciality?.toLowerCase() === spec.toLowerCase() ||
                (!speciality && spec === "All")
                  ? "text-blue-600 font-semibold"
                  : "text-gray-700"
              } hover:text-blue-500 transition-all text-center md:text-left`}
              onClick={() => handleSpecialityClick(spec === "All" ? "" : spec)}
            >
              {spec}
            </li>
          ))}
        </ul>
      </div>

      {/* Doctor Cards Area */}
      <div className="w-full md:w-3/4 mt-6 md:mt-0" ref={doctorsRef}>
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Browse Doctors by Speciality
        </h1>

        {speciality && (
          <h2 className="text-2xl font-semibold text-center mb-6 text-gray-600">
            Speciality: {speciality}
          </h2>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredDoctors.length === 0 ? (
            <p className="text-center text-gray-600 col-span-full">
              No doctors found for this speciality.
            </p>
          ) : (
            filteredDoctors.map((doctor) => {
              return (
                <div
                  key={doctor._id}
                  // Assign node to Map ref
                  ref={(node) => {
                    node
                      ? cardRefs.current.set(doctor._id, node)
                      : cardRefs.current.delete(doctor._id);
                  }}
                  className="doctor-card bg-white p-6 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex flex-col"
                >
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {doctor.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {doctor.speciality}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Experience: {doctor.experience}
                  </p>

                  <div className="doctor-buttons mb-4 flex flex-col gap-3 mt-auto">
                    <button
                      onClick={() =>
                        doctor.available &&
                        navigate(`/appointment/${doctor._id}`)
                      }
                      disabled={!doctor.available}
                      className={`px-6 py-2 rounded-full text-sm transition-all duration-200 ${
                        doctor.available
                          ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                          : "bg-red-500 text-white cursor-not-allowed"
                      }`}
                    >
                      {doctor.available ? "Book Now" : "Not Available"}
                    </button>

                    <button
                      className="readmore-btn bg-gray-200 text-gray-700 px-6 py-2 rounded-full text-sm hover:bg-gray-300 transition-all duration-200 cursor-pointer"
                      onClick={() => handleReadMoreClick(doctor)}
                    >
                      Read More
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Doctor Details Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDoctor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative animate-[fadeIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedDoctor(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer p-1 rounded-full hover:bg-gray-100 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="flex items-center gap-4 mb-4 mt-2">
              <img src={selectedDoctor.image} alt={selectedDoctor.name} className="w-20 h-20 rounded-full object-cover shadow-sm bg-gray-50 border-2 border-blue-50" />
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedDoctor.name}</h3>
                <p className="text-blue-600 font-medium text-sm mt-0.5">{selectedDoctor.speciality}</p>
                <p className="text-xs text-gray-500 mt-1 font-semibold bg-gray-100 inline-block px-2 py-0.5 rounded-full">{selectedDoctor.experience}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-xl mt-6 border border-gray-100">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                About Doctor
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </h4>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {selectedDoctor.about}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-gray-200/60">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fee</p>
                  <p className="font-semibold text-gray-800">${selectedDoctor.fees}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                  <p className="font-semibold text-gray-800 truncate" title={`${selectedDoctor.address.line1}, ${selectedDoctor.address.line2}`}>
                    {selectedDoctor.address.line1}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedDoctor(null)}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Close
              </button>
              <button 
                disabled={!selectedDoctor.available}
                onClick={() => {
                  if (selectedDoctor.available) {
                    navigate(`/appointment/${selectedDoctor._id}`);
                  }
                }}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition shadow-sm ${selectedDoctor.available ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-blue-500/20 hover:shadow-md' : 'bg-red-500 text-white cursor-not-allowed opacity-90'}`}
              >
                {selectedDoctor.available ? 'Book Appointment' : 'Not Available'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MedicalChatBot/>
    </div>
  );
};

export default Doctors;
