import { Navigate, Outlet, useLocation } from "react-router-dom";

/**
 * Reads the user's role from localStorage.
 * The access token is an httpOnly cookie (not readable by JS).
 * The login flow stores the role string in localStorage as the
 * client-side auth signal, so we check that here.
 */
const getRole = () => localStorage.getItem("role");

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
  const role = getRole();

  // Not logged in at all — send to login
  if (!role) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Logged in but wrong role for this section — send to unauthorized
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const roleHome = roleHomeMap[role] || "/";

    // If already on their own home, let them through
    if (location.pathname === roleHome) {
      return <Outlet />;
    }

    return <Navigate to={unauthorizedTo} replace state={{ roleHome }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
