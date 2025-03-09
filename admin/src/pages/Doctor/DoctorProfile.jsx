import React, { useContext, useEffect, useState } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const DoctorProfile = () => {
  const { dToken, profileData, getProfileData, setProfileData, backendUrl } = useContext(DoctorContext);
  const { currency } = useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [isAvailable, setIsAvailable] = useState(profileData?.available || false);

  const updateProfile = async () => {
    try {
      const updateData = {
        address: profileData.address,
        fees: profileData.fees,
        available: profileData.available
      };

      const { data } = await axios.post(backendUrl + '/api/doctor/update-profile', updateData, { headers: { dToken } });
      if (data.success) {
        toast.success(data.message);
        setIsEdit(false);
        getProfileData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
      console.log(error);
    }
  };

  useEffect(() => {
    if (dToken) {
      getProfileData();
    }
  }, [dToken]);

  useEffect(() => {
    if (profileData) {
      setIsAvailable(profileData.available);
    }
  }, [profileData]);

  return (
    profileData && (
      <div className="w-full max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg border border-gray-200 md:mt-[85px] mt-20 md:ml-[250px] ml-16 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Doctor Image */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-blue-500">
            <img src={profileData.image} alt={profileData.name} className="w-full h-full object-cover" />
          </div>

          {/* Doctor Info */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-semibold text-gray-800">{profileData.name}</h2>
            <p className="text-gray-600 mt-1">{profileData.degree} - {profileData.speciality}</p>
            <span className="inline-block mt-2 px-4 py-1 bg-blue-100 text-blue-600 text-sm rounded-full">
              {profileData.experience}
            </span>
          </div>
        </div>

        {/* About Section */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-700">About</h3>
          <p className="text-gray-600 mt-1">{profileData.about}</p>
        </div>

        {/* Appointment Fee */}
        <div className="mt-4 text-gray-800">
          <p className="text-lg font-medium">
            Appointment Fee: <span className="text-blue-600 font-semibold">{currency} {isEdit ? <input type="number" onChange={(e) => setProfileData(prev => ({ ...prev, fees: e.target.value }))} value={profileData.fees} className="border px-2 py-1" /> : profileData.fees}</span>
          </p>
        </div>

        {/* Address */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
          <h3 className="text-lg font-medium text-gray-700">Address:</h3>
          <p className="text-gray-600">
            {isEdit ? <input type="text" onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))} value={profileData.address.line1} className="border px-2 py-1" /> : profileData.address.line1}
            ,
            {isEdit ? <input type="text" onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))} value={profileData.address.line2} className="border px-2 py-1" /> : profileData.address.line2}
          </p>
        </div>

        {/* Availability */}
        <div className="mt-4 flex items-center gap-2">
          <input
            checked={isAvailable}
            onChange={() => isEdit && setProfileData(prev => ({ ...prev, available: !prev.available }))}
            type='checkbox'
            id='availability'
            className="w-5 h-5 cursor-pointer accent-blue-500"
          />
          <label
            htmlFor='availability'
            className={`text-gray-700 px-2 py-0.5 rounded text-sm ${isAvailable ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
          >
            {isAvailable ? 'Available' : 'Not Available'}
          </label>
        </div>

        {/* Edit Button */}
        {
          isEdit
            ? <div className="mt-6 text-center">
              <button onClick={updateProfile} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer">
                Save Profile
              </button>
            </div>
            : <div className="mt-6 text-center">
              <button onClick={() => setIsEdit(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer">
                Edit Profile
              </button>
            </div>
        }
      </div>
    )
  );
};

export default DoctorProfile;
