/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
  AxiosHeaders,
} from "axios";
import { API_CONFIG } from "../config/api.config";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry con backoff exponencial + jitter para errores transitorios/timeouts */
async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 2,
    baseDelay = 400,
  }: { retries?: number; baseDelay?: number } = {}
): Promise<T> {
  let err: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      err = e;
      const status = (e as AxiosError)?.response?.status;

      // No reintentar si fue cancelado/abortado o errores 4xx (excepto 408)
      if (e?.name === "CanceledError" || e?.name === "AbortError") throw e;
      if (status && status !== 408 && status < 500) throw e;

      // Backoff + jitter
      const delay = Math.round(
        baseDelay * Math.pow(1.7, i) + Math.random() * 150
      );
      await sleep(delay);
    }
  }
  throw err;
}

let redirecting = false;

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
    });

    // Request: agrega JWT automáticamente sin romper el tipo AxiosHeaders
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
          // Asegurar que config.headers sea AxiosHeaders
          if (!config.headers) {
            config.headers = new AxiosHeaders();
          } else if (!(config.headers instanceof AxiosHeaders)) {
            config.headers = new AxiosHeaders(config.headers);
          }
          // Mutar, no reasignar con objeto
          (config.headers as AxiosHeaders).set(
            "Authorization",
            `Bearer ${token}`
          );
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response: 401 -> redirect a login (evita bucles)
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const url: string = error?.config?.url ?? "";

        const isUsersEndpoint =
          typeof url === "string" && url.includes("/users");

        // 401 real → token inválido (pero dejamos pasar los 401 de /users
        // para que el front los maneje con mensaje amigable, ej. API Key)
        if (status === 401 && !isUsersEndpoint) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          if (!redirecting) {
            redirecting = true;
            window.location.href = "/login";
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async request<T>(
    method: "get" | "post" | "put" | "patch" | "delete",
    url: string,
    config?: AxiosRequestConfig & {
      "x-retries"?: number;
      "x-retryDelay"?: number;
    },
    data?: any
  ): Promise<T> {
    const exec = () =>
      this.api.request<T>({
        method,
        url,
        data,
        timeout: config?.timeout ?? this.api.defaults.timeout,
        signal: config?.signal,
        params: config?.params,
        headers: config?.headers, // puedes seguir pasando headers aquí
        onDownloadProgress: config?.onDownloadProgress,
        onUploadProgress: config?.onUploadProgress,
        responseType: config?.responseType,
      });

    const res: AxiosResponse<T> = await withRetry(exec, {
      retries: config?.["x-retries"] ?? 2,
      baseDelay: config?.["x-retryDelay"] ?? 400,
    });
    return res.data;
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig & {
      "x-retries"?: number;
      "x-retryDelay"?: number;
    }
  ): Promise<T> {
    return this.request<T>("get", url, config);
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & {
      "x-retries"?: number;
      "x-retryDelay"?: number;
    }
  ): Promise<T> {
    return this.request<T>("post", url, config, data);
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & {
      "x-retries"?: number;
      "x-retryDelay"?: number;
    }
  ): Promise<T> {
    return this.request<T>("put", url, config, data);
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & {
      "x-retries"?: number;
      "x-retryDelay"?: number;
    }
  ): Promise<T> {
    return this.request<T>("patch", url, config, data);
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig & {
      "x-retries"?: number;
      "x-retryDelay"?: number;
    }
  ): Promise<T> {
    return this.request<T>("delete", url, config);
  }
}

export default new ApiService();
