import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Warehouses from "./pages/Warehouses";
import Devices from "./pages/DevicesPage";
import { WeatherProvider } from "./context/WeatherContext";
import { APIProvider } from "@vis.gl/react-google-maps";
import WarehousePlanModal from "./components/warehouse/WarehousePlan/WarehousePlanModal";
import Login from "./pages/Login";
import PrivateRoute from "./components/auth/PrivateRoute";
import ReportPage from "./pages/ReportPage";

const App: React.FC = () => {
  return (
    <APIProvider
      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!}
      libraries={["maps"]}
    >
      <WeatherProvider>
        <Router>
          <Routes>
            {/* Ruta pública de Login */}
            <Route path="/login" element={<Login />} />

            {/* Rutas privadas protegidas */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              {/* Dashboard principal */}
              <Route index element={<Dashboard />} />

              {/* Submenú: Warehouses */}
              <Route path="/warehouses" element={<Warehouses />} />

              {/* submenú: Dispositivos */}
              <Route path="/devices" element={<Devices />} />

              {/* submenú: Reporte */}
              <Route path="/report" element={<ReportPage />} />
            </Route>

            {/* Redirección de rutas inválidas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>

        {/* Modal de planos (visible globalmente) */}
        <WarehousePlanModal />
      </WeatherProvider>
    </APIProvider>
  );
};

export default App;
