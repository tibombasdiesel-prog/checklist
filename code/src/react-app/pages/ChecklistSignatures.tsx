import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileSignature, Check, ArrowLeft, AlertCircle, Pencil } from 'lucide-react';
import { useChecklist } from '../hooks/useChecklists';
import SignaturePad from '../components/SignaturePad';
import EditVehicleModal from '../components/EditVehicleModal';

export default function ChecklistSignatures() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { checklist, loading: checklistLoading } = useChecklist(parseInt(id!));
  const [showClientSignature, setShowClientSignature] = useState(false);
  const [showCollaboratorSignature, setShowCollaboratorSignature] = useState(false);
  const [clientSignature, setClientSignature] = useState<Blob | null>(null);
  const [collaboratorSignature, setCollaboratorSignature] = useState<Blob | null>(null);
  const [clientSignatureSaved, setClientSignatureSaved] = useState(false);
  const [collaboratorSignatureSaved, setCollaboratorSignatureSaved] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const completingRef = useRef(false);

  const uploadSignature = async (blob: Blob, type: 'client' | 'collaborator') => {
    setUploadingSignature(true);
    setError('');
    
    try {
      console.log(`[Assinatura] Enviando assinatura do ${type} para o servidor...`);
      
      const formData = new FormData();
      formData.append('signature', blob, `signature-${type}.png`);
      formData.append('signature_type', type);

      const response = await fetch(`/api/checklists/${id}/signature`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar assinatura');
      }

      console.log(`[Assinatura] ✅ Assinatura do ${type} salva no servidor`);
      
      // Mark as saved
      if (type === 'client') {
        setClientSignatureSaved(true);
      } else {
        setCollaboratorSignatureSaved(true);
      }
      
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar assinatura';
      console.error(`[Assinatura] ❌ Erro ao enviar assinatura do ${type}:`, errorMsg);
      setError(errorMsg);
      
      // Clear the signature on error
      if (type === 'client') {
        setClientSignature(null);
        setClientSignatureSaved(false);
      } else {
        setCollaboratorSignature(null);
        setCollaboratorSignatureSaved(false);
      }
      
      return false;
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleClientSignature = async (blob: Blob) => {
    setShowClientSignature(false);
    setClientSignature(blob);
    await uploadSignature(blob, 'client');
  };

  const handleCollaboratorSignature = async (blob: Blob) => {
    setShowCollaboratorSignature(false);
    setCollaboratorSignature(blob);
    await uploadSignature(blob, 'collaborator');
  };

  const completeChecklist = async () => {
    // Check if signatures are present
    if (!clientSignature || !collaboratorSignature) {
      setError('Ambas as assinaturas são obrigatórias');
      return;
    }

    // Check if signatures are saved on server
    if (!clientSignatureSaved || !collaboratorSignatureSaved) {
      setError('Aguarde... as assinaturas ainda estão sendo enviadas ao servidor');
      return;
    }

    // Prevent double submission
    if (completingRef.current) {
      console.log(`[Checklist Frontend] Já está finalizando, ignorando clique duplicado`);
      return;
    }

    try {
      completingRef.current = true;
      setUploading(true);
      setError('');

      console.log(`[Checklist Frontend] Tentando completar checklist ${id}`);
      console.log(`[Checklist Frontend] Cliente: assinado=${!!clientSignature}, salvo=${clientSignatureSaved}`);
      console.log(`[Checklist Frontend] Colaborador: assinado=${!!collaboratorSignature}, salvo=${collaboratorSignatureSaved}`);

      const response = await fetch(`/api/checklists/${id}/complete`, {
        method: 'POST',
        credentials: 'include',
      });

      console.log(`[Checklist Frontend] Resposta status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error(`[Checklist Frontend] ❌ Erro do servidor:`, errorData);
        throw new Error(errorData.error || 'Erro ao finalizar checklist');
      }

      console.log(`[Checklist Frontend] ✅ Checklist completado com sucesso!`);
      navigate(`/checklist/${id}/view`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao finalizar checklist';
      console.error(`[Checklist Frontend] ❌ Erro ao completar:`, errorMsg);
      setError(errorMsg);
      completingRef.current = false;
    } finally {
      setUploading(false);
    }
  };

  if (checklistLoading) {
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBackConfirm(true)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Voltar"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-2xl font-bold">Assinaturas Digitais</h1>
              </div>
              <img 
                src="/assets/logo-bombas-diesel-light.png" 
                alt="Bombas Diesel" 
                className="h-10 object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-blue-100">
                {checklist.brand_model} - {checklist.license_plate}
              </p>
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1 hover:bg-white/20 rounded"
                title="Editar informações"
              >
                <Pencil className="w-4 h-4 text-blue-100" />
              </button>
            </div>
          </div>

          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Para finalizar o checklist, é necessário coletar as assinaturas digitais do cliente/motorista e do colaborador responsável.
              </p>
            </div>

            {/* Client Signature */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileSignature className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Assinatura do Cliente/Motorista</h3>
                    <p className="text-sm text-gray-600">Obrigatória para prosseguir</p>
                  </div>
                </div>
                {clientSignature && (
                  <div className="bg-green-500 text-white rounded-full p-2">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>

              {clientSignature ? (
                <div className="space-y-3">
                  <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                    <img
                      src={URL.createObjectURL(clientSignature)}
                      alt="Assinatura do cliente"
                      className="max-h-32 mx-auto"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setClientSignature(null);
                      setClientSignatureSaved(false);
                      setShowClientSignature(true);
                    }}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    disabled={uploadingSignature}
                  >
                    Refazer assinatura
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClientSignature(true)}
                  className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={uploadingSignature}
                >
                  <FileSignature className="w-5 h-5" />
                  {uploadingSignature ? 'Salvando...' : 'Coletar Assinatura'}
                </button>
              )}
            </div>

            {/* Collaborator Signature */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <FileSignature className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Assinatura do Colaborador</h3>
                    <p className="text-sm text-gray-600">Sua assinatura digital</p>
                  </div>
                </div>
                {collaboratorSignature && (
                  <div className="bg-green-500 text-white rounded-full p-2">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>

              {collaboratorSignature ? (
                <div className="space-y-3">
                  <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                    <img
                      src={URL.createObjectURL(collaboratorSignature)}
                      alt="Assinatura do colaborador"
                      className="max-h-32 mx-auto"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setCollaboratorSignature(null);
                      setCollaboratorSignatureSaved(false);
                      setShowCollaboratorSignature(true);
                    }}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    disabled={uploadingSignature}
                  >
                    Refazer assinatura
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCollaboratorSignature(true)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={uploadingSignature}
                >
                  <FileSignature className="w-5 h-5" />
                  {uploadingSignature ? 'Salvando...' : 'Assinar'}
                </button>
              )}
            </div>

            <button
              onClick={completeChecklist}
              disabled={!clientSignature || !collaboratorSignature || !clientSignatureSaved || !collaboratorSignatureSaved || uploading || uploadingSignature}
              className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploadingSignature ? 'Aguarde... salvando assinaturas' : uploading ? 'Finalizando...' : 'Finalizar Checklist'}
              <Check className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {showClientSignature && (
        <SignaturePad
          title="Assinatura do Cliente/Motorista"
          onSave={handleClientSignature}
          onCancel={() => setShowClientSignature(false)}
        />
      )}

      {showCollaboratorSignature && (
        <SignaturePad
          title="Sua Assinatura"
          onSave={handleCollaboratorSignature}
          onCancel={() => setShowCollaboratorSignature(false)}
        />
      )}

      {/* Edit Vehicle Modal */}
      {showEditModal && checklist && checklist.id !== null && (
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
            window.location.reload();
          }}
        />
      )}

      {/* Back Confirmation Modal */}
      {showBackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Voltar à etapa anterior?
                </h3>
                <p className="text-gray-600 text-sm">
                  As assinaturas já coletadas serão descartadas e você retornará para a gravação do vídeo. Deseja continuar?
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowBackConfirm(false)}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Continuar Aqui
              </button>
              <button
                onClick={() => navigate(`/checklist/${id}/video`)}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Sim, Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
