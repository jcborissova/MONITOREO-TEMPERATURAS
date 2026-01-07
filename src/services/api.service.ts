/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { API_CONFIG } from "../config/api.config";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry con backoff exponencial + jitter (sin perder error.response) */
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelay?: number } = {}
): Promise<T> {
  const { retries = 2, baseDelay = 400 } = opts;
  let lastError: any;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      const status = err?.response?.status;

      // No reintentar 4xx (excepto timeout 408)
      if (status && status < 500 && status !== 408) break;

      // No reintentar si fue cancelado
      if (err?.name === "CanceledError" || err?.name === "AbortError") break;

      const delay = Math.round(
        baseDelay * Math.pow(1.7, i) + Math.random() * 150
      );

      await sleep(delay);
    }
  }

  throw lastError;
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

    /** Inject Token */
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem("access_token");
      if (token) {
        if (!config.headers) {
          config.headers = new AxiosHeaders();
        } else if (!(config.headers instanceof AxiosHeaders)) {
          config.headers = new AxiosHeaders(config.headers);
        }

        (config.headers as AxiosHeaders).set(
          "Authorization",
          `Bearer ${token}`
        );
      }
      return config;
    });

    /** Manejo centralizado de 401 */
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status = error?.response?.status;
        const url = error?.config?.url ?? "";
        const pathname = window.location?.pathname || "";

        const isUsersEndpoint = url.includes("/users");
        const isOnLogin = pathname === "/login";

        // Redirigir solo si:
        // - es 401 real de API
        // - NO es endpoint de users
        // - NO estoy ya en /login (evita recarga visual molesta)
        if (status === 401 && !isUsersEndpoint && !isOnLogin) {
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
        params: config?.params,
        headers: config?.headers,
        timeout: config?.timeout ?? this.api.defaults.timeout,
        responseType: config?.responseType,
        signal: config?.signal,
        onUploadProgress: config?.onUploadProgress,
        onDownloadProgress: config?.onDownloadProgress,
      });

    const res: AxiosResponse<T> = await withRetry(exec, {
      retries: config?.["x-retries"],
      baseDelay: config?.["x-retryDelay"],
    });

    return res.data;
  }

  get<T>(
    url: string,
    config?: AxiosRequestConfig & { "x-retries"?: number; "x-retryDelay"?: number }
  ) {
    return this.request<T>("get", url, config);
  }

  post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & { "x-retries"?: number; "x-retryDelay"?: number }
  ) {
    return this.request<T>("post", url, config, data);
  }

  put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & { "x-retries"?: number; "x-retryDelay"?: number }
  ) {
    return this.request<T>("put", url, config, data);
  }

  patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & { "x-retries"?: number; "x-retryDelay"?: number }
  ) {
    return this.request<T>("patch", url, config, data);
  }

  delete<T>(
    url: string,
    config?: AxiosRequestConfig & { "x-retries"?: number; "x-retryDelay"?: number }
  ) {
    return this.request<T>("delete", url, config);
  }
}

export default new ApiService();
