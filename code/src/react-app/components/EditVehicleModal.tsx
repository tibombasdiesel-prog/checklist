import { useState } from 'react';
import { X, Car, Truck, Cog, Save, AlertCircle } from 'lucide-react';
import type { EquipmentCategory } from '../../shared/checklist-types';

interface VehicleInfo {
  equipment_category: EquipmentCategory;
  vehicle_type: 'light' | 'heavy';
  brand_model: string;
  license_plate: string | null;
  odometer: number | null;
  equipment_identifier?: string | null;
  initial_observations?: string | null;
}

interface EditVehicleModalProps {
  checklistId: number;
  currentInfo: VehicleInfo;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditVehicleModal({ 
  checklistId, 
  currentInfo, 
  onClose, 
  onSaved 
}: EditVehicleModalProps) {
  const [equipmentCategory, setEquipmentCategory] = useState<EquipmentCategory>(currentInfo.equipment_category || 'vehicle');
  const [vehicleType, setVehicleType] = useState<'light' | 'heavy'>(currentInfo.vehicle_type);
  const [brandModel, setBrandModel] = useState(currentInfo.brand_model);
  const [licensePlate, setLicensePlate] = useState(currentInfo.license_plate || '');
  const [odometer, setOdometer] = useState((currentInfo.odometer ?? '').toString());
  const [equipmentIdentifier, setEquipmentIdentifier] = useState(currentInfo.equipment_identifier || '');
  const [observations, setObservations] = useState(currentInfo.initial_observations || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isMachinery = equipmentCategory === 'machinery';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!vehicleType || !brandModel) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    // For vehicles, require plate and odometer
    if (!isMachinery && (!licensePlate || !odometer)) {
      setError('Preencha a placa e quilometragem');
      return;
    }

    if (odometer) {
      const odometerValue = parseInt(odometer);
      if (isNaN(odometerValue) || odometerValue < 0) {
        setError('Quilometragem/horímetro deve ser um número válido');
        return;
      }
    }

    try {
      setLoading(true);

      const requestBody: Record<string, any> = {
        equipment_category: equipmentCategory,
        vehicle_type: vehicleType,
        brand_model: brandModel,
        initial_observations: observations || undefined,
      };

      if (isMachinery) {
        requestBody.equipment_identifier = equipmentIdentifier || null;
        requestBody.license_plate = null;
        if (odometer) {
          requestBody.odometer = parseInt(odometer);
        } else {
          requestBody.odometer = null;
        }
      } else {
        requestBody.license_plate = licensePlate.toUpperCase();
        requestBody.odometer = parseInt(odometer);
        requestBody.equipment_identifier = null;
      }

      const response = await fetch(`/api/checklists/${checklistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar');
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`text-white p-4 rounded-t-2xl flex items-center justify-between ${
          isMachinery 
            ? 'bg-gradient-to-r from-orange-600 to-amber-600' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
        }`}>
          <h3 className="text-lg font-bold">
            Editar Informações {isMachinery ? 'do Maquinário' : 'do Veículo'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Equipment Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEquipmentCategory('vehicle')}
                className={`p-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  equipmentCategory === 'vehicle'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Car className={`w-6 h-6 ${equipmentCategory === 'vehicle' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-medium text-sm ${equipmentCategory === 'vehicle' ? 'text-blue-600' : 'text-gray-700'}`}>
                  Veículo
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEquipmentCategory('machinery')}
                className={`p-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  equipmentCategory === 'machinery'
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Cog className={`w-6 h-6 ${equipmentCategory === 'machinery' ? 'text-orange-600' : 'text-gray-400'}`} />
                <span className={`font-medium text-sm ${equipmentCategory === 'machinery' ? 'text-orange-600' : 'text-gray-700'}`}>
                  Maquinário
                </span>
              </button>
            </div>
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVehicleType('light')}
                className={`p-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  vehicleType === 'light'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Car className={`w-6 h-6 ${vehicleType === 'light' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-medium text-sm ${vehicleType === 'light' ? 'text-blue-600' : 'text-gray-700'}`}>
                  Leve
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVehicleType('heavy')}
                className={`p-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  vehicleType === 'heavy'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Truck className={`w-6 h-6 ${vehicleType === 'heavy' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-medium text-sm ${vehicleType === 'heavy' ? 'text-blue-600' : 'text-gray-700'}`}>
                  Pesado
                </span>
              </button>
            </div>
          </div>

          {/* Brand/Model */}
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

          {/* Odometer */}
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

          {/* Observations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações (opcional)
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:from-gray-400 disabled:to-gray-400 ${
                isMachinery
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
