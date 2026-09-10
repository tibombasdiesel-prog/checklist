/**
 * Interceptor global de fetch.
 * 1. Anexa o token de autenticação (Authorization: Bearer <token>) de forma transparente em todas as chamadas /api/*
 * 2. Em produção: redireciona chamadas /api/* para a URL do backend no Render (VITE_API_URL).
 */
const API_BASE = import.meta.env.VITE_API_URL || "";

const originalFetch = window.fetch.bind(window);

(window as any).fetch = (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  let isApiRoute = false;
  let targetInput: RequestInfo | URL = input;

  if (typeof input === "string") {
    if (input.startsWith("/api/")) {
      isApiRoute = true;
      targetInput = API_BASE ? API_BASE + input : input;
    }
  } else if (input instanceof URL) {
    if (input.pathname.startsWith("/api/")) {
      isApiRoute = true;
      targetInput = API_BASE ? new URL(input.pathname + input.search, API_BASE) : input;
    }
  } else if (typeof input === "object" && input !== null && "url" in input) {
    const reqUrl = (input as Request).url;
    if (reqUrl.includes("/api/")) {
      isApiRoute = true;
    }
  }

  // Se for rota de API, anexar cabeçalho de autorização se o token existir
  if (isApiRoute) {
    const token = localStorage.getItem("checklist_token");
    if (token) {
      const headers = new Headers(init?.headers);
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      init = { ...init, headers };
    }
  }

  return originalFetch(targetInput, init);
};

export {};
