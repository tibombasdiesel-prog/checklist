import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Car, Eye, Shield, Cog, Search, PlayCircle, Trash2 } from 'lucide-react';
import { useChecklists } from '../hooks/useChecklists';
import { useAuth } from '../contexts/AuthContext';

export default function AllHistory() {
  const navigate = useNavigate();
  const { checklists: allChecklists, loading, refetch } = useChecklists();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter checklists based on search query
  const checklists = allChecklists.filter((checklist) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const licensePlate = (checklist.license_plate || '').toLowerCase();
    const brandModel = (checklist.brand_model || '').toLowerCase();
    const identifier = (checklist.equipment_identifier || '').toLowerCase();
    
    return licensePlate.includes(query) || 
           brandModel.includes(query) || 
           identifier.includes(query);
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  // Determine which step to continue from based on checklist data
  const getContinueRoute = (checklist: any) => {
    const photoCount = checklist.photo_count || 0;
    const videoCount = checklist.video_count || 0;
    
    // If no photos, continue to photos step
    if (photoCount === 0) {
      return `/checklist/${checklist.id}/photos`;
    }
    
    // If photos exist but no video, continue to video step
    if (videoCount === 0) {
      return `/checklist/${checklist.id}/video`;
    }
    
    // If both photos and video exist, continue to signatures
    return `/checklist/${checklist.id}/signatures`;
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/checklists/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete checklist');
      
      // Refresh the list
      await refetch();
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting checklist:', error);
      alert('Erro ao excluir checklist');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 safe-area-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </button>
          <img 
            src="/assets/logo-bombas-diesel-light.png" 
            alt="Bombas Diesel" 
            className="h-10 object-contain"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Todos os Históricos</h1>
            </div>
            <p className="text-emerald-100">
              Visualize todos os checklists de veículos e maquinários registrados
            </p>
          </div>

          <div className="p-6">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por placa, modelo ou marca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
              {searchQuery && (
                <p className="mt-2 text-sm text-gray-600">
                  {checklists.length} resultado(s) encontrado(s)
                </p>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Carregando...</div>
              </div>
            ) : checklists.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  {searchQuery 
                    ? `Nenhum checklist encontrado para "${searchQuery}"`
                    : 'Nenhum checklist encontrado'
                  }
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {checklists.map((checklist) => {
                  const isMachinery = checklist.equipment_category === 'machinery';
                  
                  return (
                    <div
                      key={checklist.id}
                      className={`border-2 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer ${
                        isMachinery 
                          ? 'border-orange-200 hover:border-orange-400' 
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                      onClick={() => navigate(`/checklist/${checklist.id}/view`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {isMachinery ? (
                              <Cog className="w-6 h-6 text-orange-600" />
                            ) : (
                              <Car className="w-6 h-6 text-emerald-600" />
                            )}
                            <h3 className="text-xl font-semibold text-gray-900">
                              {checklist.brand_model}
                            </h3>
                            {checklist.license_plate ? (
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                {checklist.license_plate}
                              </span>
                            ) : checklist.equipment_identifier ? (
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                {checklist.equipment_identifier}
                              </span>
                            ) : null}
                            {isMachinery && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                Maquinário
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">Data:</span> {formatDate(checklist.created_at)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              <span className="font-medium">Colaborador:</span> {checklist.user_name}
                              {checklist.user_id === user?.id && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                  Você
                                </span>
                              )}
                            </div>
                            {checklist.odometer !== null && checklist.odometer !== undefined && (
                              <div className="flex items-center gap-2">
                                {isMachinery ? (
                                  <Cog className="w-4 h-4" />
                                ) : (
                                  <Car className="w-4 h-4" />
                                )}
                                <span className="font-medium">{isMachinery ? 'Horímetro:' : 'Quilometragem:'}</span> 
                                {checklist.odometer.toLocaleString('pt-BR')} {isMachinery ? 'h' : 'km'}
                              </div>
                            )}
                            {checklist.os_ready !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Status O.S.:</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  checklist.os_ready ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {checklist.os_ready ? '✓ Pronto' : 'Pendente'}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                checklist.vehicle_type === 'light'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {isMachinery 
                                ? (checklist.vehicle_type === 'light' ? 'Maquinário Leve' : 'Maquinário Pesado')
                                : (checklist.vehicle_type === 'light' ? 'Veículo Leve' : 'Veículo Pesado')
                              }
                            </span>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                checklist.is_completed
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {checklist.is_completed ? '✓ Concluído' : '⚠ Em Andamento'}
                            </span>
                          </div>
                        </div>

                        <div className="ml-4 flex gap-2">
                          {!checklist.is_completed && checklist.user_id === user?.id && (
                            <button
                              className="p-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(getContinueRoute(checklist));
                              }}
                              title="Continuar checklist"
                            >
                              <PlayCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            className={`p-3 rounded-lg transition-colors ${
                              isMachinery 
                                ? 'bg-orange-50 hover:bg-orange-100 text-orange-600' 
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/checklist/${checklist.id}/view`);
                            }}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-600 rounded-lg transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(checklist.id);
                            }}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {checklist.initial_observations && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Observações:</span> {checklist.initial_observations}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteId !== null && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-gray-200 shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Exclusão</h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir este checklist? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
