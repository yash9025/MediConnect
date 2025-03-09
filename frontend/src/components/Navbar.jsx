import React, { useContext, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets.js";
import { AppContext } from "../context/AppContext.jsx";

const Navbar = () => {
    const navigate = useNavigate();

    const { token, setToken, userData } = useContext(AppContext);

    const [showMenu, setShowMenu] = useState(false);

    const logout = () => {
        setToken(false)
        localStorage.removeItem('token')
    }

    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const handleMenuToggle = () => {
        setShowMenu(!showMenu);
        setShowProfileMenu(false);  // Close profile menu when opening mobile menu
    };

    // Function to close mobile menu when a menu item is clicked
    const closeMenu = () => {
        setShowMenu(false);
    };

    return (
        <div className="flex items-center justify-between py-2 px-4 bg-white shadow-md lg:px-16">
            {/* Clickable Logo */}
            <NavLink to="/">
                <img className="w-32 md:w-36 h-auto cursor-pointer scale-125" src={assets.logo} alt="Logo" />
            </NavLink>

            {/* Navigation Menu */}
            <ul className="hidden md:flex items-center gap-6 font-medium text-gray-700">
                <li>
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `relative pb-1 transition-all duration-300 hover:text-green-600 ${isActive ? "text-green-600 border-b-2 border-green-500" : ""
                            }`
                        }
                    >
                        Home
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/doctors"
                        className={({ isActive }) =>
                            `relative pb-1 transition-all duration-300 hover:text-green-600 ${isActive ? "text-green-600 border-b-2 border-green-500" : ""
                            }`
                        }
                    >
                        All Doctors
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/about"
                        className={({ isActive }) =>
                            `relative pb-1 transition-all duration-300 hover:text-green-600 ${isActive ? "text-green-600 border-b-2 border-green-500" : ""
                            }`
                        }
                    >
                        About
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/contact"
                        className={({ isActive }) =>
                            `relative pb-1 transition-all duration-300 hover:text-green-600 ${isActive ? "text-green-600 border-b-2 border-green-500" : ""
                            }`
                        }
                    >
                        Contact
                    </NavLink>
                </li>
                <li>
                    <a
                        href="https://mediconnect-admin-zi16.onrender.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 text-white px-4 py-2 rounded-full text-sm hover:bg-green-700 transition-all duration-200"
                    >
                        Admin Panel
                    </a>
                </li>

            </ul>

            {/* Buttons Section */}
            <div className="flex items-center space-x-3">
                {token && userData ? (
                    <div
                        className="relative flex items-center gap-2 cursor-pointer group"
                        onMouseEnter={() => setShowProfileMenu(true)}
                        onMouseLeave={() => setShowProfileMenu(false)}
                    >
                        {/* Profile Image */}
                        <img
                            className="w-9 h-9 rounded-full border border-green-400 shadow-sm transition-transform duration-300 hover:scale-105"
                            src={userData.image}
                            alt="Profile"
                        />

                        {/* Dropdown Icon */}
                        <img className="w-3 transition-transform duration-300 group-hover:rotate-180" src={assets.dropdown_icon} alt="Dropdown" />

                        {/* Dropdown Menu (Visible on Hover) */}
                        {showProfileMenu && (
                            <div className="absolute top-10 right-0 w-40 bg-white shadow-md rounded-md text-gray-700 text-sm font-medium z-20 transition-opacity duration-300 opacity-100">
                                <div className="p-2 space-y-1">
                                    <p
                                        onClick={() => navigate("/my-profile")}
                                        className="hover:bg-gray-100 p-2 rounded cursor-pointer"
                                    >
                                        My Profile
                                    </p>
                                    <p
                                        onClick={() => navigate("/my-appointments")}
                                        className="hover:bg-gray-100 p-2 rounded cursor-pointer"
                                    >
                                        My Appointments
                                    </p>
                                    <p
                                        onClick={logout}
                                        className="hover:bg-red-100 text-red-500 p-2 rounded cursor-pointer"
                                    >
                                        Logout
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => navigate("/login")}
                        className="cursor-pointer px-4 py-1.5 bg-blue-500 text-white font-medium rounded-md shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                    >
                        Create Account
                    </button>
                )}

                {/* Mobile Menu Icon */}
                <img onClick={handleMenuToggle} src={assets.menu_icon} className="w-6 h-6 cursor-pointer md:hidden" alt="Menu" />

                {/* Mobile Menu */}
                {showMenu && (
                    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-20 transition-opacity duration-300 opacity-100">
                        <div className="absolute top-0 right-0 w-64 bg-white h-full p-6 flex flex-col items-start space-y-6">
                            <div className="flex items-center justify-between w-full">
                                <img className="w-32 md:w-36 h-auto" src={assets.logo} alt="Logo" />
                                <img
                                    onClick={() => setShowMenu(false)}
                                    src={assets.cross_icon}
                                    className="w-6 h-6 cursor-pointer"
                                    alt="Close"
                                />
                            </div>

                            <ul className="space-y-4 text-lg font-medium text-gray-700">
                                <li>
                                    <NavLink
                                        to="/"
                                        className={({ isActive }) =>
                                            `relative transition-all duration-300 hover:text-green-600 ${isActive ? "text-green-600" : ""
                                            }`
                                        }
                                        onClick={closeMenu}  // Close menu when clicked
                                    >
                                        Home
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink
                                        to="/doctors"
                                        className={({ isActive }) =>
                                            `relative transition-all duration-300 hover:text-green-600 ${isActive ? "text-green-600" : ""
                                            }`
                                        }
                                        onClick={closeMenu}  // Close menu when clicked
                                    >
                                        All Doctors
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink
                                        to="/about"
                                        className={({ isActive }) =>
                                            `relative transition-all duration-300 hover:text-green-600 ${isActive ? "text-green-600" : ""
                                            }`
                                        }
                                        onClick={closeMenu}  // Close menu when clicked
                                    >
                                        About
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink
                                        to="/contact"
                                        className={({ isActive }) =>
                                            `relative transition-all duration-300 hover:text-green-600 ${isActive ? "text-green-600" : ""
                                            }`
                                        }
                                        onClick={closeMenu}  // Close menu when clicked
                                    >
                                        Contact
                                    </NavLink>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Navbar;
