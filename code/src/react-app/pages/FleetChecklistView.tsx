import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Download, LogIn, LogOut, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { generateFleetChecklistPDF } from '../utils/generateFleetChecklistPDF';

interface FleetChecklist {
  id: number;
  user_id: string;
  checklist_type: string;
  driver_name: string;
  inspection_date: string;
  vehicle: string;
  company: string;
  km_initial: number | null;
  km_final: number | null;
  interior_clean_approved: boolean | number | null;
  left_side_photo_key: string | null;
  right_side_photo_key: string | null;
  front_photo_key: string | null;
  rear_photo_key: string | null;
  interior_photo_key: string | null;
  general_condition: string;
  rear_lights: string;
  front_lights: string;
  safety_items: string;
  motor_items: string;
  observations: string;
  driver_signature_key: string | null;
  inspector_signature_key: string | null;
  created_at: string;
  updated_at: string;
}

interface DamageMark {
  id: number;
  checklist_id: number;
  vehicle_side: string;
  x_position: number;
  y_position: number;
  observation: string;
  photos?: Array<{
    id: number;
    damage_mark_id: number;
    r2_key: string;
  }>;
}

export default function FleetChecklistView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<FleetChecklist | null>(null);
  const [damageMarks, setDamageMarks] = useState<DamageMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSide, setSelectedSide] = useState<string | null>(null);

  useEffect(() => {
    fetchChecklist();
  }, [id]);

  const fetchChecklist = async () => {
    try {
      const response = await fetch(`/api/fleet-checklists/${id}`);
      if (!response.ok) throw new Error('Failed to fetch checklist');
      
      const data = await response.json();
      setChecklist(data.checklist);
      setDamageMarks(data.checklist.damageMarks || []);
    } catch (error) {
      console.error('Error fetching fleet checklist:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const parseJSON = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return {};
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/fleet-checklists/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete checklist');
      
      navigate('/fleet/history');
    } catch (error) {
      console.error('Error deleting checklist:', error);
      alert('Erro ao excluir checklist');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const StatusIcon = ({ ok, problems }: { ok: boolean; problems: boolean }) => {
    if (ok && !problems) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    if (problems) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-xl text-red-400">Checklist não encontrado</div>
      </div>
    );
  }

  const isEntrada = checklist.checklist_type === 'entrada';
  const generalState = parseJSON(checklist.general_condition);
  const rearLights = parseJSON(checklist.rear_lights);
  const frontLights = parseJSON(checklist.front_lights);
  const safety = parseJSON(checklist.safety_items);
  const motor = parseJSON(checklist.motor_items);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 safe-area-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/fleet/history')}
            className="flex items-center text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar ao Histórico
          </button>
          <img 
            src="/assets/logo-bombas-diesel-light.png" 
            alt="Bombas Diesel" 
            className="h-10 object-contain"
          />
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
          {/* Header */}
          <div className={`bg-gradient-to-r ${isEntrada ? 'from-blue-600 to-blue-700' : 'from-emerald-600 to-teal-600'} text-white p-6`}>
            <div className="flex items-center gap-4 mb-4">
              {isEntrada ? (
                <div className="p-3 bg-white/20 rounded-xl">
                  <LogIn className="w-8 h-8" />
                </div>
              ) : (
                <div className="p-3 bg-white/20 rounded-xl">
                  <LogOut className="w-8 h-8" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold">{checklist.vehicle}</h1>
                <p className="text-white/80">{checklist.company}</p>
              </div>
              <span className={`ml-auto px-4 py-2 rounded-full text-sm font-semibold ${
                isEntrada ? 'bg-blue-500/30' : 'bg-emerald-500/30'
              }`}>
                {isEntrada ? 'Entrada' : 'Saída'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="opacity-80">Motorista:</span>
                <span className="font-semibold">{checklist.driver_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="opacity-80">Criado em:</span>
                <span className="font-semibold">{formatDate(checklist.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80">KM:</span>
                <span className="font-semibold">
                  {checklist.km_initial || checklist.km_final || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* KM e Limpeza Interna */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                <h2 className="text-xl font-bold text-white mb-4">Quilometragem</h2>
                <div className="space-y-3">
                  {checklist.km_initial && (
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-300">KM Inicial (Saída)</span>
                      <span className="text-emerald-400 font-bold text-lg">{checklist.km_initial.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                  {checklist.km_final && (
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-300">KM Final (Entrada)</span>
                      <span className="text-emerald-400 font-bold text-lg">{checklist.km_final.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                  {checklist.km_initial && checklist.km_final && (
                    <div className="flex items-center justify-between p-3 bg-emerald-900/30 rounded-lg border border-emerald-700">
                      <span className="text-emerald-300 font-semibold">Distância Percorrida</span>
                      <span className="text-emerald-400 font-bold text-lg">
                        {(checklist.km_final - checklist.km_initial).toLocaleString('pt-BR')} km
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                <h2 className="text-xl font-bold text-white mb-4">Limpeza Interna</h2>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  {checklist.interior_photo_key ? (
                    <div className="space-y-3">
                      <img 
                        src={`/api/r2-assets/${checklist.interior_photo_key}`}
                        alt="Interior do veículo"
                        className="w-full h-48 object-cover rounded-lg border-2 border-slate-600"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">
                          {isEntrada 
                            ? 'Dentro dos padrões como saiu?' 
                            : 'Limpo para viagem?'}
                        </span>
                        {checklist.interior_clean_approved ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">Foto não disponível</p>
                  )}
                </div>
              </div>
            </div>

            {/* Estado Geral */}
            <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                Estado Geral
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Limpeza</span>
                  <StatusIcon ok={generalState.cleanliness?.ok} problems={generalState.cleanliness?.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Pneus</span>
                  <StatusIcon ok={generalState.tires?.ok} problems={generalState.tires?.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Combustível</span>
                  <StatusIcon ok={generalState.fuel?.ok} problems={generalState.fuel?.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Documentação</span>
                  <StatusIcon ok={generalState.documentation?.ok} problems={generalState.documentation?.problems} />
                </div>
              </div>
            </div>

            {/* Luzes */}
            <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
              <h2 className="text-xl font-bold text-white mb-4">Luzes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Dianteiras</span>
                  <StatusIcon ok={frontLights.ok} problems={frontLights.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Traseiras</span>
                  <StatusIcon ok={rearLights.ok} problems={rearLights.problems} />
                </div>
              </div>
            </div>

            {/* Segurança */}
            <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
              <h2 className="text-xl font-bold text-white mb-4">Segurança</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Cinto de Segurança</span>
                  <StatusIcon ok={safety.seatbelt?.ok} problems={safety.seatbelt?.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Extintor</span>
                  <StatusIcon ok={safety.extinguisher?.ok} problems={safety.extinguisher?.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Triângulo</span>
                  <StatusIcon ok={safety.triangle?.ok} problems={safety.triangle?.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Macaco</span>
                  <StatusIcon ok={safety.jack?.ok} problems={safety.jack?.problems} />
                </div>
              </div>
            </div>

            {/* Motor */}
            <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
              <h2 className="text-xl font-bold text-white mb-4">Motor e Mecânica</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Óleo</span>
                  <StatusIcon ok={motor.oil?.ok} problems={motor.oil?.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Freios</span>
                  <StatusIcon ok={motor.brakes?.ok} problems={motor.brakes?.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Bateria</span>
                  <StatusIcon ok={motor.battery?.ok} problems={motor.battery?.problems} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Radiador</span>
                  <StatusIcon ok={motor.radiator?.ok} problems={motor.radiator?.problems} />
                </div>
              </div>
            </div>

            {/* Avarias */}
            {damageMarks.length > 0 && (
              <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                <h2 className="text-xl font-bold text-white mb-6">Avarias Identificadas ({damageMarks.length})</h2>
                
                <p className="text-slate-400 text-sm mb-6">Clique em cada lado do veículo para visualizar as fotos das avarias</p>

                {/* Vehicle Visualization - Clickable */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {(['left', 'front', 'rear', 'right'] as const).map((side) => {
                    const sideMarks = damageMarks.filter(m => m.vehicle_side === side);
                    const sideLabels = {
                      left: 'Lado Esquerdo',
                      front: 'Frente',
                      rear: 'Traseira',
                      right: 'Lado Direito'
                    };
                    const photoKeys = {
                      left: checklist.left_side_photo_key,
                      front: checklist.front_photo_key,
                      rear: checklist.rear_photo_key,
                      right: checklist.right_side_photo_key
                    };

                    if (sideMarks.length === 0) return null;

                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setSelectedSide(side)}
                        className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-700/50 hover:border-emerald-500 border-2 border-slate-600 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-white">{sideLabels[side]}</h4>
                          <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                            {sideMarks.length} avaria{sideMarks.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="relative aspect-square bg-slate-900 rounded-lg overflow-hidden mb-2">
                          {photoKeys[side] ? (
                            <img
                              src={`/api/r2-assets/${photoKeys[side]}`}
                              alt={sideLabels[side]}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                              Sem foto
                            </div>
                          )}
                          {sideMarks.map((mark) => (
                            <div
                              key={mark.id}
                              className="absolute w-8 h-8 -ml-4 -mt-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg animate-pulse"
                              style={{
                                left: `${mark.x_position}%`,
                                top: `${mark.y_position}%`,
                              }}
                            >
                              {sideMarks.indexOf(mark) + 1}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-emerald-400 text-center">
                          Clique para ver detalhes
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Observações Finais */}
            {checklist.observations && (
              <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                <h2 className="text-xl font-bold text-white mb-4">Observações Finais</h2>
                <p className="text-slate-300 whitespace-pre-wrap">{checklist.observations}</p>
              </div>
            )}

            {/* Assinaturas */}
            {(checklist.driver_signature_key || checklist.inspector_signature_key) && (
              <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                <h2 className="text-xl font-bold text-white mb-6">Assinaturas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {checklist.driver_signature_key && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Assinatura do Motorista
                      </label>
                      <div className="border-2 border-slate-600 rounded-lg bg-white p-4">
                        <img
                          src={`/api/r2-assets/${checklist.driver_signature_key}`}
                          alt="Assinatura do Motorista"
                          className="w-full h-32 object-contain"
                        />
                      </div>
                    </div>
                  )}
                  {checklist.inspector_signature_key && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Assinatura do Vistoriador
                      </label>
                      <div className="border-2 border-slate-600 rounded-lg bg-white p-4">
                        <img
                          src={`/api/r2-assets/${checklist.inspector_signature_key}`}
                          alt="Assinatura do Vistoriador"
                          className="w-full h-32 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (checklist) {
                    generateFleetChecklistPDF(checklist, damageMarks);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
              >
                <Download className="w-5 h-5" />
                Baixar PDF
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Excluir
              </button>
            </div>
          </div>
        </div>

        {/* Side Photos Modal */}
        {selectedSide && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {selectedSide === 'left' ? 'Lado Esquerdo' :
                   selectedSide === 'front' ? 'Frente' :
                   selectedSide === 'rear' ? 'Traseira' : 'Lado Direito'}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedSide(null)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Main vehicle photo with damage marks */}
              <div className="mb-6">
                <div className="relative bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-600">
                  {(() => {
                    const photoKeys = {
                      left: checklist.left_side_photo_key,
                      front: checklist.front_photo_key,
                      rear: checklist.rear_photo_key,
                      right: checklist.right_side_photo_key
                    };
                    const photoKey = photoKeys[selectedSide as keyof typeof photoKeys];
                    
                    return photoKey ? (
                      <>
                        <img
                          src={`/api/r2-assets/${photoKey}`}
                          alt={`Foto do ${selectedSide === 'left' ? 'lado esquerdo' : selectedSide === 'front' ? 'frontal' : selectedSide === 'rear' ? 'traseira' : 'lado direito'}`}
                          className="w-full h-auto"
                        />
                        {damageMarks.filter(m => m.vehicle_side === selectedSide).map((mark, index) => (
                          <div
                            key={mark.id}
                            className="absolute w-10 h-10 -ml-5 -mt-5 bg-red-500 border-3 border-white rounded-full flex items-center justify-center text-white font-bold shadow-xl animate-pulse"
                            style={{
                              left: `${mark.x_position}%`,
                              top: `${mark.y_position}%`,
                            }}
                          >
                            {index + 1}
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="w-full h-64 flex items-center justify-center text-slate-500">
                        Foto não disponível
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Damage marks list */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">
                  Avarias Identificadas ({damageMarks.filter(m => m.vehicle_side === selectedSide).length})
                </h4>
                {damageMarks.filter(m => m.vehicle_side === selectedSide).map((mark, index) => (
                  <div key={mark.id} className="p-5 bg-slate-700/50 rounded-xl border border-slate-600">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center justify-center w-10 h-10 bg-red-500 text-white rounded-full text-lg font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <h5 className="text-lg font-semibold text-emerald-400">Avaria #{index + 1}</h5>
                        {mark.observation && (
                          <p className="text-slate-300 text-sm mt-1">{mark.observation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelectedSide(null)}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-semibold mt-6"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Confirmar Exclusão</h3>
              <p className="text-slate-300 mb-6">
                Tem certeza que deseja excluir este checklist? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
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
