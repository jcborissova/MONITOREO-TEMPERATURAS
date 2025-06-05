// src/components/layout/Layout.tsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`flex flex-col flex-grow transition-all duration-300`}>
        <Header isSidebarOpen={isSidebarOpen} />
        <main className="flex-grow overflow-auto p-4 mt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;