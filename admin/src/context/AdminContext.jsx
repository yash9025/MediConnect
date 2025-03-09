import { useState, useEffect, createContext } from "react";
import axios from 'axios';
import {toast} from 'react-toastify';

export const AdminContext = createContext(); 
// This context will allow us to share data across multiple components without prop drilling.

const AdminContextProvider = (props) => {
    // If we have a token in localStorage, the admin will remain logged in even after a page refresh.
    const [aToken, setAToken] = useState(localStorage.getItem('aToken')?localStorage.getItem('aToken'):'');
    const [doctors , setDoctors] = useState([]);
    const [appointments,setAppointments] = useState([]);
    const [dashData , setDashData] = useState(false);

    const backendUrl = import.meta.env.VITE_BACKEND_URL; 
    // The backend is running on localhost:4000, so I have connected it to the admin panel.

const getAllDoctors = async () => {
    
    try {
        
        const {data} = await axios.post(backendUrl + '/api/admin/all-doctors' , {}, {headers:{aToken}}); //fetching the data getting at the endpoint /api/admin/all-docotrs from backend
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

    // Sync state changes with localStorage to ensure token persistence across refreshes.
    useEffect(() => {
        if (aToken) {
            localStorage.setItem('aToken', aToken); // Store token in localStorage if it exists.
        } else {
            localStorage.removeItem('aToken'); // Remove token from localStorage if it's null or empty.
        }
    }, [aToken]); // Runs whenever aToken changes


    const changeAvailability = async (docId) => {
        
        try {
            const {data} = await axios.post(backendUrl + '/api/admin/change-availability' , {docId} , {headers:{aToken}});
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
        
        try {
            
            const {data} = await axios.get(backendUrl + '/api/admin/appointments' , {headers:{aToken}});
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
        
        try {

            const {data} = await axios.post(backendUrl + '/api/admin/cancel-appointment', {appointmentId} , {headers:{aToken}});
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
        
        try {
            
            const {data} = await axios.get(backendUrl + '/api/admin/dashboard' ,{headers:{aToken}});
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
