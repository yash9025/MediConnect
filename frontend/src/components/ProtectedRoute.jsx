import { Navigate, Outlet, useLocation } from "react-router-dom";

const getToken = () => localStorage.getItem("token");

const decodeJwtPayload = (token) => {
  try {
    const payloadPart = token?.split(".")?.[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

const roleHomeMap = {
  admin: "/admin/dashboard",
  doctor: "/doctor/dashboard",
  patient: "/"
};

const ProtectedRoute = ({
  allowedRoles = [],
  redirectTo = "/login",
  unauthorizedTo = "/unauthorized"
}) => {
  const location = useLocation();
  const token = getToken();

  if (!token) {
    if (location.pathname === redirectTo) {
      return <Outlet />;
    }

    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  const payload = decodeJwtPayload(token);

  if (!payload?.role) {
    localStorage.removeItem("token");
    if (location.pathname === redirectTo) {
      return <Outlet />;
    }

    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
    const roleHome = roleHomeMap[payload.role] || "/";

    if (location.pathname === unauthorizedTo) {
      return <Outlet />;
    }

    if (location.pathname === roleHome) {
      return <Outlet />;
    }

    return <Navigate to={unauthorizedTo} replace state={{ roleHome }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
