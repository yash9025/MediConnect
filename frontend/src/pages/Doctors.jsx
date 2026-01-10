import { useContext, useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

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
    const isOpening = selectedDoctor?._id !== doctor._id;
    setSelectedDoctor(isOpening ? doctor : null);

    if (isOpening) {
      // Scroll to specific card after expansion
      setTimeout(() => {
        const node = cardRefs.current.get(doctor._id);
        node?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
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
              const isSelected = selectedDoctor?._id === doctor._id;

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
                      {isSelected ? "Read Less" : "Read More"}
                    </button>
                  </div>

                  {/* Collapsible Details Section */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      isSelected ? "max-h-screen" : "max-h-0"
                    }`}
                  >
                    <div className="bg-gray-50 p-4 rounded-lg mt-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        About {doctor.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        {doctor.about}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        Fees: ${doctor.fees}
                      </p>
                      <p className="text-sm text-gray-600">
                        Location: {doctor.address.line1}, {doctor.address.line2}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Doctors;
