import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [isAdminRegister, setIsAdminRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    adminPin: "",
    role: "colaborador" as "colaborador" | "recepcao",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        // Validation
        if (!formData.name.trim()) {
          setError("Nome é obrigatório");
          setLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError("As senhas não coincidem");
          setLoading(false);
          return;
        }

        if (isAdminRegister && formData.adminPin !== "2233") {
          setError("PIN administrativo incorreto");
          setLoading(false);
          return;
        }

        const result = await register({
          name: formData.name,
          username: formData.username,
          password: formData.password,
          role: !isAdminRegister ? formData.role : undefined,
          adminPin: isAdminRegister ? formData.adminPin : undefined,
        });

        if (result.success) {
          navigate("/dashboard");
        } else {
          setError(result.error || "Erro ao criar conta");
        }
      } else {
        const result = await login({
          username: formData.username,
          password: formData.password,
        });

        if (result.success) {
          navigate("/dashboard");
        } else {
          setError(result.error || "Erro ao fazer login");
        }
      }
    } catch (err) {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/assets/logo-bombas-diesel-light.png" 
                alt="Bombas Diesel Bom Despacho" 
                className="h-24 w-24 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-1">Bombas Diesel</h1>
            <p className="text-blue-100 text-sm text-center">
              {isRegister 
                ? (isAdminRegister ? "Criar conta administrativa" : "Criar nova conta")
                : "Sistema de Checklist de Veículos"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Digite seu nome"
                    required
                  />
                </div>

                {!isAdminRegister && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cargo
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as "colaborador" | "recepcao" })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
                      required
                    >
                      <option value="colaborador">Colaborador</option>
                      <option value="recepcao">Recepção</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.role === 'colaborador' 
                        ? 'Cria e gerencia checklists de veículos' 
                        : 'Visualiza todos os checklists e marca como "Pronto"'}
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRegister ? "Nome de Usuário" : "Usuário"}
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder={isRegister ? "Escolha um nome de usuário" : "Digite seu usuário"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Digite sua senha"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Confirme sua senha"
                  required
                />
              </div>
            )}

            {isRegister && isAdminRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PIN Administrativo
                </label>
                <input
                  type="password"
                  value={formData.adminPin}
                  onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Digite o PIN administrativo"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Necessário para criar uma conta de administrador
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processando..." : (isRegister ? "Criar Conta" : "Entrar")}
            </button>

            {/* Toggle buttons */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              {!isRegister ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setIsAdminRegister(false);
                      setError("");
                    }}
                    className="w-full text-sm text-gray-600 hover:text-blue-600 transition"
                  >
                    Não tem cadastro? <span className="font-semibold">Cadastre-se</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setIsAdminRegister(true);
                      setError("");
                    }}
                    className="w-full text-sm text-gray-600 hover:text-indigo-600 transition"
                  >
                    Criar conta <span className="font-semibold">Administrativa</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setIsAdminRegister(false);
                    setError("");
                  }}
                  className="w-full text-sm text-gray-600 hover:text-blue-600 transition"
                >
                  Já tem conta? <span className="font-semibold">Fazer login</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Sistema de Checklist de Veículos
        </p>
      </div>
    </div>
  );
}
