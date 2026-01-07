import { Navigate } from "react-router-dom";
import authService from "../../services/auth.service";
import type { JSX } from "react";

interface Props {
  children: JSX.Element;
}

export default function PrivateRoute({ children }: Props) {
  const isAuth = authService.isAuthenticated();

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
