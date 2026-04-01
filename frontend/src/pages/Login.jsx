import  { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { AdminContext } from '../context/AdminContext';
import { DoctorContext } from '../context/DoctorContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';

const decodeJwtPayload = (token) => {
  try {
    const payloadPart = token?.split('.')?.[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

const roleHomeMap = {
  admin: '/admin/dashboard',
  doctor: '/doctor/dashboard',
  patient: '/'
};

const Login = () => {

  const { backendUrl, token, setToken } = useContext(AppContext);
  const { setAToken } = useContext(AdminContext);
  const { setDToken } = useContext(DoctorContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false); 
  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (state === 'Sign Up') {
        const { data } = await axios.post(backendUrl + '/api/user/register', { name, password, email });
        if (!data.success || !data.token) {
          toast.error(data.message);
          return;
        }

        const role = decodeJwtPayload(data.token)?.role;
        if (!role) {
          toast.error('Invalid authentication token.');
          return;
        }

        localStorage.setItem('token', data.token);
        setToken(data.token);
        setAToken(role === 'admin' ? data.token : '');
        setDToken(role === 'doctor' ? data.token : '');
        toast.success('Account created successfully!');
        navigate(roleHomeMap[role] || '/', { replace: true });
        return;
      }

      const loginEndpoints = [
        '/api/user/login',
        '/api/doctor/login',
        '/api/admin/login'
      ];

      let authToken = '';
      for (const endpoint of loginEndpoints) {
        try {
          const { data } = await axios.post(`${backendUrl}${endpoint}`, { password, email });
          if (data?.success && data?.token) {
            authToken = data.token;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!authToken) {
        toast.error('Invalid credentials');
        return;
      }

      const role = decodeJwtPayload(authToken)?.role;
      if (!role) {
        toast.error('Invalid authentication token.');
        return;
      }

      localStorage.setItem('token', authToken);
      setToken(authToken);
      setAToken(role === 'admin' ? authToken : '');
      setDToken(role === 'doctor' ? authToken : '');
      toast.success('Logged in successfully!');
      navigate(roleHomeMap[role] || '/', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setState(location.pathname === '/signup' ? 'Sign Up' : 'Login');
  }, [location.pathname]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    if (!token || !storedToken) return;

    const role = decodeJwtPayload(token)?.role;
    navigate(roleHomeMap[role] || '/', { replace: true });
  }, [token, navigate]);

  return (
    <form className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-lg mt-8 mb-8" onSubmit={onSubmitHandler}>
      <div className="flex flex-col items-center space-y-4">
        
        <h2 className="text-2xl font-semibold text-gray-800">
          {state === 'Sign Up' ? 'Create Account' : 'Login'}
        </h2>
        <p className="text-gray-600 text-sm text-center">
          Please {state === 'Sign Up' ? 'create an account' : 'login'} to continue
        </p>

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

        <div className="w-full">
          <p className="text-gray-700 font-medium">Password</p>
          <input
            type="password"
            className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`cursor-pointer w-full text-white py-2 rounded-lg font-medium transition ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {loading ? 'Processing...' : (state === 'Sign Up' ? 'Create Account' : 'Login')}
        </button>

        {state === 'Sign Up' ? (
          <p className="text-gray-600 text-sm mt-2">
            Already have an account?{' '}
            <span
              className="text-blue-600 cursor-pointer hover:underline font-medium"
              onClick={() => navigate('/login')}
            >
              Login
            </span>
          </p>
        ) : (
          <p className="text-gray-600 text-sm mt-2">
            Don&#39;t have an account?{' '}
            <span
              className="text-blue-600 cursor-pointer hover:underline font-medium"
              onClick={() => navigate('/signup')}
            >
              Create a new account
            </span>
          </p>
        )}

        <div className="w-full mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">Test Credentials</p>

          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-semibold text-blue-900">Patient</p>
              <p>Email - agrawal6353@gmail.com</p>
              <p>Pass - 12345678</p>
            </div>

            <div>
              <p className="font-semibold text-blue-900">Doctor</p>
              <p>Email - richard@mediconnect.com</p>
              <p>Pass - 12345678</p>
            </div>

            <div>
              <p className="font-semibold text-blue-900">Admin</p>
              <p>Email - admin@mediconnect.com</p>
              <p>Pass - 12345678</p>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
};

export default Login;