import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function MarkOSOpened() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [osNumber, setOsNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/checklists/${id}/mark-os-opened`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ os_number: osNumber || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('OS marcada como aberta com sucesso! O colaborador será notificado.');
        navigate(`/checklist/${id}/view`);
      } else {
        setError(data.error || 'Erro ao marcar OS como aberta');
      }
    } catch (error) {
      console.error('Error marking OS as opened:', error);
      setError('Erro ao marcar OS como aberta. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Only reception users and admins can access
  if (user?.role !== 'recepcao' && !user?.is_admin) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 safe-area-page">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/checklist/${id}/view`)}
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
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Marcar OS como Aberta</h1>
            </div>
            <p className="text-green-100">
              Confirme a abertura da Ordem de Serviço
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Sobre esta ação:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Marcar a OS como aberta notificará o colaborador que criou o checklist</li>
                    <li>O número da OS é opcional, mas ajuda na rastreabilidade</li>
                    <li>Esta ação ficará registrada no histórico do checklist</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número da OS (opcional)
              </label>
              <input
                type="text"
                value={osNumber}
                onChange={(e) => setOsNumber(e.target.value)}
                placeholder="Ex: OS-2024-001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Digite o número da Ordem de Serviço se disponível
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/checklist/${id}/view`)}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {loading ? 'Confirmando...' : 'Confirmar Abertura da OS'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
