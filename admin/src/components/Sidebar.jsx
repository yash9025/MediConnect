import { useContext, useState, useEffect } from 'react';
import { AdminContext } from '../context/AdminContext';
import { NavLink } from 'react-router-dom';
import { assets } from '../assets/assets';
import { DoctorContext } from '../context/DoctorContext';

const Sidebar = () => {
    const { aToken } = useContext(AdminContext);
    const { dToken } = useContext(DoctorContext);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className={`h-screen bg-white shadow-lg fixed left-0 top-16 pt-16 transition-all duration-300 ${isMobile ? 'w-16' : 'w-64'} p-3`}>
            {aToken && (
                <ul className="space-y-4">
                    <NavLink
                        to="/admin-dashboard"
                        className={({ isActive }) =>
                            `flex items-center p-3 rounded-lg transition duration-300 ${
                                isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            } ${isMobile ? 'justify-center' : 'space-x-3'}`
                        }
                    >
                        <img src={assets.home_icon} alt="" className="w-6 h-6" />
                        {!isMobile && <p className="font-medium">Dashboard</p>}
                    </NavLink>
                    <NavLink
                        to="/all-appointments"
                        className={({ isActive }) =>
                            `flex items-center p-3 rounded-lg transition duration-300 ${
                                isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            } ${isMobile ? 'justify-center' : 'space-x-3'}`
                        }
                    >
                        <img src={assets.appointment_icon} alt="" className="w-6 h-6" />
                        {!isMobile && <p className="font-medium">Appointments</p>}
                    </NavLink>
                    <NavLink
                        to="/add-doctor"
                        className={({ isActive }) =>
                            `flex items-center p-3 rounded-lg transition duration-300 ${
                                isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            } ${isMobile ? 'justify-center' : 'space-x-3'}`
                        }
                    >
                        <img src={assets.add_icon} alt="" className="w-6 h-6" />
                        {!isMobile && <p className="font-medium">Add Doctor</p>}
                    </NavLink>
                    <NavLink
                        to="/doctor-list"
                        className={({ isActive }) =>
                            `flex items-center p-3 rounded-lg transition duration-300 ${
                                isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            } ${isMobile ? 'justify-center' : 'space-x-3'}`
                        }
                    >
                        <img src={assets.people_icon} alt="" className="w-6 h-6" />
                        {!isMobile && <p className="font-medium">Doctor List</p>}
                    </NavLink>
                </ul>
            )}
            
            {dToken && (
                <ul className="space-y-4">
                    <NavLink
                        to="/doctor-dashboard"
                        className={({ isActive }) =>
                            `flex items-center p-3 rounded-lg transition duration-300 ${
                                isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            } ${isMobile ? 'justify-center' : 'space-x-3'}`
                        }
                    >
                        <img src={assets.home_icon} alt="" className="w-6 h-6" />
                        {!isMobile && <p className="font-medium">Dashboard</p>}
                    </NavLink>
                    <NavLink
                        to="/doctor-appointments"
                        className={({ isActive }) =>
                            `flex items-center p-3 rounded-lg transition duration-300 ${
                                isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            } ${isMobile ? 'justify-center' : 'space-x-3'}`
                        }
                    >
                        <img src={assets.appointment_icon} alt="" className="w-6 h-6" />
                        {!isMobile && <p className="font-medium">Appointments</p>}
                    </NavLink>
                    <NavLink
                        to="/doctor-profile"
                        className={({ isActive }) =>
                            `flex items-center p-3 rounded-lg transition duration-300 ${
                                isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            } ${isMobile ? 'justify-center' : 'space-x-3'}`
                        }
                    >
                        <img src={assets.people_icon} alt="" className="w-6 h-6" />
                        {!isMobile && <p className="font-medium">Profile</p>}
                    </NavLink>
                    <NavLink
                        to="/doctor-report"
                        className={({ isActive }) =>
                            `flex items-center p-3 rounded-lg transition duration-300 ${
                                isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            } ${isMobile ? 'justify-center' : 'space-x-3'}`
                        }
                    >
                        <img src={assets.people_icon} alt="" className="w-6 h-6" />
                        {!isMobile && <p className="font-medium">Report</p>}
                    </NavLink>
                </ul>
            )}
        </div>
    );
};

export default Sidebar;
