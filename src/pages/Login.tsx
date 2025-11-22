/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/auth.service";

// Logo Agrofem (empresa)
import CompanyLogo from "../assets/images/agrofem-logo.png";
// Icono de la App (monitor temperatura)
import AppLogo from "../assets/images/smart-electric-solution.png";

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

  useEffect(() => {
    const token = authService.getToken();
    if (token) navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(t);
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
      {/* Fondos suaves teal (como tenías antes) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 h-80 w-80 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="absolute -bottom-40 -right-10 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl" />
      </div>

      {/* Error */}
      {error && (
        <div className="fixed top-4 inset-x-0 flex justify-center z-50">
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slideDown">
            <XMarkIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Grid principal */}
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        {/* Lado izquierdo: branding suave de Agrofem */}
        <div className="hidden lg:flex flex-col gap-6 text-slate-800">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex h-24 w-24 xl:h-28 xl:w-28 items-center justify-center rounded-2xl shadow-md border border-brand-accentSoft">
              <img
                src={CompanyLogo}
                alt="Agrofem Logo"
                className="h-20 xl:h-24 w-auto object-contain drop-shadow"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Sistema de Monitoreo Agrofem
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Solución interna para almacenes Agrofem
              </p>
            </div>
          </div>

          <p className="text-sm md:text-base text-slate-600 max-w-md">
            Monitorea temperatura y humedad en tiempo real y recibe alertas
            tempranas para proteger la cadena de frío y la calidad de la carne.
          </p>

          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              Integrado con sensores de temperatura y humedad en planta.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              Alertas configurables según rangos definidos por Agrofem.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              Diseñado a la medida de la operación de Agrofem.
            </li>
          </ul>
        </div>

        {/* Card Login */}
        <div className="w-full">
          <div className="mx-auto w-full max-w-md rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-8 sm:px-8 sm:py-10 backdrop-blur">
            {/* Logos app + título */}
            <div className="flex flex-col items-center mb-6">
              <div className="mb-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm px-5 py-4">
                <img
                  src={AppLogo}
                  alt="Icono de la App"
                  className="h-16 sm:h-20 md:h-24 w-auto object-contain"
                />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900">
                Panel de Monitoreo
              </h2>
              <p className="text-center text-slate-500 mt-1 text-sm">
                Inicia sesión para acceder a los datos de tus almacenes Agrofem.
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
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
                    placeholder="ejemplo@agrofem.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50/80 px-10 py-3 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    required
                  />
                </div>
              </div>

              {/* Password */}
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

              {/* Remember + Forgot */}
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

              {/* Submit */}
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                )}
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            {/* Footer logos + créditos */}
            <div className="mt-6 border-t border-slate-100 pt-4 flex flex-col gap-2 items-center">
              <div className="flex items-center gap-3">
                <img
                  src={CompanyLogo}
                  alt="Agrofem Logo"
                  className="h-8 w-auto object-contain"
                />
                <span className="text-xs text-slate-400">·</span>
                <img
                  src={AppLogo}
                  alt="App Logo"
                  className="h-7 w-auto object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Desarrollado por{" "}
                <span className="font-semibold">Smart Electric Solution</span>{" "}
                para <span className="font-semibold">Agrofem</span>.
              </p>
              <p className="text-[11px] text-slate-400 text-center">
                Uso exclusivo para personal autorizado de Agrofem.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
