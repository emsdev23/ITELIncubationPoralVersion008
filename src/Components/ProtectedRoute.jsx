// ProtectedRoute.js
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const userId = sessionStorage.getItem("userid");
  const roleId = Number(sessionStorage.getItem("roleid"));

  // If not logged in → go to login page
  if (!userId) {
    return <Navigate to="/" replace />;
  }

  // If logged in but doesn't have permission → redirect properly
  if (allowedRoles.length > 0 && !allowedRoles.includes(roleId)) {
    // Redirect based on role
    if ([0, 1, 3, 7, 9].includes(roleId)) {
      return <Navigate to="/Incubation/Dashboard" replace />;
    } else if ([4, 5, 6].includes(roleId)) {
      return <Navigate to="/startup/Dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  // Access allowed
  return children;
};

export default ProtectedRoute;
