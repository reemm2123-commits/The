import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;
export const api = axios.create({ baseURL: API, withCredentials: true });

let refreshing = null;
export const refreshSession = () => {
  refreshing = refreshing || api.post("/auth/refresh").finally(() => { refreshing = null; });
  return refreshing;
};

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config;
    if (error.response?.status === 401 && cfg && !cfg._retry && !cfg.url.startsWith("/auth/")) {
      cfg._retry = true;
      try {
        await refreshSession();
        return api(cfg);
      } catch (_) { /* fall through */ }
    }
    return Promise.reject(error);
  }
);

export function errorCode(e) {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg).filter(Boolean).join(" ");
  return "default";
}

export const postAction = (url, body) =>
  api.post(url, body).catch((e) => (e?.response?.status === 409 ? api.post(url, body) : Promise.reject(e)));
