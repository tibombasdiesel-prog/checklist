import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Car, Eye, CheckCircle2, Clock, AlertCircle, Cog } from 'lucide-react';
import { useChecklists } from '../hooks/useChecklists';
import { useState } from 'react';
import { NotificationBell } from '../components/NotificationBell';

export default function ReceptionDashboard() {
  const navigate = useNavigate();
  const { checklists, loading, refetch } = useChecklists();
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Filter to show only completed checklists
  const completedChecklists = checklists.filter(c => c.is_completed);

  // Separate into pending and processed
  const pendingChecklists = completedChecklists.filter(c => !c.os_ready);
  const processedChecklists = completedChecklists.filter(c => c.os_ready);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleMarkAsProcessed = async (checklistId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setProcessingId(checklistId);
    try {
      const response = await fetch(`/api/checklists/${checklistId}/os-ready`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao processar checklist');
      }

      // Refetch to update the list
      await refetch();
    } catch (error) {
      console.error('Erro ao processar checklist:', error);
      alert(error instanceof Error ? error.message : 'Erro ao processar checklist');
    } finally {
      setProcessingId(null);
    }
  };

  const renderChecklistCard = (checklist: any, isPending: boolean) => {
    const isMachinery = checklist.equipment_category === 'machinery';
    
    return (
      <div
        key={checklist.id}
        className={`border-2 rounded-xl p-6 transition-all cursor-pointer ${
          isPending
            ? 'border-amber-300 bg-amber-50 hover:border-amber-400 hover:shadow-lg'
            : 'border-green-300 bg-green-50 hover:border-green-400 hover:shadow-lg'
        }`}
        onClick={() => navigate(`/checklist/${checklist.id}/view`)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {isMachinery ? (
                <Cog className={`w-6 h-6 ${isPending ? 'text-orange-600' : 'text-green-600'}`} />
              ) : (
                <Car className={`w-6 h-6 ${isPending ? 'text-amber-600' : 'text-green-600'}`} />
              )}
              <h3 className="text-xl font-bold text-gray-900">
                {checklist.brand_model}
              </h3>
              {checklist.license_plate ? (
                <span className="px-3 py-1 bg-white border-2 border-blue-300 text-blue-700 rounded-full text-sm font-bold">
                  {checklist.license_plate}
                </span>
              ) : checklist.equipment_identifier ? (
                <span className="px-3 py-1 bg-white border-2 border-orange-300 text-orange-700 rounded-full text-sm font-bold">
                  {checklist.equipment_identifier}
                </span>
              ) : null}
              {isMachinery && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  Maquinário
                </span>
              )}
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                #{checklist.id}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Registrado:</span> {formatDate(checklist.created_at)}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Colaborador:</span> {checklist.user_name}
              </div>
              {checklist.odometer !== null && checklist.odometer !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{isMachinery ? 'Horímetro:' : 'Km:'}</span> 
                  {checklist.odometer.toLocaleString('pt-BR')} {isMachinery ? 'h' : 'km'}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-medium">Tipo:</span> 
                {isMachinery 
                  ? (checklist.vehicle_type === 'light' ? 'Maquinário Leve' : 'Maquinário Pesado')
                  : (checklist.vehicle_type === 'light' ? 'Veículo Leve' : 'Veículo Pesado')
                }
              </div>
            </div>

            {/* Status Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-xl mb-4 ${
              isPending
                ? 'bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300'
                : 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300'
            }`}>
              {isPending ? (
                <>
                  <div className="p-2 bg-amber-500 rounded-full">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-amber-900 text-lg">AGUARDANDO ABERTURA DE O.S.</p>
                    <p className="text-sm text-amber-700">Clique no botão para marcar como processado</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 bg-green-500 rounded-full">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-green-900 text-lg">✓ ABERTURA DE O.S. CONCLUÍDA</p>
                    <p className="text-sm text-green-700">O.S. foi aberta e está em processamento</p>
                  </div>
                </>
              )}
            </div>

            {checklist.initial_observations && (
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Observações:</span> {checklist.initial_observations}
                </p>
              </div>
            )}
          </div>

          <div className="ml-4 flex flex-col gap-2">
            <button
              className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/checklist/${checklist.id}/view`);
              }}
              title="Visualizar Detalhes"
            >
              <Eye className="w-5 h-5" />
            </button>
            
            {isPending && (
              <button
                className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => handleMarkAsProcessed(checklist.id, e)}
                disabled={processingId === checklist.id}
                title="Marcar como Processado"
              >
                {processingId === checklist.id ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-4 safe-area-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar ao Dashboard
          </button>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <img 
              src="/assets/logo-bombas-diesel-light.png" 
              alt="Bombas Diesel" 
              className="h-10 object-contain"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Painel da Recepção</h1>
            </div>
            <p className="text-purple-100">
              Gerencie a abertura de O.S. para os veículos e maquinários que chegaram
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gray-50 border-b-2 border-gray-200">
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{completedChecklists.length}</p>
                  <p className="text-sm text-gray-600">Total de Checklists</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-amber-300 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-900">{pendingChecklists.length}</p>
                  <p className="text-sm text-amber-700">Aguardando Abertura</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-green-300 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900">{processedChecklists.length}</p>
                  <p className="text-sm text-green-700">O.S. Abertas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Carregando checklists...</p>
            </div>
          </div>
        ) : completedChecklists.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <div className="text-center">
              <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-xl font-semibold mb-2">Nenhum checklist aguardando</p>
              <p className="text-gray-500">Quando colaboradores concluírem checklists, eles aparecerão aqui</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending Checklists Section */}
            {pendingChecklists.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Aguardando Abertura de O.S. ({pendingChecklists.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {pendingChecklists.map((checklist) => renderChecklistCard(checklist, true))}
                </div>
              </div>
            )}

            {/* Processed Checklists Section */}
            {processedChecklists.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    O.S. Abertas ({processedChecklists.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {processedChecklists.map((checklist) => renderChecklistCard(checklist, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
