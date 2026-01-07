/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";
import { Outlet } from "react-router-dom";

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  return (
    <div className="flex w-full h-screen overflow-hidden bg-gray-100">

      {/* =====================================
          🔥 MODAL GLOBAL — ENCIMA DE TODO
      ====================================== */}
      {confirmOpen && (
        <div
          className="
            fixed inset-0 z-[999999]
            bg-black/40 backdrop-blur-sm
            flex items-center justify-center
          "
        >
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[85%] max-w-sm">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar salida
              </h3>
              <button
                onClick={() => setConfirmOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-700 mb-6">
              ¿Estás seguro de que deseas cerrar sesión?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  setConfirmOpen(false);
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = "/login";
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold"
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================
          CONTENEDOR PRINCIPAL
      ====================================== */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex flex-col flex-1 relative bg-gray-50">

        {/* HEADER FIJO ARRIBA */}
        <header className="shrink-0 z-50">
          <Header
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
          />
        </header>

        {/* =====================================
            ÁREA SCROLLEABLE ENTRE HEADER Y NAV
        ====================================== */}
        <main
          className="
            flex-1 overflow-y-auto
            px-2 sm:px-6
            bg-gray-50
          "
          style={{
            paddingTop: "0.75rem",
            paddingBottom: "5.5rem", // espacio para bottom nav
          }}
        >
          <Outlet />
        </main>

        {/* BOTTOM NAV FIJO ABAJO */}
        <nav className="fixed bottom-0 left-0 right-0 z-40">
          <MobileBottomNav onLogoutRequest={() => setConfirmOpen(true)} />
        </nav>

      </div>
    </div>
  );
};

export default Layout;
