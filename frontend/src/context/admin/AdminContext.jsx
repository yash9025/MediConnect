import { useState, useEffect, createContext } from "react";
import axios from 'axios';
import {toast} from 'react-toastify';

export const AdminContext = createContext(); 

const AdminContextProvider = (props) => {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(localStorage.getItem('role') === 'admin');
    const [doctors , setDoctors] = useState([]);
    const [appointments,setAppointments] = useState([]);
    const [dashData , setDashData] = useState(false);

    const backendUrl = import.meta.env.VITE_BACKEND_URL; 

const getAllDoctors = async () => {
    if (!isAdminAuthenticated) return;
    
    try {
        const {data} = await axios.post(backendUrl + '/api/admin/all-doctors');
        if(data.success){
            setDoctors(data.doctors);
            console.log(data.doctors);
            
        }else{
            toast.error(data.message);
        }
    } catch (error) {
        toast.error(error.message);
    }
}

    useEffect(() => {
        const syncFromStorage = () => {
            setIsAdminAuthenticated(localStorage.getItem('role') === 'admin');
        };

        window.addEventListener('storage', syncFromStorage);
        return () => window.removeEventListener('storage', syncFromStorage);
    }, []);


    const changeAvailability = async (docId) => {
        if (!isAdminAuthenticated) return;
        try {
            const {data} = await axios.post(backendUrl + '/api/admin/change-availability' , {docId});
            if(data.success){
                toast.success(data.message)
                getAllDoctors();
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message)
        }

    }

    const getAllAppointments = async () => {
        if (!isAdminAuthenticated) return;
        try {
            const {data} = await axios.get(backendUrl + '/api/admin/appointments');
            if(data.success){
                setAppointments(data.appointments)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const cancelAppointment = async (appointmentId) => {
        if (!isAdminAuthenticated) return;
        try {
            const {data} = await axios.post(backendUrl + '/api/admin/cancel-appointment' , {appointmentId});
            if(data.success){
                toast.success(data.message);
                getAllAppointments();
            }else{
                toast.error(data.message)
            }
            
        } catch (error) {
            toast.error(error.message);   
        }
    }

    const getDashData = async () => {
        if (!isAdminAuthenticated) return;
        try {
            const {data} = await axios.get(backendUrl + '/api/admin/dashboard');
            if(data.success){
                setDashData(data.dashData);
                console.log(data.dashData);
                
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)   
        }
    }

    const value = {
        isAdminAuthenticated, setIsAdminAuthenticated,
        aToken: isAdminAuthenticated, setAToken: setIsAdminAuthenticated,
        backendUrl, doctors , getAllDoctors , changeAvailability,
        appointments,setAppointments,
        getAllAppointments,
        cancelAppointment,
        dashData,getDashData
    };

    return (
        <AdminContext.Provider value={value}>
            {props.children} 
            {/* This allows all child components to access the AdminContext values */}
        </AdminContext.Provider>
    );
};

export default AdminContextProvider;
