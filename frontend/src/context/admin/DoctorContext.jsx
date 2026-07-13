import { createContext, useState, useCallback } from "react";
import axios from 'axios';
import {toast} from 'react-toastify';

export const DoctorContext = createContext()

const DoctorContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [isDoctorAuthenticated, setIsDoctorAuthenticated] = useState(localStorage.getItem('role') === 'doctor');
    const [appointments,setAppointments] = useState([]);
    const [dashData , setDashData] = useState(false);
    const [profileData , setProfileData] = useState(false);

    const getAppointments = useCallback(async () => {
        if (!isDoctorAuthenticated) return;
        
        try {
            
            const {data} = await axios.get(backendUrl + '/api/doctor/appointments');
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
    }, [isDoctorAuthenticated, backendUrl]);

    const completeAppointment = useCallback(async (appointmentId) => {
        if (!isDoctorAuthenticated) return;
        
        try {
            
            const {data} = await axios.post(backendUrl + '/api/doctor/complete-appointment' ,{appointmentId});
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
    }, [isDoctorAuthenticated, backendUrl, getAppointments]);

    const cancelAppointment = useCallback(async (appointmentId) => {
        if (!isDoctorAuthenticated) return;
        
        try {
            
            const {data} = await axios.post(backendUrl + '/api/doctor/cancel-appointment' ,{appointmentId});
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
    }, [isDoctorAuthenticated, backendUrl, getAppointments]);

    const getDashData = useCallback(async () => {
        if (!isDoctorAuthenticated) return;
        
        try {
            
            const {data} = await axios.get(backendUrl + '/api/doctor/dashboard');
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
    }, [isDoctorAuthenticated, backendUrl]);

    const getProfileData = useCallback(async () => {
        if (!isDoctorAuthenticated) return;
        try {
            const {data} = await axios.get(backendUrl + '/api/doctor/profile');
            if(data.success){
              setProfileData(data.profileData);
              console.log(data.profileData);
            }
        } catch (error) {
            console.log(error);
        }
    }, [isDoctorAuthenticated, backendUrl]);


    const value={
        isDoctorAuthenticated, setIsDoctorAuthenticated,
        dToken: isDoctorAuthenticated, setDToken: setIsDoctorAuthenticated,
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