import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Truck, 
  Plus, 
  History, 
  BarChart3, 
  ArrowLeft,
  LogOut,
  LogIn,
  ClipboardCheck,
  Car
} from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';

export default function FleetDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [checklistTypeModal, setChecklistTypeModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const startNewChecklist = (type: 'saida' | 'entrada') => {
    setChecklistTypeModal(false);
    navigate(`/fleet/checklist/new?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Frotas</h1>
                  <p className="text-xs text-slate-400">Checklist de Veículos</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Olá, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-slate-400">
            Gerencie os checklists de entrada e saída dos veículos da frota
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* New Checklist Card */}
          <button
            onClick={() => setChecklistTypeModal(true)}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-left transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/20"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Novo Checklist</h3>
              <p className="text-emerald-100/80 text-sm">
                Iniciar vistoria de saída ou entrada de veículo
              </p>
            </div>
          </button>

          {/* History Card */}
          <button
            onClick={() => navigate('/fleet/history')}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-6 text-left border border-slate-600 transition-all hover:scale-[1.02] hover:border-emerald-500/50"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-slate-600/50 rounded-xl flex items-center justify-center mb-4">
                <History className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Histórico</h3>
              <p className="text-slate-400 text-sm">
                Ver vistorias realizadas e gerar PDFs
              </p>
            </div>
          </button>
        </div>

        {/* Stats Card */}
        <button
          onClick={() => navigate('/fleet/stats')}
          className="w-full group relative overflow-hidden rounded-2xl bg-slate-800/50 p-6 text-left border border-slate-700 transition-all hover:border-emerald-500/50 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Dashboard de Estatísticas</h3>
              <p className="text-slate-400 text-sm">
                Vistorias realizadas, veículos com mais ocorrências, tipos de avarias
              </p>
            </div>
          </div>
        </button>

        {/* Vehicle Management Card */}
        <button
          onClick={() => navigate('/fleet/vehicles')}
          className="w-full group relative overflow-hidden rounded-2xl bg-slate-800/50 p-6 text-left border border-slate-700 transition-all hover:border-emerald-500/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
              <Car className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Gerenciar Veículos</h3>
              <p className="text-slate-400 text-sm">
                Cadastre, edite e visualize os veículos da frota
              </p>
            </div>
          </div>
        </button>

        {/* Info Section */}
        <div className="mt-8 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-white mb-1">Como funciona</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• <strong className="text-emerald-400">Saída:</strong> Registre o estado do veículo ao sair</li>
                <li>• <strong className="text-emerald-400">Entrada:</strong> Registre o estado ao retornar</li>
                <li>• Marque avarias diretamente nas imagens do veículo</li>
                <li>• Gere PDF da vistoria a qualquer momento</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Checklist Type Modal */}
      {checklistTypeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 text-center">
              Tipo de Vistoria
            </h3>
            <p className="text-slate-400 text-sm text-center mb-6">
              Selecione o tipo de checklist que deseja realizar
            </p>

            <div className="space-y-3">
              <button
                onClick={() => startNewChecklist('saida')}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-600/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl hover:border-emerald-500 transition-all group"
              >
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-left">
                  <h4 className="text-white font-semibold">Saída do Veículo</h4>
                  <p className="text-slate-400 text-sm">Registrar estado antes de sair</p>
                </div>
              </button>

              <button
                onClick={() => startNewChecklist('entrada')}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-600/20 to-blue-600/10 border border-blue-500/30 rounded-xl hover:border-blue-500 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <LogIn className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <h4 className="text-white font-semibold">Entrada do Veículo</h4>
                  <p className="text-slate-400 text-sm">Registrar estado ao retornar</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setChecklistTypeModal(false)}
              className="w-full mt-4 py-3 text-slate-400 hover:text-white transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
