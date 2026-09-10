import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, FileText, History, Shield, User, Users, Lock, Sparkles, TrendingUp, CheckCircle2, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { AchievementBadge } from "../components/AchievementBadge";
import { NotificationBell } from "../components/NotificationBell";
export default function Dashboard() {
  const {
    user,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    completed: 0
  });
  const [showWelcome, setShowWelcome] = useState(true);
  
  useEffect(() => {
    // Fetch user statistics
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/checklists', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const allChecklists = data.checklists || [];

          // Filter checklists based on user role
          // Handle both boolean and 0/1 values from SQLite
          const isUserAdmin = user?.is_admin === true || user?.is_admin === 1;
          const userChecklists = isUserAdmin ? allChecklists : allChecklists.filter((c: any) => c.user_id === user?.id);

          // Calculate date for "this week" (last 7 days)
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          // Calculate statistics
          const total = userChecklists.length;
          const thisWeek = userChecklists.filter((c: any) => {
            const checklistDate = new Date(c.created_at);
            return checklistDate >= weekAgo;
          }).length;
          const completed = userChecklists.filter((c: any) => c.is_completed === 1 || c.is_completed === true).length;
          setStats({
            total,
            thisWeek,
            completed
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    if (user) {
      fetchStats();
    }

    // Hide welcome message after 5 seconds
    const timer = setTimeout(() => setShowWelcome(false), 5000);
    return () => clearTimeout(timer);
  }, [user]);
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };
  return <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
                           radial-gradient(circle at 40% 90%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)`
      }} />
      </div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src="/assets/logo-bombas-diesel-light.png" alt="Bombas Diesel" className="w-12 h-12 object-contain" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Bombas Diesel
                </h1>
                <p className="text-sm text-gray-600 font-medium">
                  {(user?.is_admin === true || user?.is_admin === 1) ? "🛡️ Painel Administrativo" : "⚡ Painel do Colaborador"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationBell />
              
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200/50 hover:border-blue-300 transition-all">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${(user?.is_admin === true || user?.is_admin === 1) ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'} shadow-lg`}>
                  {(user?.is_admin === true || user?.is_admin === 1) ? <Shield className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                </div>
                <div className="text-sm">
                  <p className="font-bold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">@{user?.username}</p>
                </div>
              </div>
              
              <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-3 text-gray-700 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all border-2 border-gray-200 hover:border-red-200 font-medium">
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      {showWelcome && <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 shadow-2xl transform hover:scale-[1.02] transition-all">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center animate-bounce">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Bem-vindo de volta, {user?.name}! 🎉</h2>
                  <p className="text-white/90 mt-1">Pronto para mais produtividade hoje?</p>
                </div>
              </div>
              <button onClick={() => setShowWelcome(false)} className="text-white/80 hover:text-white transition-colors">
                ✕
              </button>
            </div>
          </div>
        </div>}



      {/* Achievement Stats */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AchievementBadge type="count" value={stats.total} label="Checklists Total" animate={stats.total > 0 && stats.total % 10 === 0} />
          <AchievementBadge type="streak" value={stats.thisWeek} label="Esta Semana" animate={stats.thisWeek > 0} />
          <AchievementBadge type="quality" value={stats.completed} label="Concluídos" animate={stats.completed > 0} />
        </div>
      </div>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-indigo-600" />
            Ações Rápidas
          </h3>
          <p className="text-gray-600">Escolha uma ação para começar</p>
        </div>

        <div className={`grid ${(user?.is_admin === true || user?.is_admin === 1) ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
          {/* Novo Checklist Card */}
          <button onClick={() => navigate('/checklist/new')} className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-2 border-blue-200/50 hover:border-blue-400 hover:shadow-2xl transition-all duration-500 hover:scale-[1.05] text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                Novo Checklist
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Iniciar um novo checklist de veículo ou maquinário com captura de fotos e assinaturas
              </p>
              <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                Começar agora →
              </div>
            </div>
          </button>

          {/* Histórico Card */}
          <button onClick={() => navigate('/history')} className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-2 border-emerald-200/50 hover:border-emerald-400 hover:shadow-2xl transition-all duration-500 hover:scale-[1.05] text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-3xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                <History className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors">
                {(user?.is_admin === true || user?.is_admin === 1) ? "Todos os Checklists" : "Meu Histórico"}
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {(user?.is_admin === true || user?.is_admin === 1) ? "Visualizar e filtrar todos os checklists registrados no sistema" : "Visualizar checklists que você registrou anteriormente"}
              </p>
              <div className="mt-4 flex items-center text-emerald-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                Ver histórico →
              </div>
            </div>
          </button>

          {/* Third Card - Admin Users Management, Reception Dashboard, or All History */}
          {(user?.is_admin === true || user?.is_admin === 1) ? <button onClick={() => navigate('/users')} className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-2 border-purple-200/50 hover:border-purple-400 hover:shadow-2xl transition-all duration-500 hover:scale-[1.05] text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-fuchsia-600 to-pink-600 rounded-3xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
                  Gerenciar Usuários
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Visualizar, editar e gerenciar todos os colaboradores do sistema
                </p>
                <div className="mt-4 flex items-center text-purple-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Gerenciar →
                </div>
              </div>
            </button> : user?.role === 'recepcao' ? <button onClick={() => navigate('/reception-dashboard')} className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-2 border-pink-200/50 hover:border-pink-400 hover:shadow-2xl transition-all duration-500 hover:scale-[1.05] text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-rose-600 to-purple-600 rounded-3xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-pink-600 transition-colors">
                  Painel Recepção
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Gerencie a abertura de O.S. para veículos e maquinários que chegaram
                </p>
                <div className="mt-4 flex items-center text-pink-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Acessar →
                </div>
              </div>
            </button> : <button onClick={() => navigate('/all-history')} className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-2 border-amber-200/50 hover:border-amber-400 hover:shadow-2xl transition-all duration-500 hover:scale-[1.05] text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 rounded-3xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
                  Todos os Históricos
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Visualizar checklists de todos os colaboradores para mostrar aos clientes
                </p>
                <div className="mt-4 flex items-center text-amber-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Explorar →
                </div>
              </div>
            </button>}

          {/* Fourth Card - Reception Dashboard for Admin */}
          {(user?.is_admin === true || user?.is_admin === 1) && <button onClick={() => navigate('/reception-dashboard')} className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-2 border-pink-200/50 hover:border-pink-400 hover:shadow-2xl transition-all duration-500 hover:scale-[1.05] text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-rose-600 to-purple-600 rounded-3xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-pink-600 transition-colors">
                  Painel Recepção
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Visualizar e gerenciar abertura de O.S. dos veículos e maquinários
                </p>
                <div className="mt-4 flex items-center text-pink-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Acessar →
                </div>
              </div>
            </button>}
        </div>

        {/* Fleet Module */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <Truck className="w-6 h-6 text-emerald-600" />
            Módulo de Frotas
          </h3>
          <button onClick={() => navigate('/fleet')} className="group w-full flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl shadow-lg hover:shadow-xl border-2 border-emerald-200/50 hover:border-emerald-400 transition-all hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900 text-lg">Checklist de Frotas</h3>
                <p className="text-sm text-gray-600">Vistoria de entrada e saída de veículos da frota</p>
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-600 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>

        {/* Additional Options */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <Lock className="w-6 h-6 text-indigo-600" />
            Configurações
          </h3>
          <div className="space-y-4">
            <button onClick={() => navigate('/change-password')} className="group w-full flex items-center justify-between bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl border-2 border-amber-200/50 hover:border-amber-400 transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-900 text-lg">Alterar Senha</h3>
                  <p className="text-sm text-gray-600">Mantenha sua conta segura</p>
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-amber-600 group-hover:translate-x-2 transition-transform" />
            </button>

          </div>
        </div>

        {/* Admin Badge */}
        {(user?.is_admin === true || user?.is_admin === 1) && <div className="mt-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 text-white">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center animate-pulse">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">🛡️ Privilégios de Administrador</h3>
                <p className="text-white/90">
                  Você tem acesso completo ao sistema, incluindo visualização de todos os checklists e relatórios
                </p>
              </div>
            </div>
          </div>}
      </main>
    </div>;
}