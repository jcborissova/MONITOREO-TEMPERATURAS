// src/App.tsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { SensorsProvider } from "./context/SensorsContext";
import { WeatherProvider } from "./context/WeatherContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { APIProvider } from "@vis.gl/react-google-maps";
import WarehousePlanModal from "./components/warehouse/WarehousePlan/WarehousePlanModal";
import PrivateRoute from "./components/auth/PrivateRoute";
import { GlobalLoadingProvider } from "./context/GlobalLoadingContext";
import { useSetupLoadInterceptors } from "./utils/setupLoadInterceptors";
import CacheBootstrap from "./app/CacheBootstrap";
import UsersPage from "./pages/UsersPage";

// Lazy pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Warehouses = lazy(() => import("./pages/Warehouses"));
const Devices = lazy(() => import("./pages/DevicesPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const Login = lazy(() => import("./pages/Login"));

const RouteFallback: React.FC = () => (
  <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-white">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
  </div>
);

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSetupLoadInterceptors();
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!} libraries={["maps"]}>
      <SensorsProvider>
        <WeatherProvider>
          <NotificationsProvider>
            <CacheBootstrap />
            {children}
            <WarehousePlanModal />
          </NotificationsProvider>
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
          <Route
            path="/login"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Login />
              </Suspense>
            }
          />
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
            <Route
              path="users"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <UsersPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </GlobalLoadingProvider>
    </Router>
  );
};

export default App;
