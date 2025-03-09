//The main reason to use React Context is to avoid prop-drilling, which is when you pass props down through many layers of components to reach the component that needs the data.
//Instead of passing the doctors data through every component in the hierarchy, you use AppContext to make doctors accessible to any component that consumes the context.

import { createContext, useEffect, useState } from "react";
import axios from 'axios';
import { toast } from 'react-toastify';

export const AppContext = createContext(null);

const AppContextProvider = (props) => {

    const currencySymbol = '$';
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [doctors, setDoctors] = useState([]);
    const [token,setToken] = useState(localStorage.getItem('token')?localStorage.getItem('token'):false); //if local storage has token then use it . this is the logic that when a logged in user reloads it should be logged in
    const [userData , setUserData] = useState(false);

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
            console.log(error);
            toast.error(error.message);
        }
    }

    const loadUserProfileData = async () => {
        

        try {

            const { data } = await axios.get(backendUrl + '/api/user/get-profile' , {headers:{token}});
            if (data.success) {
                setUserData(data.userData);
            }else{
                toast.error(data.message);
            }
            
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    }

    
    const value = {
        doctors,getDoctorData,
        currencySymbol,
        token,setToken,
        backendUrl,
        userData,setUserData,
        loadUserProfileData
    }

    useEffect(() => {
        getDoctorData()
    }, [])

    useEffect(() => {
        if(token){
            loadUserProfileData()
        }else{
            setUserData(false);
        }
       
    }, [token])

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}

export default AppContextProvider;