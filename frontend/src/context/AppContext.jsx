import { createContext, useEffect, useState } from "react";
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';

export const AppContext = createContext(null);

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

const AppContextProvider = (props) => {
    const currencySymbol = '$';
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    const [doctors, setDoctors] = useState([]);
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [userData, setUserData] = useState(null);

    const role = decodeJwtPayload(token)?.role || null;

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
        if (!token) {
            setUserData(null);
            return;
        }

        if (role !== 'patient') {
            setUserData(null);
            return;
        }

        try {
            const { data } = await axios.get(backendUrl + '/api/user/get-profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
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
    }, [token, role]);

    return (
        <AppContext.Provider value={{
            doctors, getDoctorData,
            currencySymbol,
            currency: currencySymbol,
            token, setToken, logout, // 
            backendUrl,
            userData, setUserData,
            loadUserProfileData,
            role,
            calculateAge: (dob) => {
                const today = new Date();
                const birthDate = new Date(dob);
                return today.getFullYear() - birthDate.getFullYear();
            },
            slotDateFormat: (slotDate) => {
                const months = [' ', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const dateArray = slotDate.split('_');
                return `${dateArray[0]} ${months[Number(dateArray[1])]} ${dateArray[2]}`;
            }
        }}>
            {props.children}
        </AppContext.Provider>
    );
};

AppContextProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export default AppContextProvider;
