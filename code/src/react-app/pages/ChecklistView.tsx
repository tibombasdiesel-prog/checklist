import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Car, Calendar, User, FileText, ImageIcon, FileSignature, Download, Shield, Video, Trash2, AlertCircle, CheckCircle2, Pencil, Cog } from 'lucide-react';
import { useChecklist } from '../hooks/useChecklists';
import { useState } from 'react';
import { generateChecklistPDF } from '../utils/generateChecklistPDF';
import { useAuth } from '../contexts/AuthContext';
import EditVehicleModal from '../components/EditVehicleModal';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

export default function ChecklistView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { checklist, loading, refetch } = useChecklist(parseInt(id!));
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Enable swipe navigation when checklist is completed
  useSwipeNavigation({
    enabled: Boolean(checklist?.is_completed),
    targetPath: '/dashboard',
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const getPhotoLabel = (type: string) => {
    const labels: Record<string, string> = {
      front: 'Frente',
      back: 'Traseira',
      left: 'Lado Esquerdo',
      right: 'Lado Direito',
      roof: 'Teto',
    };
    return labels[type] || type;
  };

  const getImageUrl = (r2Key: string) => {
    if (!r2Key) return '';
    if (r2Key.startsWith('http://') || r2Key.startsWith('https://')) {
      return r2Key;
    }
    const parts = r2Key.split('/');
    const checklistId = parts[1];
    const filename = parts[2];
    return `/api/files/${checklistId}/${filename}`;
  };

  const handleDownloadPDF = async () => {
    if (!checklist || !checklist.client_signature_key || !checklist.collaborator_signature_key) {
      alert('Checklist incompleto. Certifique-se de que todas as assinaturas foram coletadas.');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const clientSignatureUrl = getImageUrl(checklist.client_signature_key);
      const collaboratorSignatureUrl = getImageUrl(checklist.collaborator_signature_key);
      
      await generateChecklistPDF(checklist, clientSignatureUrl, collaboratorSignatureUrl);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o documento PDF. Por favor, tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setShowPinModal(true);
    setPin('');
    setPinError('');
  };

  const handleDeleteWithPin = async () => {
    if (pin !== '2233') {
      setPinError('PIN incorreto. Acesso negado.');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/checklists/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir checklist');
      }

      alert('Checklist excluído com sucesso');
      navigate('/history');
    } catch (error) {
      console.error('Erro ao excluir checklist:', error);
      alert('Erro ao excluir o checklist. Por favor, tente novamente.');
    } finally {
      setIsDeleting(false);
      setShowPinModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Checklist não encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 safe-area-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center text-gray-700 hover:text-gray-900"
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
          
          <div className="flex items-center gap-3">
            {checklist?.is_completed && checklist.client_signature_key && checklist.collaborator_signature_key && (
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
              >
                <Download className="w-5 h-5" />
                {isGeneratingPDF ? 'Gerando PDF...' : 'Baixar Termo de Ciência'}
              </button>
            )}
            
            {user?.role === 'recepcao' && checklist?.is_completed && (
              <button
                onClick={() => navigate(`/checklist/${id}/mark-os-opened`)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                Marcar OS como Aberta
              </button>
            )}
            
            {user?.is_admin && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all"
                >
                  <Pencil className="w-5 h-5" />
                  Editar Veículo
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                  Excluir Checklist
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className={`text-white p-6 ${
            checklist.equipment_category === 'machinery' 
              ? 'bg-gradient-to-r from-orange-600 to-amber-600'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {checklist.equipment_category === 'machinery' ? (
                <Cog className="w-8 h-8" />
              ) : (
                <Car className="w-8 h-8" />
              )}
              <h1 className="text-3xl font-bold">{checklist.brand_model}</h1>
              {checklist.equipment_category === 'machinery' && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  Maquinário
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-white/80">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(checklist.created_at)}
              </div>
              {checklist.user_name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {checklist.user_name}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Admin Details Section */}
            {user?.is_admin && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Informações Administrativas</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600 mb-1">ID do Checklist</p>
                    <p className="font-semibold text-gray-900">#{checklist.id}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600 mb-1">Colaborador Responsável</p>
                    <p className="font-semibold text-gray-900">{checklist.user_name || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Criado
                    </p>
                    <p className="font-semibold text-gray-900">{formatDate(checklist.created_at)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600 mb-1">Número de Fotos</p>
                    <p className="font-semibold text-gray-900">{checklist.photos?.length || 0} foto(s)</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600 mb-1">Vídeos 360°</p>
                    <p className="font-semibold text-gray-900">{checklist.videos?.length || 0} vídeo(s)</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-600 mb-1">Status do Checklist</p>
                    <p className="font-semibold text-gray-900">
                      {checklist.is_completed ? '✓ Concluído e Assinado' : '⚠ Em Andamento'}
                    </p>
                  </div>
                  {checklist.client_signature_key && (
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-gray-600 mb-1">Assinatura do Cliente</p>
                      <p className="font-semibold text-green-700">✓ Coletada</p>
                    </div>
                  )}
                  {checklist.collaborator_signature_key && (
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-gray-600 mb-1">Assinatura do Colaborador</p>
                      <p className="font-semibold text-green-700">✓ Coletada</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vehicle/Equipment Info */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {checklist.license_plate ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">Placa</p>
                  <p className="text-xl font-bold text-gray-900">{checklist.license_plate}</p>
                </div>
              ) : checklist.equipment_identifier ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-600 font-medium mb-1">Identificador</p>
                  <p className="text-xl font-bold text-gray-900">{checklist.equipment_identifier}</p>
                </div>
              ) : checklist.equipment_category === 'machinery' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium mb-1">Identificador</p>
                  <p className="text-lg font-bold text-gray-500">Não informado</p>
                </div>
              ) : null}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium mb-1">
                  {checklist.equipment_category === 'machinery' ? 'Tipo' : 'Tipo de Veículo'}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {checklist.equipment_category === 'machinery' 
                    ? (checklist.vehicle_type === 'light' ? 'Maquinário Leve' : 'Maquinário Pesado')
                    : (checklist.vehicle_type === 'light' ? 'Veículo Leve' : 'Veículo Pesado')
                  }
                </p>
              </div>
              {checklist.odometer !== null && checklist.odometer !== undefined && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-600 font-medium mb-1">
                    {checklist.equipment_category === 'machinery' ? 'Horímetro' : 'Quilometragem'}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {checklist.odometer.toLocaleString('pt-BR')} {checklist.equipment_category === 'machinery' ? 'h' : 'km'}
                  </p>
                </div>
              )}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-600 font-medium mb-1">Status Checklist</p>
                <p className="text-xl font-bold text-gray-900">
                  {checklist.is_completed ? 'Concluído' : 'Em andamento'}
                </p>
              </div>
              {user?.role === 'recepcao' && checklist.is_completed && (
                <div className={`border rounded-lg p-4 ${
                  checklist.os_ready 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <p className={`text-sm font-medium mb-1 ${
                    checklist.os_ready ? 'text-green-600' : 'text-orange-600'
                  }`}>Status da O.S.</p>
                  <p className="text-xl font-bold text-gray-900">
                    {checklist.os_ready ? '✓ Pronta' : 'Pendente'}
                  </p>
                  {checklist.os_opened_at && (
                    <p className="text-xs text-gray-600 mt-1">
                      Aberta em: {formatDate(checklist.os_opened_at)}
                    </p>
                  )}
                  {checklist.os_number && (
                    <p className="text-xs text-gray-600 mt-1">
                      OS #{checklist.os_number}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Observations */}
            {checklist.initial_observations && (
              <div className="border-2 border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Observações Iniciais</h3>
                </div>
                <p className="text-gray-700">{checklist.initial_observations}</p>
              </div>
            )}

            {/* Photos */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <ImageIcon className="w-6 h-6 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Fotos {checklist.equipment_category === 'machinery' ? 'do Maquinário' : 'do Veículo'} ({checklist.photos?.length || 0})
                </h3>
              </div>
              {checklist.photos && checklist.photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {checklist.photos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div
                        className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => setSelectedImage(getImageUrl(photo.r2_key))}
                      >
                        <img
                          src={getImageUrl(photo.r2_key)}
                          alt={getPhotoLabel(photo.photo_type)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm text-center text-gray-600 font-medium">
                        {getPhotoLabel(photo.photo_type)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhuma foto disponível</p>
              )}
            </div>

            {/* Videos */}
            {checklist.videos && checklist.videos.length > 0 && (
              <div className="border-2 border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Video className="w-6 h-6 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Vídeo 360° {checklist.equipment_category === 'machinery' ? 'do Maquinário' : 'do Veículo'}
                  </h3>
                </div>
                <div className="space-y-4">
                  {checklist.videos.map((video) => (
                    <div key={video.id} className="bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200">
                      <video
                        src={getImageUrl(video.r2_key)}
                        controls
                        playsInline
                        webkit-playsinline="true"
                        preload="auto"
                        controlsList="nodownload"
                        className="w-full aspect-video bg-black"
                        style={{ maxHeight: '70vh' }}
                        onError={(e) => {
                          console.error('Video error:', e);
                        }}
                      >
                        <source src={getImageUrl(video.r2_key)} type="video/webm" />
                        <source src={getImageUrl(video.r2_key)} type="video/mp4" />
                        Seu navegador não suporta reprodução de vídeo.
                      </video>
                      {video.duration_seconds && (
                        <div className="p-3 bg-white border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            Duração: {Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')} minutos
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Gravado em: {formatDate(video.created_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileSignature className="w-6 h-6 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Assinaturas Digitais</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {checklist.client_signature_key ? (
                  <div className="space-y-3">
                    <p className="font-medium text-gray-700">Cliente/Motorista</p>
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <img
                        src={getImageUrl(checklist.client_signature_key)}
                        alt="Assinatura do cliente"
                        className="max-h-32 mx-auto"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-medium text-gray-700">Cliente/Motorista</p>
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <p className="text-center text-gray-400 py-8">Assinatura não coletada</p>
                    </div>
                  </div>
                )}
                {checklist.collaborator_signature_key ? (
                  <div className="space-y-3">
                    <p className="font-medium text-gray-700">Colaborador</p>
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <img
                        src={getImageUrl(checklist.collaborator_signature_key)}
                        alt="Assinatura do colaborador"
                        className="max-h-32 mx-auto"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-medium text-gray-700">Colaborador</p>
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <p className="text-center text-gray-400 py-8">Assinatura não coletada</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`border rounded-lg p-4 ${checklist.is_completed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className={`text-center font-medium ${checklist.is_completed ? 'text-green-700' : 'text-yellow-700'}`}>
                {checklist.is_completed ? '✓ Checklist registrado com sucesso' : '⚠ Checklist em andamento - aguardando conclusão'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Foto ampliada"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Excluir Checklist?
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Você está prestes a excluir permanentemente este checklist, incluindo todas as fotos, vídeos e assinaturas associadas.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠ Esta ação não pode ser desfeita!
                  </p>
                </div>
                <p className="text-gray-700 text-sm font-semibold">
                  Tem certeza que deseja continuar?
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {showEditModal && checklist && (
        <EditVehicleModal
          checklistId={checklist.id!}
          currentInfo={{
            equipment_category: checklist.equipment_category || 'vehicle',
            vehicle_type: checklist.vehicle_type,
            brand_model: checklist.brand_model,
            license_plate: checklist.license_plate,
            odometer: checklist.odometer,
            equipment_identifier: checklist.equipment_identifier,
            initial_observations: checklist.initial_observations,
          }}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            refetch();
          }}
        />
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Confirmação de Segurança
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Para confirmar a exclusão, digite o PIN administrativo:
                </p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ''));
                    setPinError('');
                  }}
                  placeholder="Digite o PIN"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-center text-2xl font-bold tracking-widest focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                {pinError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 font-medium">{pinError}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin('');
                  setPinError('');
                }}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteWithPin}
                disabled={isDeleting || pin.length !== 4}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
