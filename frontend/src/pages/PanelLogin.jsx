import { useContext, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext.jsx';
import { AdminContext } from '../context/AdminContext.jsx';
import { DoctorContext } from '../context/DoctorContext.jsx';

const PanelLogin = () => {
  const [roleMode, setRoleMode] = useState('admin');
  const [email, setEmail] = useState('admin@mediconnect.com');
  const [password, setPassword] = useState('yash@994');

  const navigate = useNavigate();
  const { backendUrl, setToken } = useContext(AppContext);
  const { setAToken } = useContext(AdminContext);
  const { setDToken } = useContext(DoctorContext);

  const endpoint = useMemo(() => {
    return roleMode === 'admin' ? '/api/admin/login' : '/api/doctor/login';
  }, [roleMode]);

  const toggleRole = () => {
    if (roleMode === 'admin') {
      setRoleMode('doctor');
      setEmail('richard@mediconnect.com');
      setPassword('12345678');
      return;
    }

    setRoleMode('admin');
    setEmail('admin@mediconnect.com');
    setPassword('yash@994');
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      const { data } = await axios.post(`${backendUrl}${endpoint}`, { email, password });

      if (!data?.success || !data?.token) {
        toast.error(data?.message || 'Login failed');
        return;
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);

      if (roleMode === 'admin') {
        setAToken(data.token);
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      setDToken(data.token);
      navigate('/doctor/dashboard', { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-semibold text-slate-800">
          {roleMode === 'admin' ? 'Admin' : 'Doctor'} Login
        </h1>

        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          required
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-5 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          required
        />

        <button type="submit" className="w-full rounded-md bg-slate-800 py-2 font-medium text-white transition hover:bg-slate-900">
          Sign In
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          {roleMode === 'admin' ? 'Doctor' : 'Admin'} login?
          <button type="button" onClick={toggleRole} className="ml-1 cursor-pointer text-slate-900 underline">
            Switch
          </button>
        </p>
      </form>
    </div>
  );
};

export default PanelLogin;
