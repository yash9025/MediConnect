import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { assets } from '../assets/assets.js'
import axios from 'axios';
import { toast } from 'react-toastify';

const MyProfile = () => {

  const { userData, setUserData, token, backendUrl, loadUserProfileData } = useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [image, setImage] = useState(false);

  const updateUserProfileData = async () => {

    try {

      const formData = new FormData();

      formData.append('name', userData.name);
      formData.append('phone', userData.phone);
      formData.append('address', JSON.stringify(userData.address));
      formData.append('gender', userData.gender);
      formData.append('dob', userData.dob);

      image && formData.append('image', image);

      const { data } = await axios.post(backendUrl + '/api/user/update-profile', formData, { headers: { token } });

      if (data.success) {
        toast.success(data.success );
        await loadUserProfileData();
        setIsEdit(false);
        setImage(false);
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);

    }
  }

  return userData && (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg mt-8 mb-8">

      {
        isEdit ? (
          <div className="flex flex-col items-center gap-4">
            <label htmlFor="image" className="cursor-pointer relative">
              <div className="relative w-32 h-32">
                {/* Profile Image */}
                <img
                  src={image ? URL.createObjectURL(image) : userData.image}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                />

                {/* Upload Icon (Visible Only When No Image is Selected) */}
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
        )
      }


      {/* Profile Image */}


      {/* Name Section */}
      <div className="text-center mb-8">
        {
          isEdit
            ? <input
              type='text'
              value={userData.name}
              onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
              className="w-64 p-2 text-lg border-b-2 border-blue-500 focus:outline-none focus:border-blue-700"
            />
            : <p className="text-3xl font-semibold">{userData.name}</p>
        }
      </div>

      <hr className="border-gray-300 mb-8" />

      {/* Contact Information Section */}
      <div className="space-y-4 mb-8">
        <p className="text-xl font-semibold">Contact Information</p>
        <div className="space-y-2">
          <div className="flex items-center">
            <p className="font-medium w-28">Email:</p>
            <p>{userData.email}</p>
          </div>

          <div className="flex items-center">
            <p className="font-medium w-28">Phone:</p>
            {isEdit
              ? <input
                type='text'
                value={userData.phone}
                onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              : <p>{userData.phone}</p>
            }
          </div>

          <div className="flex items-center">
            <p className="font-medium w-28">Address:</p>
            {isEdit
              ? <div>
                <input
                  type='text'
                  value={userData.address.line1}
                  onChange={(e) => setUserData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                  className="w-full p-2 mb-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type='text'
                  value={userData.address.line2}
                  onChange={(e) => setUserData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              : <p>
                {userData.address.line1}
                <br />
                {userData.address.line2}
              </p>
            }
          </div>
        </div>
      </div>

      {/* Basic Information Section */}
      <div className="space-y-4 mb-8">
        <p className="text-xl font-semibold">Basic Information</p>
        <div className="space-y-2">
          <div className="flex items-center">
            <p className="font-medium w-28">Gender:</p>
            {isEdit
              ? <select
                value={userData.gender}
                onChange={(e) => setUserData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              : <p>{userData.gender}</p>
            }
          </div>

          <div className="flex items-center">
            <p className="font-medium w-28">Birthday:</p>
            {isEdit
              ? <input
                type='date'
                value={userData.dob}
                onChange={(e) => setUserData(prev => ({ ...prev, dob: e.target.value }))}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              : <p>{userData.dob}</p>
            }
          </div>
        </div>
      </div>

      {/* Edit/Save Button */}
      <div className="flex justify-center">
        {
          isEdit
            ? <button
              onClick={async () => {
                await updateUserProfileData();
                window.scrollTo({ top: 0, behavior: "smooth" }); // Scrolls to top smoothly
              }}
              className="cursor-pointer px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-300"
            >
              Save
            </button>

            : <button
              onClick={() => { setIsEdit(true); scrollTo(0, 0); }}
              className="cursor-pointer px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-300"
            >
              Edit
            </button>
        }
      </div>
    </div>
  );
}

export default MyProfile;
