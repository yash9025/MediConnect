import React, { useState, useContext } from 'react';
import { AdminContext } from '../context/AdminContext';
import axios from 'axios'; //Axios is a popular JavaScript library used to make HTTP requests from the browser and Node.js. It is commonly used in web applications to fetch data from APIs, send data to servers, and handle HTTP operations in an easier and more readable way compared to the built-in fetch API.
import { toast } from 'react-toastify'; //React Toastify is a popular React library that helps display beautiful and customizable toast notifications in your app. 
import { DoctorContext } from '../context/DoctorContext';

const Login = () => {
    const [state, setState] = useState('Admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { setAToken, backendUrl } = useContext(AdminContext);
    const { setDToken} = useContext(DoctorContext);

   const onSubmitHandler = async (event) => {
    event.preventDefault();

    try {
        if (state === "Admin") {
            const { data } = await axios.post(backendUrl + "/api/admin/login", { email, password });

            if (data.success) {
                localStorage.setItem('aToken',data.token); //when reload the webpage then admin will be logged in using this localstorage token
                setAToken(data.token);
            } else {
                toast.error(data.message);
            }
        } else{

            const {data} = await axios.post(backendUrl  + '/api/doctor/login' , {email,password})
            if (data.success) {
                localStorage.setItem('dToken',data.token); //when reload the webpage then admin will be logged in using this localstorage token
                setDToken(data.token);
                console.log(data.token);
                
            } else {
                toast.error(data.message);
            }
        }
    } catch (error) {
        
    }
};


    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <form onSubmit={onSubmitHandler} className="bg-white p-6 rounded-lg shadow-lg w-80">
                <h2 className="text-2xl font-semibold text-center mb-4">
                    <span className="text-blue-600">{state}</span> Login
                </h2>

                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Email</label>
                    <input
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        type="email"
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Password</label>
                    <input
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        type="password"
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300 cursor-pointer"
                >
                    Login
                </button>

                <p className="mt-4 text-center text-gray-700">
                    {state === 'Admin' ? 'Doctor' : 'Admin'} Login?
                    <span
                        className="text-blue-600 cursor-pointer ml-1 hover:underline"
                        onClick={() => setState(state === 'Admin' ? 'Doctor' : 'Admin')}
                    >
                        Click here
                    </span>
                </p>
            </form>
        </div>
    );
};

export default Login;
