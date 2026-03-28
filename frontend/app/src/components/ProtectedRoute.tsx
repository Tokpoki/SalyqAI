import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { DEV_BYPASS } from "@/lib/dev";

export default function ProtectedRoute() {
  if (!DEV_BYPASS && !isAuthenticated()) return <Navigate to="/login" replace />;
  return <Outlet />;
}
