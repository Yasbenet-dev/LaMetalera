import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
