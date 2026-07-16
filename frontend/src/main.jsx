
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom' //BrowserRouter is a component from react-router-dom used to manage routing in a React application. It enables the use of the HTML5 history API to handle navigation and URL management. It allows the app to respond to URL changes and renders different components based on the route.
import AppContextProvider from './context/AppContext.jsx'
import AdminContextProvider from './context/AdminContext.jsx'
import DoctorContextProvider from './context/DoctorContext.jsx'
import axios from 'axios';

axios.defaults.withCredentials = true;

axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        
        if (error.response && error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/api/auth/refresh-token') && !originalRequest.url.includes('/api/user/login') && !originalRequest.url.includes('/api/doctor/login') && !originalRequest.url.includes('/api/admin/login')) {
            originalRequest._retry = true;
            try {
                await axios.post(backendUrl + '/api/auth/refresh-token', {}, { withCredentials: true });
                return axios(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('role');
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AdminContextProvider>
      <DoctorContextProvider>
        <AppContextProvider>
          <App />
        </AppContextProvider>
      </DoctorContextProvider>
    </AdminContextProvider>
  </BrowserRouter>
)
