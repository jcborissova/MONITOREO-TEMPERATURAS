import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import MainMap from "./components/warehouse/Map/MainMap";
import { WeatherProvider } from "./context/WeatherContext";
import { APIProvider } from "@vis.gl/react-google-maps";
import WarehousePlanModal from "./components/warehouse/WarehousePlan/WarehousePlanModal"; // 👈 IMPORTANTE

const App: React.FC = () => {
  return (
    <APIProvider
      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!}
      libraries={["maps"]}
    >
      <WeatherProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="/map" element={<MainMap />} />
            </Route>
          </Routes>
        </Router>

        {/* MODAL GLOBAL */}
        <WarehousePlanModal />
      </WeatherProvider>
    </APIProvider>
  );
};

export default App;
