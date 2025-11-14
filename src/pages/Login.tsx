/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/auth.service";

// Icono de la app
import Logo from "../assets/images/smart-electric-solution.png";

// Logo oficial de la empresa (el que mostraste)
import CompanyLogo from "../assets/images/SmartLogo.png";

import {
  XMarkIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🚀 Redirigir si ya está autenticado
  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // 🔔 Ocultar error automáticamente después de 3s
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.login({ email, password });
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4">
      {/* Fondo decorativo acorde al logo (teal + azul) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 h-80 w-80 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="absolute -bottom-40 -right-10 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl" />
      </div>

      {/* 🔔 Notificación de error */}
      {error && (
        <div className="fixed top-4 inset-x-0 flex justify-center z-50">
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slideDown">
            <XMarkIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        {/* ================================ */}
        {/*   PANEL DE BRANDING CORPORATIVO */}
        {/* ================================ */}
        <div className="hidden lg:flex flex-col gap-6 text-slate-800">
          {/* Logo de Empresa */}
          <div className="flex items-center gap-4 mb-2">
            <div className="rounded-2xl bg-teal-600/90 shadow-md  border border-teal-700">
              <img
                src={CompanyLogo}
                alt="Smart Electric Solution Company Logo"
                className="w-28 h-28 object-contain drop-shadow"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Smart Electric Solution
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Empresa propietaria del sistema
              </p>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-sm border border-slate-100 w-max mt-2">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-700">
              Plataforma interna corporativa
            </span>
          </div>

          {/* Título principal */}
          <h1 className="text-3xl xl:text-4xl font-bold text-slate-900 leading-tight">
            Controla tu{" "}
            <span className="text-teal-600">energía</span> y tus{" "}
            <span className="text-teal-600">operaciones</span> desde un solo
            lugar.
          </h1>

          <p className="text-sm md:text-base text-slate-600 max-w-md">
            Accede al panel para monitorear consumos, gestionar equipos y tomar
            decisiones en tiempo real. Tecnología inteligente para empresas que
            necesitan control y visibilidad constantes.
          </p>

          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Visibilidad clara de los puntos eléctricos.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Alertas en tiempo real ante anomalías.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Pensado para crecer con tu operación.
            </li>
          </ul>
        </div>

        {/* ================================ */}
        {/*             CARD LOGIN           */}
        {/* ================================ */}
        <div className="w-full">
          <div className="mx-auto w-full max-w-md rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-8 sm:px-8 sm:py-10 backdrop-blur">
            {/* Icono de la APP */}
            <div className="flex flex-col items-center mb-6">
              <div className="mb-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm px-4 py-3">
                <img
                  src={Logo}
                  alt="Smart Electric Solution App Icon"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900">
                Panel de Monitoreo
              </h2>
              <p className="text-center text-slate-500 mt-1 text-sm">
                Inicia sesión para acceder a tus datos de energía y sensores.
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-slate-700 text-sm font-medium mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <EnvelopeIcon className="w-5 h-5 text-slate-400" />
                  </span>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50/80 px-10 py-3 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-medium mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <LockClosedIcon className="w-5 h-5 text-slate-400" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50/80 px-10 pr-11 py-3 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Recordarme</span>
                </label>
                <button
                  type="button"
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-teal-600 text-white py-3 rounded-lg text-sm sm:text-base font-semibold shadow-md hover:bg-teal-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                )}
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            <p className="mt-4 text-[11px] sm:text-xs text-center text-slate-400">
              Acceso exclusivo para personal autorizado de Smart Electric
              Solution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
