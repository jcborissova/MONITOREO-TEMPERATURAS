/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, type FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/auth.service";
import { useGlobalLoading } from "../context/GlobalLoadingContext";

import CompanyLogo from "../assets/images/agrofem-logo.png";
import AppLogo from "../assets/images/smart-electric-solution.png";

import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const Login: React.FC = () => {
  const navigate = useNavigate();

  // 🔥 NO usaremos el overlay global, solo el contador (sin mostrar overlay)
  const { start, stop } = useGlobalLoading();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState("");

  // Si ya está logueado → redirigir
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Ocultar error después de 3s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(t);
  }, [error]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // 🔥 Loading local (NO overlay global)
    setLocalLoading(true);
    start(); // mantiene consistencia para métricas pero sin overlay

    try {
      await authService.login({ email, password });

      stop();
      setLocalLoading(false);

      navigate("/", { replace: true });
    } catch (err: any) {
      stop();
      setLocalLoading(false);

      setError(err?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 px-4">

      {/* Background suave */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-28 -left-10 w-72 h-72 bg-teal-300/30 blur-3xl rounded-full" />
        <div className="absolute -bottom-28 -right-10 w-72 h-72 bg-cyan-300/25 blur-3xl rounded-full" />
      </div>

      {/* Toast error */}
      {error && (
        <div className="fixed top-4 left-0 right-0 flex justify-center z-50">
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <XMarkIcon className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Card */}
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl rounded-2xl px-6 py-8">

        {/* Logos */}
        <div className="flex flex-col items-center mb-6">
          <img src={AppLogo} className="h-20 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Panel de Monitoreo</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Inicia sesión para acceder al sistema de Agrofem.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@agrofem.com"
                className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-300 bg-slate-50/70 
                           text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-300 bg-slate-50/70 
                           text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeSlashIcon className="w-5" /> : <EyeIcon className="w-5" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={localLoading}
            className={`
              w-full py-3 rounded-lg font-semibold text-sm shadow-md transition-all
              ${localLoading
                ? "bg-teal-400 cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700 text-white"
              }
            `}
          >
            {localLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Cargando…</span>
              </div>
            ) : (
              "Ingresar"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 border-t pt-4 text-center flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <img src={CompanyLogo} className="h-7" />
            <span className="text-xs text-slate-400">·</span>
            <img src={AppLogo} className="h-7" />
          </div>
          <p className="text-[11px] text-slate-500">
            Desarrollado por <b>Smart Electric Solution</b> para <b>Agrofem</b>.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
