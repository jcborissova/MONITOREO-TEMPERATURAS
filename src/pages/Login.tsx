/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/auth.service";
import Logo from "../assets/images/agrofem.png"; // Ruta de tu logo

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🚀 Redirigir si ya está autenticado
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.login({ email, password });
      navigate("/"); 
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      {/* Card Container */}
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 md:p-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={Logo} alt="Agrofem Logo" className="w-28 h-28" />
        </div>

        {/* Marca */}
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-1">
          Agrofem
        </h2>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Mejor carne para un mejor país
        </p>

        {error && (
          <div className="mb-4 text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
