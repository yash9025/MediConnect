import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Login = () => {

  const { backendUrl, token, setToken } = useContext(AppContext);
  const navigate = useNavigate();

  const [state, setState] = useState('Sign Up');
  const [email, setEmail] = useState('');
  const [password, setpassword] = useState('');
  const [name, setName] = useState('');

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    // Handle form submission for either sign up or login

    try {

      if (state == 'Sign Up') {

        const { data } = await axios.post(backendUrl + '/api/user/register', { name, password, email });

        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
        }else {
          toast.error(data.message);
        }

      } else{

        const { data } = await axios.post(backendUrl + '/api/user/login', { password, email });

        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
        }else {
          toast.error(data.message);
        }

      }
      
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(()=>{
    if(token){
      navigate('/');
    }
  },[token])

  return (
    <form className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-lg mt-8 mb-8" onSubmit={onSubmitHandler}>
      <div className="flex flex-col items-center space-y-4">
        {/* Heading */}
        <h2 className="text-2xl font-semibold text-gray-800">
          {state === 'Sign Up' ? 'Create Account' : 'Login'}
        </h2>
        <p className="text-gray-600 text-sm">
          Please {state === 'Sign Up' ? 'create an account' : 'login'} to book an appointment
        </p>

        {/* Full Name Field */}
        {state === 'Sign Up' && (  //agar state Sign Up hga tabhi ye full name wala field dikhega
          <div className="w-full">
            <p className="text-gray-700 font-medium">Full Name</p>
            <input
              type="text"
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
        )}

        {/* Email Field */}
        <div className="w-full">
          <p className="text-gray-700 font-medium">Email</p>
          <input
            type="email"
            className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>

        {/* Password Field */}
        <div className="w-full">
          <p className="text-gray-700 font-medium">Password</p>
          <input
            type="password"
            className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setpassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="cursor-pointer w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition"
        >
          {state === 'Sign Up' ? 'Create Account' : 'Login'}
        </button>

        {/* Conditional Link below the button */}
        {state === 'Sign Up' ? (
          <p className="text-gray-600 text-sm mt-2">
            Already have an account?{' '}
            <span
              className="text-blue-600 cursor-pointer hover:underline"
              onClick={() => setState('Login')}
            >
              Login
            </span>
          </p>
        ) : (
          <p className="text-gray-600 text-sm mt-2">
            Don't have an account?{' '}
            <span
              className="text-blue-600 cursor-pointer hover:underline"
              onClick={() => setState('Sign Up')}
            >
              Create a new account
            </span>
          </p>
        )}
      </div>
    </form>
  );
};

export default Login;
