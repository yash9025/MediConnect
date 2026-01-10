import React, { useContext, useState } from 'react';
import { assets } from '../../assets/assets';
import { AdminContext } from '../../context/AdminContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const AddDoctor = () => {
    // Creating state variables to store the input coming from the form
    const [docImg, setDocImg] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [experience, setExperience] = useState('1 Year');
    const [fees, setFees] = useState('');
    const [about, setAbout] = useState('');
    const [speciality, setSpeciality] = useState('General physician');
    const [degree, setDegree] = useState('');
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');

    const { backendUrl, aToken } = useContext(AdminContext);

    const onSubmitHandler = async (event) => {
        event.preventDefault();

        try {
            // Check if image is selected
            if (!docImg) {
                return toast.error('Image Not Selected');
            }

            // Collecting all the form data in a variable formData and will send this data to backend
            const formData = new FormData();
            formData.append('image', docImg);
            formData.append('name', name);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('experience', experience);
            formData.append('fees', Number(fees));
            formData.append('about', about);
            formData.append('speciality', speciality);
            formData.append('degree', degree);
            formData.append('address', JSON.stringify({ line1: address1, line2: address2 }));

            // Console log formData
            console.log('FormData Entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            // Sending data to backend with authentication token
            const { data } = await axios.post(backendUrl + '/api/admin/add-doctor', formData, {
                headers: { atoken: aToken } // Ensure this matches backend expectations
            });
            
               

            // Handling response messages
            if (data.success) {
                toast.success(data.message);
                //reset the field after adding doctor succesfullly
                setDocImg(false);
                setName('');
                setPassword('');
                setEmail('');
                setAddress1('');
                setAddress2('');
                setDegree('');
                setAbout('');
                setFees('');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
            console.log(error);
            
        }
    };

    return (
        <div className="md:ml-[250px] ml-15 pt-24 p-8 min-h-screen bg-green-100 flex justify-center items-center">
            <form onSubmit={onSubmitHandler} className="bg-white p-10 rounded-lg shadow-lg w-full max-w-4xl">
                <h2 className="text-3xl font-semibold mb-6 text-gray-800">Add Doctor</h2>

                {/* Upload Doctor Image */}
                <div className="flex flex-col items-center mb-6">
                    <label htmlFor="doc-image" className="cursor-pointer">
                        <img src={docImg ? URL.createObjectURL(docImg) : assets.upload_area} alt="" className="w-28 h-28 object-cover border-2 border-gray-300 rounded-full" /> {/* used URL.crateobject to preview the image which we have uploaded */}
                    </label>
                    <input onChange={(e) => setDocImg(e.target.files[0])} type="file" id="doc-image" hidden />  {/* used onchange as the image will be stored in setdocimg when we upload it*/}
                    <p className="text-gray-600 mt-2 text-sm">Upload doctor picture</p>
                </div>

                {/* Form Fields - Two Column Layout */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-700">Doctor Name</label>
                        <input onChange={(e) => setName(e.target.value)} value={name} type="text" placeholder="Name" className="w-full p-3 border border-gray-300 rounded-md mt-1" />
                    </div>
                    <div>
                        <label className="block text-gray-700">Speciality</label>
                        <select onChange={(e) => setSpeciality(e.target.value)} value={speciality} className="w-full p-3 border border-gray-300 rounded-md mt-1 cursor-pointer">
                            <option>General physician</option>
                            <option>Dermatologist</option>
                            <option>Gynecologist</option>
                            <option>Pediatricians</option>
                            <option>Neurologist</option>
                            <option>Hematologist</option>
                            <option>Endocrinologist</option>
                            <option>Cardiologist</option>
                            <option>Gastroenterologist</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700">Doctor Email</label>
                        <input onChange={(e) => setEmail(e.target.value)} value={email} type="email" placeholder="Your email" className="w-full p-3 border border-gray-300 rounded-md mt-1" />
                    </div>
                    <div>
                        <label className="block text-gray-700">Education</label>
                        <input onChange={(e) => setDegree(e.target.value)} value={degree} type="text" placeholder="Education" className="w-full p-3 border border-gray-300 rounded-md mt-1" />
                    </div>

                    <div>
                        <label className="block text-gray-700">Doctor Password</label>
                        <input onChange={(e) => setPassword(e.target.value)} value={password} type="password" placeholder="Password" className="w-full p-3 border border-gray-300 rounded-md mt-1" />
                    </div>
                    <div>
                        <label className="block text-gray-700">Address</label>
                        <input onChange={(e) => setAddress1(e.target.value)} value={address1} type="text" placeholder="Address 1" className="w-full p-3 border border-gray-300 rounded-md mt-1" />
                        <input onChange={(e) => setAddress2(e.target.value)} value={address2} type="text" placeholder="Address 2" className="w-full p-3 border border-gray-300 rounded-md mt-2" />
                    </div>

                    <div>
                        <label className="block text-gray-700">Experience</label>
                        <select onChange={(e) => setExperience(e.target.value)} value={experience} className="w-full p-3 border border-gray-300 rounded-md mt-1 cursor-pointer">
                            <option>1 Year</option>
                            <option>2 Years</option>
                            <option>3 Years</option>
                            <option>4 Years</option>
                            <option>5+ Years</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700">Fees</label>
                        <input onChange={(e) => setFees(e.target.value)} value={fees} type="text" placeholder="Your fees" className="w-full p-3 border border-gray-300 rounded-md mt-1" />
                    </div>
                </div>

                {/* About Me */}
                <div className="mt-6">
                    <label className="block text-gray-700">About Me</label>
                    <textarea onChange={(e) => setAbout(e.target.value)} value={about} placeholder="Write about yourself" className="w-full p-3 border border-gray-300 rounded-md mt-1 h-28"></textarea>
                </div>

                {/* Submit Button */}
                <div className="mt-8 text-center">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md transition cursor-pointer">
                        Add Doctor
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddDoctor;
