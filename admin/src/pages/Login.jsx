import React, { useState, useContext, useEffect } from "react";
import { AdminContext } from "../context/AdminContext";
import axios from "axios";
import { toast } from "react-toastify";
import { DoctorContext } from "../context/DoctorContext";

const Login = () => {
    const [state, setState] = useState("Admin");
    const { setAToken, backendUrl } = useContext(AdminContext);
    const { setDToken } = useContext(DoctorContext);

    // Load saved email & password or set default values
    const [email, setEmail] = useState(localStorage.getItem("savedEmail") || "admin@mediconnect.com");
    const [password, setPassword] = useState(localStorage.getItem("savedPassword") || "yash@994");

    // Update localStorage when email or password changes
    useEffect(() => {
        localStorage.setItem("savedEmail", email);
        localStorage.setItem("savedPassword", password);
    }, [email, password]);

    const switchRole = () => {
        if (state === "Admin") {
            setState("Doctor");
            setEmail("richard@mediconnect.com");
            setPassword("12345678");
        } else {
            setState("Admin");
            setEmail("admin@mediconnect.com");
            setPassword("yash@994");
        }
    };

    const onSubmitHandler = async (event) => {
        event.preventDefault();

        try {
            if (state === "Admin") {
                const { data } = await axios.post(backendUrl + "/api/admin/login", { email, password });

                if (data.success) {
                    localStorage.setItem("aToken", data.token);
                    setAToken(data.token);
                    toast.success("Admin logged in!");
                } else {
                    toast.error(data.message);
                }
            } else {
                const { data } = await axios.post(backendUrl + "/api/doctor/login", { email, password });
                if (data.success) {
                    localStorage.setItem("dToken", data.token);
                    setDToken(data.token);
                    toast.success("Doctor logged in!");
                } else {
                    toast.error(data.message);
                }
            }
        } catch (error) {
            toast.error("Login failed. Please check your credentials.");
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <form onSubmit={onSubmitHandler} className="bg-white p-6 rounded-lg shadow-lg w-80">
                <h2 className="text-2xl font-semibold text-center mb-4">
                    <span className="text-blue-600">{state}</span> Login
                </h2>

                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Email</label>
                    <input
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        type="email"
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Password</label>
                    <input
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        type="password"
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300 cursor-pointer"
                >
                    Login
                </button>

                <p className="mt-4 text-center text-gray-700">
                    {state === "Admin" ? "Doctor" : "Admin"} Login?
                    <span
                        className="text-blue-600 cursor-pointer ml-1 hover:underline"
                        onClick={switchRole}
                    >
                        Click here
                    </span>
                </p>
            </form>
        </div>
    );
};

export default Login;
