import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Warehouses from "./pages/Warehouses"; 
import { WeatherProvider } from "./context/WeatherContext";
import { APIProvider } from "@vis.gl/react-google-maps";
import WarehousePlanModal from "./components/warehouse/WarehousePlan/WarehousePlanModal";
import Login from "./pages/Login";
import PrivateRoute from "./components/auth/PrivateRoute";

const App: React.FC = () => {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!} libraries={["maps"]}>
      <WeatherProvider>
        <Router>
          <Routes>
            {/* Login público */}
            <Route path="/login" element={<Login />} />

            {/* Rutas privadas */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              {/* Dashboard global */}
              <Route index element={<Dashboard />} />
              {/* Nueva vista warehouses */}
              <Route path="/warehouses" element={<Warehouses />} />
            </Route>

            {/* Catch-all: redirige rutas inválidas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <WarehousePlanModal />
      </WeatherProvider>
    </APIProvider>
  );
};

export default App;
