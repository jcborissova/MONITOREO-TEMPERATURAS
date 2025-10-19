/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, type JSX } from "react";
import { Navigate } from "react-router-dom";
import authService from "../../services/auth.service";

interface Props {
  children: JSX.Element;
}

const PrivateRoute: React.FC<Props> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuth(authenticated);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Verificando sesión...
      </div>
    );
  }

  return isAuth ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
