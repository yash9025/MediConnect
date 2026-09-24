import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const useDoctorAuthorization = (reportId, isAuthenticated, backendUrl) => {
  const [authorizedDocs, setAuthorizedDocs] = useState({});
  const [loadingDocs, setLoadingDocs] = useState({});

  const authorizeDoctor = useCallback(async (doctorId) => {
    if (!isAuthenticated) {
      toast.error("Please login to authorize doctors.");
      return;
    }

    setLoadingDocs((prev) => ({ ...prev, [doctorId]: true }));
    
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/authorize-doc`,
        { reportId, doctorId },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success("Report shared successfully!");
        setAuthorizedDocs((prev) => ({ ...prev, [doctorId]: true }));
      } else {
        toast.error(data.message || "Authorization failed");
      }
    } catch (error) {
      console.error("[ERROR] Authorization failed:", error);
      const errorMessage = error.response?.data?.message || "Authorization failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoadingDocs((prev) => ({ ...prev, [doctorId]: false }));
    }
  }, [isAuthenticated, backendUrl, reportId]);

  return { 
    authorizedDocs, 
    loadingDocs, 
    authorizeDoctor 
  };
};