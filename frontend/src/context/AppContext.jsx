import { createContext, useEffect, useState } from "react";
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';

export const AppContext = createContext(null);

const AppContextProvider = (props) => {
    const currencySymbol = '$';
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    const [doctors, setDoctors] = useState([]);
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('role'));
    const [role, setRole] = useState(localStorage.getItem('role') || null);
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
        if (!isAuthenticated) {
            setUserData(null);
            return;
        }

        if (role !== 'patient') {
            setUserData(null);
            return;
        }

        try {
            const { data } = await axios.get(backendUrl + '/api/user/get-profile');
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
    const logout = async () => {
        try {
            await axios.post(backendUrl + '/api/user/logout');
        } catch (error) {
            console.error("Logout API failed", error);
        }
        localStorage.removeItem('role');
        setIsAuthenticated(false);
        setRole(null);
        setUserData(null);
    };

    useEffect(() => {
        getDoctorData();
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadUserProfileData();
        } else {
            setUserData(null);
        }
    }, [isAuthenticated, role]);

    return (
        <AppContext.Provider value={{
            doctors, getDoctorData,
            currencySymbol,
            currency: currencySymbol,
            isAuthenticated, setIsAuthenticated, logout, // 
            backendUrl,
            userData, setUserData,
            loadUserProfileData,
            role, setRole,
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
