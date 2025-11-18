/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import PageContainer from "../components/layout/PageContainer";
import ResponsiveTable from "../components/ui/ResponsiveTable";
import { usersService } from "../services/user.service";
import AuthService from "../services/auth.service";
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
} from "../types/api.types";
import {
  PlusIcon,
  ArrowPathIcon,
  NoSymbolIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import BaseModal from "../components/ui/BaseModal";
import ModalHeader from "../components/ui/ModalHeader";
import ModalFooter from "../components/ui/ModalFooter";

/* =========================
   UI helpers
========================= */

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger";
  }
> = ({ children, variant = "primary", className = "", ...rest }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "danger"
      ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
};

const SkeletonTable = () => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-56 bg-gray-200 rounded" />
      <div className="w-full h-10 bg-gray-100 rounded" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="w-full h-9 bg-gray-100 rounded" />
      ))}
    </div>
  </div>
);

const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center">
    <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
      <NoSymbolIcon className="w-8 h-8 text-blue-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-800">
      No hay usuarios para mostrar
    </h3>
    <p className="text-sm text-gray-500 mt-1">
      Aún no se han registrado cuentas de usuario en el sistema.
    </p>
    <div className="mt-5">
      <Button onClick={onRetry}>
        <ArrowPathIcon className="w-4 h-4" />
        Reintentar
      </Button>
    </div>
    <p className="text-xs text-gray-400 mt-3">
      Tip: verifica tu conexión y que el servicio de API esté disponible.
    </p>
  </div>
);

/* =========================
   Tipos locales
========================= */

interface UserFormState {
  id?: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

type FormErrors = Partial<Record<keyof UserFormState, string>>;

/* =========================
   Componente principal
========================= */

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // error general (API, permisos, etc.)
  const [error, setError] = useState<string | null>(null);

  // errores por campo (solo del modal)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [form, setForm] = useState<UserFormState>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    isActive: true,
  });

  const [showPassword, setShowPassword] = useState(false);

  /* ====== Cargar usuario actual ====== */
  useEffect(() => {
    try {
      const me = AuthService.getCurrentUser();
      setCurrentUser(me);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const isSelf = (row: User) => {
    if (!currentUser) return false;

    const currentId =
      (currentUser as any).id ?? (currentUser as any).userId ?? null;
    const rowId = (row as any).id ?? (row as any).userId ?? null;

    const sameId =
      currentId != null && rowId != null && Number(currentId) === Number(rowId);

    const sameEmail =
      currentUser.email &&
      row.email &&
      currentUser.email.toLowerCase() === row.email.toLowerCase();

    return sameId || sameEmail;
  };

  const isAdmin = currentUser?.email === "admin@admin.com";

  /* ====== Cargar usuarios ====== */

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await usersService.getAll();
      setUsers(list);
    } catch (e: any) {
      console.error(e);
      setError(
        "No pudimos cargar la lista de usuarios. Intenta de nuevo en unos minutos. " +
          "Si el problema continúa, contacta al administrador del sistema."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // 🔝 Ordenar usuarios: primero el usuario logueado, luego el resto (por fecha)
  const rows = useMemo(() => {
    if (!currentUser) return users;

    const currentId =
      (currentUser as any).id ?? (currentUser as any).userId ?? null;
    const meEmail = currentUser.email?.toLowerCase?.() ?? "";

    return [...users].sort((a, b) => {
      const aId = (a as any).id ?? (a as any).userId ?? null;
      const bId = (b as any).id ?? (b as any).userId ?? null;

      const aIsMe =
        (currentId != null && aId != null && Number(aId) === Number(currentId)) ||
        (a.email?.toLowerCase?.() === meEmail);
      const bIsMe =
        (currentId != null && bId != null && Number(bId) === Number(currentId)) ||
        (b.email?.toLowerCase?.() === meEmail);

      if (aIsMe && !bIsMe) return -1;
      if (!aIsMe && bIsMe) return 1;

      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [users, currentUser]);

  /* =========================
     Validación formulario
  ========================== */

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!firstName) {
      errors.firstName = "El nombre es obligatorio.";
    } else if (firstName.length < 2) {
      errors.firstName = "El nombre debe tener al menos 2 caracteres.";
    }

    if (!lastName) {
      errors.lastName = "El apellido es obligatorio.";
    } else if (lastName.length < 2) {
      errors.lastName = "El apellido debe tener al menos 2 caracteres.";
    }

    // En edición el email está deshabilitado, pero igual validamos el valor almacenado
    if (!email) {
      errors.email = "El email es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Ingresa un correo electrónico válido.";
    }

    if (!form.id) {
      // Crear usuario → password obligatorio
      if (!password.trim()) {
        errors.password = "La contraseña es obligatoria.";
      } else if (password.length < 6) {
        errors.password = "La contraseña debe tener al menos 6 caracteres.";
      }
    } else if (password.trim() && password.length < 6) {
      // Editar → solo validar si se cambia
      errors.password = "La nueva contraseña debe tener al menos 6 caracteres.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ====== Handlers formulario ====== */

  const resetFormState = () => {
    setForm({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      isActive: true,
    });
    setFieldErrors({});
    setShowPassword(false);
    setSelectedUser(null);
  };

  const openCreate = () => {
    if (!isAdmin) {
      setError("Solo el usuario admin@admin.com puede crear nuevos usuarios.");
      return;
    }

    resetFormState();
    setIsFormOpen(true);
  };

  const openEdit = (user: User) => {
    if (!isAdmin) {
      setError("Solo el usuario admin@admin.com puede editar usuarios.");
      return;
    }

    setSelectedUser(user);
    setForm({
      id: (user as any).id ?? (user as any).userId,
      email: user.email,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    });
    setFieldErrors({});
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, type } = target;
    const value =
      type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // limpiar error del campo al escribir
    if (fieldErrors[name as keyof UserFormState]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  /**
   * Lógica principal de guardado.
   */
  const saveUser = async () => {
    if (saving) return;

    // Validación antes de tocar la API
    const isValid = validateForm();
    if (!isValid) return;

    setSaving(true);
    setError(null);

    try {
      if (form.id) {
        // ===== Update =====
        const payload: UpdateUserRequest = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          isActive: form.isActive,
        };
        if (form.password.trim()) payload.password = form.password;

        const updated = await usersService.update(form.id, payload);
        setUsers((prev) =>
          prev.map((u) =>
            ((u as any).id ?? (u as any).userId) ===
            ((updated as any).id ?? (updated as any).userId)
              ? updated
              : u
          )
        );
      } else {
        // ===== Create =====
        const emailNormalized = form.email.trim().toLowerCase();

        const exists = users.some(
          (u) => u.email.trim().toLowerCase() === emailNormalized
        );

        if (exists) {
          setError(
            "Ya existe un usuario registrado con este correo electrónico."
          );
          setSaving(false);
          return;
        }

        const payload: CreateUserRequest = {
          email: emailNormalized,
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          isActive: form.isActive,
        };

        await usersService.create(payload);
        await loadUsers(); // recargar lista desde backend
      }
      setIsFormOpen(false);
      resetFormState();
    } catch (e: any) {
      console.error(e);
      // error general amigable
      setError(
        "No pudimos guardar el usuario en este momento. " +
          "Verifica los datos e intenta de nuevo. Si el problema continúa, contacta al administrador."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveUser();
  };

  /* ====== Delete ====== */

  const openDelete = (user: User) => {
    if (!isAdmin) {
      setError("Solo el usuario admin@admin.com puede eliminar usuarios.");
      return;
    }

    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!isAdmin) {
      setError("Solo el usuario admin@admin.com puede eliminar usuarios.");
      return;
    }
    if (!selectedUser) return;

    setSaving(true);
    setError(null);
    try {
      const id = (selectedUser as any).id ?? (selectedUser as any).userId;
      await usersService.remove(id);
      setUsers((prev) =>
        prev.filter(
          (u) =>
            ((u as any).id ?? (u as any).userId) !==
            ((selectedUser as any).id ?? (selectedUser as any).userId)
        )
      );
      setIsDeleteOpen(false);
      setSelectedUser(null);
    } catch (e: any) {
      console.error(e);
      setError(
        "No pudimos eliminar el usuario en este momento. " +
          "Intenta de nuevo en unos minutos. Si el problema continúa, contacta al administrador del sistema."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ====== Actions de la tabla ====== */

  const handleTableAction = (action: string, row: User) => {
    if (!isAdmin) {
      setError(
        "Solo el usuario admin@admin.com puede editar o eliminar usuarios."
      );
      return;
    }

    if (isSelf(row) && (action === "edit" || action === "delete")) {
      setError(
        "No puedes editar ni eliminar tu propio usuario desde esta pantalla."
      );
      return;
    }

    if (action === "edit") return openEdit(row);
    if (action === "delete") return openDelete(row);
  };

  const showLoading = loading;
  const totalUsers = rows.length;

  /* =========================
     Render
  ========================== */

  return (
    <PageContainer
      title="Gestión de Usuarios"
      description="Administra las cuentas de acceso al sistema."
    >
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="text-xs sm:text-sm text-gray-500">
          {totalUsers > 0 ? (
            <>
              <span className="font-semibold text-gray-700">
                {totalUsers}
              </span>{" "}
              usuario{totalUsers === 1 ? "" : "s"} registrado
              {totalUsers === 1 ? "" : "s"}.
            </>
          ) : (
            "No hay usuarios registrados."
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative inline-flex">
            {showLoading && (
              <div className="absolute inset-0 rounded-lg bg-white/60 backdrop-blur-[1px]" />
            )}
            <Button
              variant="ghost"
              onClick={() => void loadUsers()}
              disabled={showLoading}
            >
              <ArrowPathIcon
                className={[
                  "w-4 h-4",
                  showLoading ? "animate-spin text-gray-600" : "",
                ].join(" ")}
              />
              {showLoading ? "Actualizando..." : "Refrescar"}
            </Button>
          </div>

          {isAdmin && (
            <Button onClick={openCreate} disabled={showLoading}>
              <PlusIcon className="w-4 h-4" />
              Nuevo usuario
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla / Skeleton / Empty */}
      {showLoading ? (
        <SkeletonTable />
      ) : rows.length === 0 ? (
        <EmptyState onRetry={() => void loadUsers()} />
      ) : (
        <ResponsiveTable
          title="Usuarios"
          data={rows}
          emptyMessage="No hay usuarios."
          showExport
          actions={
            isAdmin
              ? [
                  { label: "Editar usuario", value: "edit" },
                  { label: "Eliminar usuario", value: "delete" },
                ]
              : []
          }
          // ✅ Ocultar acciones para el usuario logueado
          rowActionsFilter={(row, actions) => (isSelf(row) ? [] : actions)}
          onActionClick={handleTableAction}
          columns={[
            {
              key: "email",
              label: "Email",
              align: "left",
              render: (_v: unknown, row: User) => (
                <div>
                  <div className="font-medium text-gray-900">
                    {row.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {row.firstName} {row.lastName}
                    {isSelf(row) && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        Tú
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: "isActive",
              label: "Estado",
              align: "left",
              render: (_v: unknown, row: User) => (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.isActive
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-gray-50 text-gray-500 border border-gray-200"
                  }`}
                >
                  {row.isActive ? "Activo" : "Inactivo"}
                </span>
              ),
            },
            {
              key: "createdAt",
              label: "Creado",
              align: "left",
              render: (_v: unknown, row: User) =>
                row.createdAt
                  ? new Date(row.createdAt).toLocaleString("es-DO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—",
            },
          ]}
        />
      )}

      {/* Modal formulario (crear / editar) */}
      <BaseModal
        isOpen={isFormOpen}
        onClose={() => {
          if (!saving) {
            setIsFormOpen(false);
            resetFormState();
          }
        }}
        closeOnBackdrop={false}
      >
        <ModalHeader
          title={form.id ? "Editar usuario" : "Nuevo usuario"}
          subtitle={
            form.id
              ? "Actualiza los datos del usuario seleccionado."
              : "Crea una nueva cuenta de acceso al sistema."
          }
          onClose={() => {
            if (!saving) {
              setIsFormOpen(false);
              resetFormState();
            }
          }}
        />

        <form
          onSubmit={handleSubmit}
          className="px-1 pb-2 space-y-4"
          // 🚫 Evitar autofill agresivo del navegador
          autoComplete="off"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className={`w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                  fieldErrors.firstName
                    ? "border-red-400 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                required
                autoComplete="off"
              />
              <p className="min-h-[14px] mt-1 text-[11px] text-red-600">
                {fieldErrors.firstName ?? ""}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Apellido
              </label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className={`w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                  fieldErrors.lastName
                    ? "border-red-400 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                required
                autoComplete="off"
              />
              <p className="min-h-[14px] mt-1 text-[11px] text-red-600">
                {fieldErrors.lastName ?? ""}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={`w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                fieldErrors.email
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              required
              disabled={!!form.id}
              // Truco para evitar que el navegador meta el email de login
              autoComplete={form.id ? "off" : "new-email"}
            />
            <p className="min-h-[14px] mt-1 text-[11px] text-red-600">
              {fieldErrors.email ?? ""}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Password{form.id ? " (dejar vacío para no cambiar)" : ""}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                className={`w-full rounded-lg border px-2 py-1.5 pr-9 text-sm focus:outline-none focus:ring-2 ${
                  fieldErrors.password
                    ? "border-red-400 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                required={!form.id}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-2 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="min-h-[14px] mt-1 text-[11px] text-red-600">
              {fieldErrors.password ?? ""}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="isActive"
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="isActive"
              className="text-xs sm:text-sm text-gray-700"
            >
              Usuario activo
            </label>
          </div>
        </form>

        <ModalFooter
          onCancel={() => {
            if (!saving) {
              setIsFormOpen(false);
              resetFormState();
            }
          }}
          onConfirm={() => {
            if (!saving) void saveUser();
          }}
          isLoading={saving}
          confirmDisabled={saving}
          confirmLabel={form.id ? "Guardar cambios" : "Crear usuario"}
        />
      </BaseModal>

      {/* Modal eliminar */}
      <BaseModal
        isOpen={isDeleteOpen && !!selectedUser}
        onClose={() => {
          if (!saving) setIsDeleteOpen(false);
        }}
        closeOnBackdrop={!saving}
      >
        <ModalHeader
          title="Eliminar usuario"
          subtitle="Esta acción no se puede deshacer."
          onClose={() => {
            if (!saving) setIsDeleteOpen(false);
          }}
        />

        <div className="px-1 pb-2">
          <p className="text-sm text-gray-700 mb-2">
            ¿Seguro que deseas eliminar el usuario{" "}
            <span className="font-semibold">
              {selectedUser?.email ?? "seleccionado"}
            </span>
            ?
          </p>
          <p className="text-xs text-gray-500">
            Se eliminará el acceso al sistema para esta cuenta. Esta acción no
            se puede deshacer.
          </p>
        </div>

        <ModalFooter
          onCancel={() => {
            if (!saving) setIsDeleteOpen(false);
          }}
          onConfirm={() => {
            if (!saving) void confirmDelete();
          }}
          isLoading={saving}
          confirmDisabled={saving}
          confirmLabel="Eliminar usuario"
        />
      </BaseModal>

      {/* Toast de actualización */}
      {showLoading && (
        <div className="fixed bottom-4 right-4 px-3 py-2 rounded-lg bg-white/90 border border-gray-200 shadow-md flex items-center gap-2 backdrop-blur">
          <ArrowPathIcon className="w-4 h-4 animate-spin text-gray-600" />
          <span className="text-sm text-gray-700">
            Actualizando usuarios…
          </span>
        </div>
      )}
    </PageContainer>
  );
};

export default UsersPage;
