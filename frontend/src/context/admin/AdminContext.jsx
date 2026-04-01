import { useState, useEffect, createContext } from "react";
import axios from 'axios';
import {toast} from 'react-toastify';

export const AdminContext = createContext(); 

const decodeRole = (token) => {
    try {
        const payloadPart = token?.split('.')?.[1];
        if (!payloadPart) return null;

        const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64))?.role || null;
    } catch {
        return null;
    }
};

const AdminContextProvider = (props) => {
    const initialToken = localStorage.getItem('token') || '';
    const [aToken, setATokenState] = useState(decodeRole(initialToken) === 'admin' ? initialToken : '');
    const [doctors , setDoctors] = useState([]);
    const [appointments,setAppointments] = useState([]);
    const [dashData , setDashData] = useState(false);

    const backendUrl = import.meta.env.VITE_BACKEND_URL; 

    const setAToken = (nextToken) => {
        if (!nextToken) {
            setATokenState('');
            return;
        }

        localStorage.setItem('token', nextToken);
        setATokenState(nextToken);
    };

    const authHeaders = aToken ? { Authorization: `Bearer ${aToken}` } : {};

const getAllDoctors = async () => {
    if (!aToken) return;
    
    try {
        const {data} = await axios.post(backendUrl + '/api/admin/all-doctors' , {}, { headers: authHeaders });
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
            const token = localStorage.getItem('token') || '';
            setATokenState(decodeRole(token) === 'admin' ? token : '');
        };

        window.addEventListener('storage', syncFromStorage);
        return () => window.removeEventListener('storage', syncFromStorage);
    }, []);


    const changeAvailability = async (docId) => {
        if (!aToken) return;
        
        try {
            const {data} = await axios.post(backendUrl + '/api/admin/change-availability' , {docId} , { headers: authHeaders });
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
        if (!aToken) return;
        
        try {
            
            const {data} = await axios.get(backendUrl + '/api/admin/appointments' , { headers: authHeaders });
            if(data.success){
                setAppointments(data.appointments)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const cancelAppointment= async (appointmentId) => {
        if (!aToken) return;
        
        try {

            const {data} = await axios.post(backendUrl + '/api/admin/cancel-appointment', {appointmentId} , { headers: authHeaders });
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
        if (!aToken) return;
        
        try {
            
            const {data} = await axios.get(backendUrl + '/api/admin/dashboard' , { headers: authHeaders });
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
        aToken, setAToken,
        backendUrl,doctors,
        getAllDoctors,changeAvailability,
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
