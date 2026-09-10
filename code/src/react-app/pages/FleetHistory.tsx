import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, User, Eye, Search, Truck, LogIn, LogOut, Trash2 } from 'lucide-react';

interface FleetChecklist {
  id: number;
  user_id: string;
  checklist_type: string;
  driver_name: string;
  inspection_date: string;
  vehicle_id: number;
  license_plate: string;
  model: string;
  company: string;
  km_initial: number | null;
  km_final: number | null;
  interior_clean_approved: boolean | number | null;
  left_side_photo_key: string | null;
  right_side_photo_key: string | null;
  front_photo_key: string | null;
  rear_photo_key: string | null;
  interior_photo_key: string | null;
  created_at: string;
  updated_at: string;
}

export default function FleetHistory() {
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState<FleetChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchChecklists();
  }, []);

  const fetchChecklists = async () => {
    try {
      const response = await fetch('/api/fleet-checklists');
      if (!response.ok) throw new Error('Failed to fetch checklists');
      
      const data = await response.json();
      setChecklists(data.checklists || []);
    } catch (error) {
      console.error('Error fetching fleet checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter checklists based on search query
  const filteredChecklists = checklists.filter((checklist) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const licensePlate = (checklist.license_plate || '').toLowerCase();
    const model = (checklist.model || '').toLowerCase();
    const driver = (checklist.driver_name || '').toLowerCase();
    const company = (checklist.company || '').toLowerCase();
    
    return licensePlate.includes(query) || 
           model.includes(query) ||
           driver.includes(query) || 
           company.includes(query);
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/fleet-checklists/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete checklist');
      
      // Remove from local state
      setChecklists(checklists.filter(c => c.id !== id));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting checklist:', error);
      alert('Erro ao excluir checklist');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 safe-area-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/fleet')}
            className="flex items-center text-slate-300 hover:text-white"
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

        <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Histórico de Frotas</h1>
            </div>
            <p className="text-emerald-100">
              Visualize todos os checklists de entrada e saída de veículos
            </p>
          </div>

          <div className="p-6">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por veículo, motorista ou empresa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border-2 border-slate-600 text-white placeholder-slate-400 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              {searchQuery && (
                <p className="mt-2 text-sm text-slate-400">
                  {filteredChecklists.length} resultado(s) encontrado(s)
                </p>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-slate-400">Carregando...</div>
              </div>
            ) : filteredChecklists.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">
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
                {filteredChecklists.map((checklist) => {
                  const isEntrada = checklist.checklist_type === 'entrada';
                  const mainPhotoKey = checklist.left_side_photo_key || 
                                      checklist.front_photo_key || 
                                      checklist.right_side_photo_key || 
                                      checklist.rear_photo_key;
                  
                  return (
                    <div
                      key={checklist.id}
                      className="border-2 border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer bg-slate-800/50"
                      onClick={() => navigate(`/fleet/checklist/${checklist.id}/view`)}
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Vehicle Photo */}
                        {mainPhotoKey && (
                          <div className="md:w-64 h-48 md:h-auto bg-slate-900 flex-shrink-0">
                            <img
                              src={`/api/r2-assets/${mainPhotoKey}`}
                              alt={`${checklist.license_plate} - ${checklist.model}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Checklist Info */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                {isEntrada ? (
                                  <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <LogIn className="w-6 h-6 text-blue-400" />
                                  </div>
                                ) : (
                                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <LogOut className="w-6 h-6 text-emerald-400" />
                                  </div>
                                )}
                                <div>
                                  <h3 className="text-xl font-semibold text-white">
                                    {checklist.license_plate}
                                  </h3>
                                  <p className="text-sm text-slate-400">
                                    {checklist.model}
                                  </p>
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ml-auto ${
                                    isEntrada
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                  }`}
                                >
                                  {isEntrada ? 'Entrada' : 'Saída'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-300 mb-3">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-slate-400" />
                                  <span className="font-medium text-slate-400">Motorista:</span>
                                  <span>{checklist.driver_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  <span className="font-medium text-slate-400">Criado:</span>
                                  <span>{formatDate(checklist.created_at)}</span>
                                </div>
                                {(checklist.km_initial || checklist.km_final) && (
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium text-slate-400">KM:</span>
                                    <span>
                                      {checklist.km_initial 
                                        ? checklist.km_initial.toLocaleString('pt-BR')
                                        : checklist.km_final?.toLocaleString('pt-BR')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="ml-4 flex gap-2">
                              <button
                                className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/fleet/checklist/${checklist.id}/view`);
                                }}
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(checklist.id);
                                }}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
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
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Confirmar Exclusão</h3>
              <p className="text-slate-300 mb-6">
                Tem certeza que deseja excluir este checklist? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
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
