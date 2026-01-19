import { useContext, useEffect, useState } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const DoctorProfile = () => {
  const { dToken, profileData, getProfileData, setProfileData, backendUrl } = useContext(DoctorContext);
  const { currency } = useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);

  // Update text fields (Address, Fees, About)
  const updateProfile = async () => {
    try {
      const updateData = {
        address: profileData.address,
        fees: profileData.fees,
        available: profileData.available,
        about: profileData.about // Included about in payload
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
    }
  };

  // Separate function for instant availability toggle
  const toggleAvailability = async () => {
    try {
      const newAvailability = !profileData.available;
      setProfileData(prev => ({ ...prev, available: newAvailability }));

      const updateData = {
        address: profileData.address,
        fees: profileData.fees,
        about: profileData.about,
        available: newAvailability
      };

      const { data } = await axios.post(backendUrl + '/api/doctor/update-profile', updateData, { headers: { dToken } });

      if (data.success) {
        toast.success(data.message);
      } else {
        setProfileData(prev => ({ ...prev, available: !newAvailability }));
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (dToken) {
      getProfileData();
    }
  }, [dToken]);

  return (
    profileData && (
      <div className="min-h-screen bg-[#F8F9FD] ml-16 md:ml-64 transition-all duration-300 pt-28 px-6 sm:px-12">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-10">

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-center gap-8 p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="relative">
              <img
                src={profileData.image}
                alt={profileData.name}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-white shadow-md bg-gray-100"
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">{profileData.name}</h1>
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                <p className="text-gray-600 font-medium text-lg">{profileData.degree} - {profileData.speciality}</p>
                <span className="hidden sm:block text-gray-300">|</span>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wide">
                  {profileData.experience} Experience
                </span>
              </div>

              {/* Availability Toggle */}
              <div className="mt-5 flex items-center justify-center sm:justify-start gap-4">
                <p className="font-semibold text-gray-600 text-sm uppercase tracking-wide">Status:</p>
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={profileData.available}
                    onChange={toggleAvailability}
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                  <span className={`ml-3 text-sm font-bold transition-colors ${profileData.available ? 'text-green-600' : 'text-red-500'}`}>
                    {profileData.available ? 'Available' : 'Unavailable'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="p-8 grid grid-cols-1 gap-8">

           {/* About Section */}
            <div>
              <h3 className="text-gray-800 font-bold text-lg mb-3 flex items-center gap-2">
                About Doctor
                <hr className="flex-1 border-gray-200 ml-2" />
              </h3>
              
              {/* UI/UX FIX: Container styles remain constant. 
                  Textarea is transparent to prevent layout shift ("card change"). */}
              <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-100 text-gray-700 leading-relaxed">
                {isEdit ? (
                  <textarea
                    className="w-full bg-transparent outline-none text-gray-700 resize-none overflow-hidden"
                    rows={4} // Set a fixed height or use auto-grow logic if needed
                    value={profileData.about}
                    onChange={(e) => setProfileData(prev => ({ ...prev, about: e.target.value }))}
                    placeholder="Write a brief bio..."
                  />
                ) : (
                  <p>{profileData.about}</p>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Fee Section */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-2">Consultation Fee</h3>
                <div className="flex items-center gap-2">
                  {isEdit ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-blue-600 font-bold">{currency}</span>
                      <input
                        type="number"
                        value={profileData.fees}
                        onChange={(e) => setProfileData(prev => ({ ...prev, fees: e.target.value }))}
                        className="border border-blue-300 bg-blue-50 rounded-lg px-3 py-1 w-32 text-2xl font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  ) : (
                    <span className="text-3xl font-extrabold text-blue-600">
                      {currency} {profileData.fees}
                    </span>
                  )}
                </div>
              </div>

              {/* Address Section */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-3">Clinic Address</h3>
                <div className="space-y-2">
                  {isEdit ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={profileData.address.line1}
                        onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                        className="border border-blue-300 bg-blue-50 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        placeholder="Address Line 1"
                      />
                      <input
                        type="text"
                        value={profileData.address.line2}
                        onChange={(e) => setProfileData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                        className="border border-blue-300 bg-blue-50 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        placeholder="Address Line 2"
                      />
                    </div>
                  ) : (
                    <div className="text-gray-700 font-medium text-lg">
                      <p>{profileData.address.line1}</p>
                      <p>{profileData.address.line2}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
            {isEdit ? (
              <button
                onClick={updateProfile}
                className="cursor-pointer px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
              >
                Save Changes
              </button>
            ) : (
              <button
                onClick={() => setIsEdit(true)}
                className="cursor-pointer px-8 py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-50 hover:shadow-md transition-all transform active:scale-95"
              >
                Edit Profile Details
              </button>
            )}
          </div>

        </div>
      </div>
    )
  );
};

export default DoctorProfile;