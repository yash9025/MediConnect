import { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const RelatedDoctors = ({ speciality, docId }) => {
    const { doctors } = useContext(AppContext);
    const navigate = useNavigate();
    const [relDoc, setRelDoc] = useState([]);

    useEffect(() => {
        if (doctors.length > 0) {
            const relatedDoctors = doctors.filter(doc => doc.speciality === speciality && doc._id !== docId);
            setRelDoc(relatedDoctors);
        }
    }, [doctors, speciality, docId]);

    return (
        <div className="py-12 px-6 gap-4 bg-gray-50">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-center text-gray-900 mb-4 tracking-normal leading-snug">
                Related Doctors
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                {relDoc.slice(0, 5).map((item, index) => (
                    <div onClick={() => { navigate(`/appointment/${item._id}`); scrollTo(0, 0); }} key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl w-full sm:w-[180px] md:w-[220px] lg:w-[250px] mx-auto cursor-pointer">
                        <div className="w-full h-40 sm:h-44 md:h-48 bg-gray-100 flex justify-center items-center overflow-hidden rounded-t-2xl">
                            <img
                                src={item.image}
                                alt="Doctor"
                                className="w-full h-full object-cover object-top transition-transform duration-300 ease-in-out transform hover:scale-110"
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
                    </div>
                ))}
            </div>
        </div>
    );
}
RelatedDoctors.propTypes = {
    speciality: PropTypes.string.isRequired,
    docId: PropTypes.string.isRequired,
};

export default RelatedDoctors;
