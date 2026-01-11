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

    try {
      if (state == 'Sign Up') {
        const { data } = await axios.post(backendUrl + '/api/user/register', { name, password, email });
        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
        } else {
          toast.error(data.message);
        }
      } else {
        const { data } = await axios.post(backendUrl + '/api/user/login', { password, email });
        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token])

  return (
    <form className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-lg mt-8 mb-8" onSubmit={onSubmitHandler}>
      <div className="flex flex-col items-center space-y-4">
        {/* Heading */}
        <h2 className="text-2xl font-semibold text-gray-800">
          {state === 'Sign Up' ? 'Create Account' : 'Login'}
        </h2>
        <p className="text-gray-600 text-sm text-center">
          Please {state === 'Sign Up' ? 'create an account' : 'login'} to book an appointment
        </p>

        {/* Full Name Field */}
        {state === 'Sign Up' && (
          <div className="w-full">
            <p className="text-gray-700 font-medium">Full Name</p>
            <input
              type="text"
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
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
            required
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
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="cursor-pointer w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition font-medium"
        >
          {state === 'Sign Up' ? 'Create Account' : 'Login'}
        </button>

        {/* Conditional Link */}
        {state === 'Sign Up' ? (
          <p className="text-gray-600 text-sm mt-2">
            Already have an account?{' '}
            <span
              className="text-blue-600 cursor-pointer hover:underline font-medium"
              onClick={() => setState('Login')}
            >
              Login
            </span>
          </p>
        ) : (
          <p className="text-gray-600 text-sm mt-2">
            Don't have an account?{' '}
            <span
              className="text-blue-600 cursor-pointer hover:underline font-medium"
              onClick={() => setState('Sign Up')}
            >
              Create a new account
            </span>
          </p>
        )}

        {/* --- TEST CREDENTIALS BOX --- */}
        <div className="w-full mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Patient Test Account</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-700 font-medium flex justify-between">
              <span>Email:</span> 
              <span className="text-blue-700">agrawal6353@gmail.com</span>
            </p>
            <p className="text-sm text-gray-700 font-medium flex justify-between">
              <span>Password:</span> 
              <span className="text-blue-700">12345678</span>
            </p>
          </div>
        </div>

      </div>
    </form>
  );
};

export default Login;