/**
 * Interceptor global de fetch para produção.
 * Em desenvolvimento: as chamadas /api/* são proxiadas pelo Vite para localhost:3001.
 * Em produção: as chamadas /api/* são redirecionadas para a URL do Render (VITE_API_URL).
 */
const API_BASE = import.meta.env.VITE_API_URL || "";

if (API_BASE) {
  const originalFetch = window.fetch.bind(window);
  (window as any).fetch = (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return originalFetch(API_BASE + input, init);
    }
    if (input instanceof URL && input.pathname.startsWith("/api/")) {
      const newUrl = new URL(input.pathname + input.search, API_BASE);
      return originalFetch(newUrl.toString(), init);
    }
    return originalFetch(input, init);
  };
}

export {};
