import { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { assets } from '../assets/assets.js';
import axios from 'axios';
import { toast } from 'react-toastify';
import { MedicalChatBot } from '../features/rag';

const MyProfile = () => {
  const { userData, setUserData, backendUrl, loadUserProfileData } = useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [image, setImage] = useState(false);

  const updateUserProfileData = async () => {
    try {
      const formData = new FormData();

      formData.append('name', userData.name);
      formData.append('phone', userData.phone);
      formData.append('address', JSON.stringify(userData.address));
      formData.append('dob', userData.dob);
      
      // Ensure gender has a valid value; default to Male if not selected
      formData.append('gender', userData.gender === 'Not Selected' ? 'Male' : userData.gender);

      // Append userId safely for the backend to recognize the user
      if (userData._id) {
        formData.append('userId', userData._id);
      }

      image && formData.append('image', image);

      const { data } = await axios.post(backendUrl + '/api/user/update-profile', formData);

      if (data.success) {
        toast.success(data.message || "Profile Updated");
        await loadUserProfileData();
        setIsEdit(false);
        setImage(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  return userData && (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg mt-8 mb-8">
      
      {/* Profile Image Section */}
      {isEdit ? (
        <div className="flex flex-col items-center gap-4">
          <label htmlFor="image" className="cursor-pointer relative">
            <div className="relative w-32 h-32">
              <img
                src={image ? URL.createObjectURL(image) : userData.image}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
              />
              {!image && (
                <img
                  src={assets.upload_icon}
                  alt="Upload"
                  className="absolute inset-0 m-auto w-10 h-10 opacity-70"
                />
              )}
            </div>
          </label>
          <input
            onChange={(e) => setImage(e.target.files[0])}
            type="file"
            id="image"
            hidden
          />
        </div>
      ) : (
        <div className="flex justify-center mb-8">
          <img
            src={userData.image}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
          />
        </div>
      )}

      {/* Name Section */}
      <div className="text-center mb-8">
        {isEdit ? (
          <input
            type="text"
            value={userData.name}
            onChange={(e) => setUserData((prev) => ({ ...prev, name: e.target.value }))}
            className="w-64 p-2 text-lg border-b-2 border-blue-500 focus:outline-none focus:border-blue-700"
          />
        ) : (
          <p className="text-3xl font-semibold">{userData.name}</p>
        )}
      </div>

      <hr className="border-gray-300 mb-8" />

      {/* Contact Information */}
      <div className="space-y-4 mb-8">
        <p className="text-xl font-semibold">Contact Information</p>
        <div className="space-y-2">
          <div className="flex items-center">
            <p className="font-medium w-28">Email:</p>
            <p>{userData.email}</p>
          </div>

          <div className="flex items-center">
            <p className="font-medium w-28">Phone:</p>
            {isEdit ? (
              <input
                type="text"
                value={userData.phone}
                onChange={(e) => setUserData((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p>{userData.phone}</p>
            )}
          </div>

          <div className="flex items-center">
            <p className="font-medium w-28">Address:</p>
            {isEdit ? (
              <div>
                <input
                  type="text"
                  value={userData.address.line1}
                  onChange={(e) => setUserData((prev) => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                  className="w-full p-2 mb-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={userData.address.line2}
                  onChange={(e) => setUserData((prev) => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <p>
                {userData.address.line1}
                <br />
                {userData.address.line2}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4 mb-8">
        <p className="text-xl font-semibold">Basic Information</p>
        <div className="space-y-2">
          <div className="flex items-center">
            <p className="font-medium w-28">Gender:</p>
            {isEdit ? (
              <select
                value={userData.gender === 'Not Selected' ? 'Male' : userData.gender}
                onChange={(e) => setUserData((prev) => ({ ...prev, gender: e.target.value }))}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            ) : (
              <p>{userData.gender}</p>
            )}
          </div>

          <div className="flex items-center">
            <p className="font-medium w-28">Birthday:</p>
            {isEdit ? (
              <input
                type="date"
                value={userData.dob}
                onChange={(e) => setUserData((prev) => ({ ...prev, dob: e.target.value }))}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p>{userData.dob}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center">
        {isEdit ? (
          <button
            onClick={async () => {
              await updateUserProfileData();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="cursor-pointer px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-300"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => {
              setIsEdit(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="cursor-pointer px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-300"
          >
            Edit
          </button>
        )}
      </div>

      {/* DPDP Right to Erasure Section */}
      <div className="mt-12 mb-8 border border-red-200 bg-red-50/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-red-900 flex items-center gap-2">
              <span>🛡️</span> DPDP Right to Erasure & Consent Revocation
            </h4>
            <p className="text-xs text-red-700 mt-1 max-w-xl leading-relaxed font-medium">
              Under India's DPDP Act 2023, you can withdraw your consent at any time. Clicking below will purge your blood reports, biomarker embeddings, and AI chat logs (statutory doctor consultation prescriptions are securely archived under NMC 3-year medical record guidelines).
            </p>
          </div>
          <button
            onClick={async () => {
              if (window.confirm("Are you sure you want to revoke consent and permanently erase your health data?")) {
                try {
                  const { data } = await axios.delete(`${backendUrl}/api/privacy/erasure`, { withCredentials: true });
                  if (data.success) {
                    toast.success(data.message);
                  } else {
                    toast.error(data.message);
                  }
                } catch (err) {
                  toast.error("Erasure request failed.");
                }
              }
            }}
            className="shrink-0 cursor-pointer px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-sm transition"
          >
            Revoke Consent & Delete My Data
          </button>
        </div>
      </div>

      <MedicalChatBot />
    </div>
  );
};

export default MyProfile;