import React, { useContext } from "react";
import { assets } from "../assets/assets";
import { AdminContext } from "../context/AdminContext";
import {useNavigate} from 'react-router-dom';
import { DoctorContext } from "../context/DoctorContext";


const Navbar = () => {
    const { aToken, setAToken } = useContext(AdminContext);
    const {dToken , setDToken} = useContext(DoctorContext);

    const navigate = useNavigate();

    const logout = () => {
        navigate('/');
        aToken && setAToken('') //&& means if
        aToken && localStorage.removeItem('aToken')
        dToken && setDToken('')
        dToken && localStorage.removeItem('dToken')
    }

    return (
        <div className="bg-white text-gray-800 py-3 px-12 flex justify-between items-center shadow-md fixed w-full top-0 z-50">
            {/* Left Section - Logo & Admin Panel Label with More Spacing */}
            { aToken ? (
                <div className="flex items-center space-x-6 ml-4">
                <img src={assets.admin_logo} alt="Admin Logo" className="h-16 object-contain scale-125" />
                <span className="text-[10px] font-medium bg-green-400 text-gray-700 px-2 py-1 rounded-md shadow-sm border border-gray-300">
                    Admin Panel
                </span>
            </div>
            ) : (
                <div className="flex items-center space-x-6 ml-4">
                <img src={assets.admin_logo} alt="Admin Logo" className="h-16 object-contain scale-125" />
                <span className="text-[10px] font-medium bg-green-400 text-gray-700 px-2 py-1 rounded-md shadow-sm border border-gray-300">
                    Doctor Panel
                </span>
            </div>
            )}
            

            {/* Logout Button */}
            <button onClick={logout} className="bg-blue-500 hover:bg-red-600 text-white px-6 py-2 rounded-md transition shadow-sm text-sm mr-4 cursor-pointer">
                Logout
            </button>
        </div>
    );
};

export default Navbar;
