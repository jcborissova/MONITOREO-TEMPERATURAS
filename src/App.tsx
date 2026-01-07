import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/layout/Layout";
import PrivateRoute from "./components/auth/PrivateRoute";

// Providers globales
import { SensorsProvider } from "./context/SensorsContext";
import { WeatherProvider } from "./context/WeatherContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { APIProvider } from "@vis.gl/react-google-maps";
import WarehousePlanModal from "./components/warehouse/WarehousePlan/WarehousePlanModal";
import { GlobalLoadingProvider } from "./context/GlobalLoadingContext";
import CacheBootstrap from "./app/CacheBootstrap";
import { useSetupLoadInterceptors } from "./utils/setupLoadInterceptors";

// Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Warehouses = lazy(() => import("./pages/Warehouses"));
const Devices = lazy(() => import("./pages/DevicesPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const Login = lazy(() => import("./pages/Login"));

const RouteFallback = () => (
  <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-white">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
  </div>
);

/** Interceptores, cache, etc. */
function ProvidersInside({ children }: { children: React.ReactNode }) {
  useSetupLoadInterceptors();
  return (
    <>
      <CacheBootstrap />
      {children}
    </>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!} libraries={["maps"]}>
      <SensorsProvider>
        <WeatherProvider>
          <NotificationsProvider>
            <GlobalLoadingProvider>
              <ProvidersInside>{children}</ProvidersInside>
              <WarehousePlanModal />
            </GlobalLoadingProvider>
          </NotificationsProvider>
        </WeatherProvider>
      </SensorsProvider>
    </APIProvider>
  );
}

export default function App() {
  return (
    <Router>
      <Providers>
        <Routes>
          {/* LOGIN */}
          <Route
            path="/login"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Login />
              </Suspense>
            }
          />

          {/* RUTAS PROTEGIDAS */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
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

          {/* DEFAULT */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Providers>
    </Router>
  );
}
