import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, Truck, Cog, AlertCircle } from 'lucide-react';
import type { EquipmentCategory } from '../../shared/checklist-types';

export default function NewChecklist() {
  const navigate = useNavigate();
  const [equipmentCategory, setEquipmentCategory] = useState<EquipmentCategory | ''>('');
  const [vehicleType, setVehicleType] = useState<'light' | 'heavy' | ''>('');
  const [brandModel, setBrandModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [odometer, setOdometer] = useState('');
  const [equipmentIdentifier, setEquipmentIdentifier] = useState('');
  const [observations, setObservations] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const submittingRef = useRef(false);

  const isMachinery = equipmentCategory === 'machinery';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Prevent double submission
    if (submittingRef.current) {
      console.log('[NewChecklist] Já está enviando, ignorando clique duplicado');
      return;
    }

    if (!equipmentCategory || !vehicleType || !brandModel) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    // For vehicles, require plate and odometer
    if (!isMachinery) {
      if (!licensePlate || !odometer) {
        setError('Preencha a placa e quilometragem');
        return;
      }
      const odometerValue = parseInt(odometer);
      if (isNaN(odometerValue) || odometerValue < 0) {
        setError('Quilometragem deve ser um número válido');
        return;
      }
    }

    try {
      submittingRef.current = true;
      setLoading(true);

      const requestBody: Record<string, any> = {
        equipment_category: equipmentCategory,
        vehicle_type: vehicleType,
        brand_model: brandModel,
        initial_observations: observations || undefined,
      };

      if (isMachinery) {
        if (equipmentIdentifier) {
          requestBody.equipment_identifier = equipmentIdentifier;
        }
        // Include odometer if provided for machinery
        if (odometer) {
          const odometerValue = parseInt(odometer);
          if (!isNaN(odometerValue) && odometerValue >= 0) {
            requestBody.odometer = odometerValue;
          }
        }
      } else {
        requestBody.license_plate = licensePlate.toUpperCase();
        requestBody.odometer = parseInt(odometer);
      }

      const response = await fetch('/api/checklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao criar checklist');
      }

      const data = await response.json();
      navigate(`/checklist/${data.id}/photos`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar checklist');
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 safe-area-page">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowCancelConfirm(true)}
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

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Novo Checklist</h1>
          <p className="text-gray-600 mb-8">Preencha as informações do equipamento</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Equipment Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Categoria do Equipamento *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEquipmentCategory('vehicle');
                    setEquipmentIdentifier('');
                  }}
                  className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    equipmentCategory === 'vehicle'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Car className={`w-10 h-10 ${equipmentCategory === 'vehicle' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-medium text-sm ${equipmentCategory === 'vehicle' ? 'text-blue-600' : 'text-gray-700'}`}>
                    Veículo
                  </span>
                  <span className={`text-xs ${equipmentCategory === 'vehicle' ? 'text-blue-500' : 'text-gray-500'}`}>
                    Com placa
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEquipmentCategory('machinery');
                    setLicensePlate('');
                  }}
                  className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    equipmentCategory === 'machinery'
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Cog className={`w-10 h-10 ${equipmentCategory === 'machinery' ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className={`font-medium text-sm ${equipmentCategory === 'machinery' ? 'text-orange-600' : 'text-gray-700'}`}>
                    Maquinário
                  </span>
                  <span className={`text-xs ${equipmentCategory === 'machinery' ? 'text-orange-500' : 'text-gray-500'}`}>
                    Sem placa
                  </span>
                </button>
              </div>
            </div>

            {/* Vehicle Type Selection - Show only when category is selected */}
            {equipmentCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de {isMachinery ? 'Maquinário' : 'Veículo'} *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setVehicleType('light')}
                    className={`p-5 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                      vehicleType === 'light'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Car className={`w-10 h-10 ${vehicleType === 'light' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${vehicleType === 'light' ? 'text-blue-600' : 'text-gray-700'}`}>
                      {isMachinery ? 'Leve' : 'Veículo Leve'}
                    </span>
                    {!isMachinery && (
                      <span className={`text-xs ${vehicleType === 'light' ? 'text-blue-500' : 'text-gray-500'}`}>
                        Foto do teto obrigatória
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleType('heavy')}
                    className={`p-5 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                      vehicleType === 'heavy'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Truck className={`w-10 h-10 ${vehicleType === 'heavy' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${vehicleType === 'heavy' ? 'text-blue-600' : 'text-gray-700'}`}>
                      {isMachinery ? 'Pesado' : 'Veículo Pesado'}
                    </span>
                    {!isMachinery && (
                      <span className={`text-xs ${vehicleType === 'heavy' ? 'text-blue-500' : 'text-gray-500'}`}>
                        Sem foto do teto
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca / Modelo *
              </label>
              <input
                type="text"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder={isMachinery ? "Ex: Hyster H50FT" : "Ex: Scania R450"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* License Plate - Only for vehicles */}
            {!isMachinery && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placa *
                </label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC1D23"
                  maxLength={7}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  required
                />
              </div>
            )}

            {/* Equipment Identifier - Only for machinery */}
            {isMachinery && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Identificador / Número de Série (opcional)
                </label>
                <input
                  type="text"
                  value={equipmentIdentifier}
                  onChange={(e) => setEquipmentIdentifier(e.target.value)}
                  placeholder="Ex: EMP-001 ou número de série"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Odometer - Required for vehicles, optional for machinery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isMachinery ? 'Horímetro (opcional)' : 'Quilometragem (km) *'}
              </label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder={isMachinery ? "Ex: 5000 horas" : "Ex: 125000"}
                min="0"
                step="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={!isMachinery}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações Iniciais (opcional)
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder={isMachinery 
                  ? "Adicione observações relevantes sobre o maquinário..." 
                  : "Adicione observações relevantes sobre o veículo..."}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando...' : 'Continuar para Fotos'}
            </button>
          </form>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Deseja realmente cancelar o checklist?
                </h3>
                <p className="text-gray-600 text-sm">
                  Todos os dados preenchidos serão perdidos e você retornará ao painel principal.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Continuar Preenchendo
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
