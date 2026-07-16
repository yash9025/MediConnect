
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

        // Only attempt token refresh on 401s from protected endpoints
        const isAuthEndpoint = originalRequest.url.includes('/api/auth/refresh-token') ||
            originalRequest.url.includes('/api/user/login') ||
            originalRequest.url.includes('/api/doctor/login') ||
            originalRequest.url.includes('/api/admin/login') ||
            originalRequest.url.includes('/api/user/register');

        if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;
            try {
                // Try to silently refresh the access token
                await axios.post(backendUrl + '/api/auth/refresh-token', {}, { withCredentials: true });
                // Retry the original request with the new cookie
                return axios(originalRequest);
            } catch (refreshError) {
                // Refresh token also expired or invalid: force logout
                localStorage.removeItem('role');
                // Dispatch event so React contexts can update their state
                window.dispatchEvent(new Event('auth:logout'));
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
