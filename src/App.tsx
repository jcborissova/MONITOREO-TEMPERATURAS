import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Warehouses from "./pages/Warehouses";
import Devices from "./pages/DevicesPage";
import { SensorsProvider } from "./context/SensorsContext";
import { WeatherProvider } from "./context/WeatherContext";
import { APIProvider } from "@vis.gl/react-google-maps";
import WarehousePlanModal from "./components/warehouse/WarehousePlan/WarehousePlanModal";
import Login from "./pages/Login";
import PrivateRoute from "./components/auth/PrivateRoute";
import ReportPage from "./pages/ReportPage";
import NotificationsPage from "./pages/NotificationsPage";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 🔹 RUTA DE LOGIN SIN PROVIDERS */}
        <Route path="/login" element={<Login />} />

        {/* 🔹 RUTAS PRIVADAS CON TODOS LOS PROVIDERS */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <APIProvider
                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!}
                libraries={["maps"]}
              >
                <SensorsProvider>
                  <WeatherProvider>
                    <Layout />
                    <WarehousePlanModal />
                  </WeatherProvider>
                </SensorsProvider>
              </APIProvider>
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="devices" element={<Devices />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* 🔹 Cualquier otra ruta → redirige */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
