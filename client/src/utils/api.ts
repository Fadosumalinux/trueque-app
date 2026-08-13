const API = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("trueque_token");
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Error de conexión");
  }
  return data as T;
}

export const api = {
  auth: {
    register: (body: any) => request<any>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: any) => request<any>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request<any>("/auth/me"),
  },
  catalog: {
    zones: () => request<any[]>("/catalog/zones"),
    categories: () => request<any[]>("/catalog/categories"),
  },
  profile: {
    update: (body: any) => request<any>("/profile", { method: "PUT", body: JSON.stringify(body) }),
    verifyIdentity: (dni: string) => request<any>("/profile/verify-identity", { method: "POST", body: JSON.stringify({ dni }) }),
  },
  listings: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/listings${qs ? `?${qs}` : ""}`);
    },
    mine: () => request<any[]>("/listings/mine"),
    get: (id: string) => request<any>(`/listings/${id}`),
    create: (body: any) => request<any>("/listings", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/listings/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) => request<any>(`/listings/${id}`, { method: "DELETE" }),
  },
  discovery: {
    feed: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/discovery/feed${qs ? `?${qs}` : ""}`);
    },
    like: (listingId: string, direction: "like" | "pass") =>
      request<any>("/discovery/like", { method: "POST", body: JSON.stringify({ listingId, direction }) }),
    matches: () => request<any[]>("/discovery/matches"),
  },
  exchanges: {
    list: () => request<any[]>("/exchanges"),
    get: (id: string) => request<any>(`/exchanges/${id}`),
    create: (body: any) => request<any>("/exchanges", { method: "POST", body: JSON.stringify(body) }),
    accept: (id: string) => request<any>(`/exchanges/${id}/accept`, { method: "POST" }),
    complete: (id: string) => request<any>(`/exchanges/${id}/complete`, { method: "POST" }),
    cancel: (id: string) => request<any>(`/exchanges/${id}/cancel`, { method: "POST" }),
  },
  deliveries: {
    deliverers: () => request<any[]>("/deliveries/deliverers"),
    offer: (exchangeId: string, body: any) => request<any>(`/deliveries/${exchangeId}/offer`, { method: "POST", body: JSON.stringify(body) }),
    accept: (id: string) => request<any>(`/deliveries/${id}/accept`, { method: "POST" }),
    deliver: (id: string) => request<any>(`/deliveries/${id}/deliver`, { method: "POST" }),
  },
  reviews: {
    create: (body: any) => request<any>("/reviews", { method: "POST", body: JSON.stringify(body) }),
    user: (userId: string) => request<any[]>(`/reviews/user/${userId}`),
  },
  wallet: {
    get: () => request<any>("/wallet"),
  },
  notifications: {
    list: () => request<any[]>("/notifications"),
    readAll: () => request<any>("/notifications/read-all", { method: "POST" }),
  },
};
