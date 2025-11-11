/* eslint-disable no-empty */
// Registro central para limpiar TODAS las cachés de la app.
// Cualquier servicio/ctx puede registrarse y será limpiado al volver tras larga inactividad.

type ClearFn = () => void;

const registry = new Set<ClearFn>();

export const registerCache = (fn: ClearFn) => {
  registry.add(fn);
  return () => registry.delete(fn);
};

export const resetAllCaches = () => {
  for (const fn of Array.from(registry)) {
    try { fn(); } catch {}
  }
};
