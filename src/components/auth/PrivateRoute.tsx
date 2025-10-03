import React, { type JSX } from "react";
import { Navigate } from "react-router-dom";
import authService from "../../services/auth.service";

interface Props {
  children: JSX.Element;
}

const PrivateRoute: React.FC<Props> = ({ children }) => {
  return authService.isAuthenticated() ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
