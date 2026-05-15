import axios from "axios";

import { clearApiKey, getApiKey } from "../lib/apiKey";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
});

// Injeta o X-API-Key automaticamente em toda request que tiver uma key salva.
api.interceptors.request.use((config) => {
  const key = getApiKey();
  if (key) {
    config.headers.set("X-API-Key", key);
  }
  return config;
});

// Se o backend responder 401 com uma key salva, limpa (provavelmente expirou/errada).
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && getApiKey()) {
      clearApiKey();
    }
    return Promise.reject(error);
  },
);
