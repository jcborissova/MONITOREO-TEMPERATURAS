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

const App: React.FC = () => {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!} libraries={["maps"]}>
      <SensorsProvider>
        <WeatherProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="/warehouses" element={<Warehouses />} />
                <Route path="/devices" element={<Devices />} />
                <Route path="/report" element={<ReportPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
          <WarehousePlanModal />
        </WeatherProvider>
      </SensorsProvider>
    </APIProvider>
  );
};

export default App;
