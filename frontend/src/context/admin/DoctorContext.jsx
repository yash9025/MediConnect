import { createContext, useState, useCallback } from "react";
import axios from 'axios';
import {toast} from 'react-toastify';

export const DoctorContext = createContext()

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

const DoctorContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const initialToken = localStorage.getItem('token') || '';
    const [dToken ,setDTokenState] = useState(decodeRole(initialToken) === 'doctor' ? initialToken : '');
    const [appointments,setAppointments] = useState([]);
    const [dashData , setDashData] = useState(false);
    const [profileData , setProfileData] = useState(false);

    const setDToken = (nextToken) => {
        if (!nextToken) {
            setDTokenState('');
            return;
        }

        localStorage.setItem('token', nextToken);
        setDTokenState(nextToken);
    };

    const authHeaders = dToken ? { Authorization: `Bearer ${dToken}` } : {};

    const getAppointments = useCallback(async () => {
        if (!dToken) return;
        
        try {
            
            const {data} = await axios.get(backendUrl + '/api/doctor/appointments' , { headers: { Authorization: `Bearer ${dToken}` } });
            if(data.success){
                setAppointments(data.appointments.reverse());
                // console.log(data.appointments.reverse());
                
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
            
        }
    }, [dToken, backendUrl]);

    const completeAppointment = useCallback(async (appointmentId) => {
        if (!dToken) return;
        
        try {
            
            const {data} = await axios.post(backendUrl + '/api/doctor/complete-appointment' ,{appointmentId},{ headers: { Authorization: `Bearer ${dToken}` } });
            if(data.success){
                toast.success(data.message);
                getAppointments();
            }else{
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    }, [dToken, backendUrl, getAppointments]);

    const cancelAppointment = useCallback(async (appointmentId) => {
        if (!dToken) return;
        
        try {
            
            const {data} = await axios.post(backendUrl + '/api/doctor/cancel-appointment' ,{appointmentId},{ headers: { Authorization: `Bearer ${dToken}` } });
            if(data.success){
                toast.success(data.message);
                getAppointments();
            }else{
                console.log(data.message);
                toast.error(data.message);
            }

        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    }, [dToken, backendUrl, getAppointments]);

    const getDashData = useCallback(async () => {
        if (!dToken) return;
        
        try {
            
            const {data} = await axios.get(backendUrl + '/api/doctor/dashboard' , { headers: { Authorization: `Bearer ${dToken}` } });
            if(data.success){
                setDashData(data.dashData);
                console.log(data.dashData);
                
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
            
        }
    }, [dToken, backendUrl]);

    const getProfileData = useCallback(async () => {
        if (!dToken) return;
        try {
            const {data} = await axios.get(backendUrl + '/api/doctor/profile' , { headers: { Authorization: `Bearer ${dToken}` } });
            if(data.success){
              setProfileData(data.profileData);
              console.log(data.profileData);
            }
        } catch (error) {
            console.log(error);
        }
    }, [dToken, backendUrl]);


    const value={
        dToken,setDToken,
        backendUrl,
        appointments,setAppointments,
        getAppointments,
        completeAppointment,
        cancelAppointment,
        dashData,setDashData,
        getDashData,
        profileData,setProfileData,getProfileData
    }

    return (
        <DoctorContext.Provider value={value}>
            {props.children}
        </DoctorContext.Provider>
    )
}

export default DoctorContextProvider