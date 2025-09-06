import { createContext, useEffect, useState } from "react";
import axios from 'axios';
import { toast } from 'react-toastify';

export const AppContext = createContext(null);

const AppContextProvider = (props) => {
    const currencySymbol = '$';
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    const [doctors, setDoctors] = useState([]);
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [userData, setUserData] = useState(null);

    const getDoctorData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/list');
            if (data.success) {
                console.log("Fetched Doctors Data:", data.doctors);
                setDoctors(data.doctors);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch doctors.");
        }
    };

    const loadUserProfileData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/user/get-profile', { headers: { token } });
            if (data.success) {
                setUserData(data.userData);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch user data.");
        }
    };

    // 🔹 New Logout Function
    const logout = () => {
        localStorage.removeItem('token');
        setToken(''); // This ensures React detects the change
        setUserData(null); //  Clears user data
    };

    useEffect(() => {
        getDoctorData();
    }, []);

    useEffect(() => {
        if (token) {
            loadUserProfileData();
        } else {
            setUserData(null);
        }
    }, [token]);

    return (
        <AppContext.Provider value={{
            doctors, getDoctorData,
            currencySymbol,
            token, setToken, logout, // 
            backendUrl,
            userData, setUserData,
            loadUserProfileData
        }}>
            {props.children}
        </AppContext.Provider>
    );
};

export default AppContextProvider;
