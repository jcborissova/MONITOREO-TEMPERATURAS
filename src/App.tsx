import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { SensorsProvider } from "./context/SensorsContext";
import { WeatherProvider } from "./context/WeatherContext";
import { APIProvider } from "@vis.gl/react-google-maps";
import WarehousePlanModal from "./components/warehouse/WarehousePlan/WarehousePlanModal";
import PrivateRoute from "./components/auth/PrivateRoute";
import { GlobalLoadingProvider } from "./context/GlobalLoadingContext";
import { useSetupLoadInterceptors } from "./utils/setupLoadInterceptors";

// 🔸 Lazy pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Warehouses = lazy(() => import("./pages/Warehouses"));
const Devices = lazy(() => import("./pages/DevicesPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const Login = lazy(() => import("./pages/Login"));

// Pequeño loader inline para fallback de rutas (reutiliza el overlay visual)
const RouteFallback: React.FC = () => (
  <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-white">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
  </div>
);

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // instala interceptores globales una sola vez
  useSetupLoadInterceptors();

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!} libraries={["maps"]}>
      <SensorsProvider>
        <WeatherProvider>
          {children}
          <WarehousePlanModal />
        </WeatherProvider>
      </SensorsProvider>
    </APIProvider>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <GlobalLoadingProvider>
        <Routes>
          {/* 🔹 LOGIN fuera de layout, pero con fallback de carga */}
          <Route
            path="/login"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Login />
              </Suspense>
            }
          />

          {/* 🔹 RUTAS PRIVADAS CON PROVIDERS */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Providers>
                  <Layout />
                </Providers>
              </PrivateRoute>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path="warehouses"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Warehouses />
                </Suspense>
              }
            />
            <Route
              path="devices"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Devices />
                </Suspense>
              }
            />
            <Route
              path="report"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <ReportPage />
                </Suspense>
              }
            />
            <Route
              path="notifications"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <NotificationsPage />
                </Suspense>
              }
            />
          </Route>

          {/* 🔹 Cualquier otra ruta → redirige */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </GlobalLoadingProvider>
    </Router>
  );
};

export default App;
