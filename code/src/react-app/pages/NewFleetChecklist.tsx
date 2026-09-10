import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, FileSignature, Plus } from 'lucide-react';
import SignaturePad from '../components/SignaturePad';
import VehiclePhotoCapture from '../components/VehiclePhotoCapture';

interface Vehicle {
  id: number;
  license_plate: string;
  model: string;
}

interface DamageMark {
  id: string;
  x: number;
  y: number;
  description: string;
}

export default function NewFleetChecklist() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checklistType = (searchParams.get('type') as 'saida' | 'entrada') || 'saida';
  
  // Basic information
  const [driverName, setDriverName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [kmReading, setKmReading] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  // Photos and damage marks
  const [leftPhoto, setLeftPhoto] = useState<File | null>(null);
  const [leftDamageMarks, setLeftDamageMarks] = useState<DamageMark[]>([]);
  
  const [rightPhoto, setRightPhoto] = useState<File | null>(null);
  const [rightDamageMarks, setRightDamageMarks] = useState<DamageMark[]>([]);
  
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [frontDamageMarks, setFrontDamageMarks] = useState<DamageMark[]>([]);
  
  const [rearPhoto, setRearPhoto] = useState<File | null>(null);
  const [rearDamageMarks, setRearDamageMarks] = useState<DamageMark[]>([]);
  
  const [interiorPhoto, setInteriorPhoto] = useState<File | null>(null);
  const [interiorClean, setInteriorClean] = useState<boolean | null>(null);
  
  // Estado Geral
  const [cleanlinessOk, setCleanlinessOk] = useState(false);
  const [cleanlinessProblems, setCleanlinessProblems] = useState(false);
  const [tiresOk, setTiresOk] = useState(false);
  const [tiresProblems, setTiresProblems] = useState(false);
  const [fuelOk, setFuelOk] = useState(false);
  const [fuelProblems, setFuelProblems] = useState(false);
  const [documentationOk, setDocumentationOk] = useState(false);
  const [documentationProblems, setDocumentationProblems] = useState(false);
  
  // Luzes
  const [frontLightsOk, setFrontLightsOk] = useState(false);
  const [frontLightsProblems, setFrontLightsProblems] = useState(false);
  const [rearLightsOk, setRearLightsOk] = useState(false);
  const [rearLightsProblems, setRearLightsProblems] = useState(false);
  
  // Segurança
  const [seatbeltOk, setSeatbeltOk] = useState(false);
  const [seatbeltProblems, setSeatbeltProblems] = useState(false);
  const [extinguisherOk, setExtinguisherOk] = useState(false);
  const [extinguisherProblems, setExtinguisherProblems] = useState(false);
  const [triangleOk, setTriangleOk] = useState(false);
  const [triangleProblems, setTriangleProblems] = useState(false);
  const [jackOk, setJackOk] = useState(false);
  const [jackProblems, setJackProblems] = useState(false);
  
  // Motor
  const [oilOk, setOilOk] = useState(false);
  const [oilProblems, setOilProblems] = useState(false);
  const [brakesOk, setBrakesOk] = useState(false);
  const [brakesProblems, setBrakesProblems] = useState(false);
  const [batteryOk, setBatteryOk] = useState(false);
  const [batteryProblems, setBatteryProblems] = useState(false);
  const [radiatorOk, setRadiatorOk] = useState(false);
  const [radiatorProblems, setRadiatorProblems] = useState(false);
  
  // Observações Finais
  const [finalObservations, setFinalObservations] = useState('');
  
  // Assinaturas
  const [driverSignature, setDriverSignature] = useState<Blob | null>(null);
  const [inspectorSignature, setInspectorSignature] = useState<Blob | null>(null);
  const [driverSignatureSaved, setDriverSignatureSaved] = useState(false);
  const [inspectorSignatureSaved, setInspectorSignatureSaved] = useState(false);
  const [showDriverSignature, setShowDriverSignature] = useState(false);
  const [showInspectorSignature, setShowInspectorSignature] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  // Load vehicles on component mount
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const response = await fetch('/api/vehicles', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setVehicles(data);
        }
      } catch (error) {
        console.error('Error loading vehicles:', error);
      }
    };
    loadVehicles();
  }, []);

  const handleDriverSignature = (blob: Blob) => {
    setShowDriverSignature(false);
    setDriverSignature(blob);
    setDriverSignatureSaved(true);
  };

  const handleInspectorSignature = (blob: Blob) => {
    setShowInspectorSignature(false);
    setInspectorSignature(blob);
    setInspectorSignatureSaved(true);
  };

  const uploadPhoto = async (file: File, type: string): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('type', type);

    const response = await fetch('/api/fleet-checklists/temp-photo', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar foto: ${type}`);
    }

    const data = await response.json();
    return data.key;
  };

  const uploadSignature = async (blob: Blob, type: 'driver' | 'inspector'): Promise<string> => {
    const formData = new FormData();
    formData.append('signature', blob);
    formData.append('type', type);

    const response = await fetch('/api/fleet-checklists/temp-signature', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar assinatura: ${type}`);
    }

    const data = await response.json();
    return data.key;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (submittingRef.current) {
      return;
    }

    // Validações
    if (!driverName || !vehicleId || !kmReading) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (!leftPhoto || !rightPhoto || !frontPhoto || !rearPhoto || !interiorPhoto) {
      setError('Todas as fotos do veículo são obrigatórias');
      return;
    }

    if (interiorClean === null) {
      setError('Marque a limpeza do interior do veículo');
      return;
    }

    if (!driverSignature || !inspectorSignature) {
      setError('Ambas as assinaturas são obrigatórias');
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      console.log('[Fleet] Iniciando upload...');

      // Upload photos
      const leftPhotoKey = await uploadPhoto(leftPhoto, 'left');
      const rightPhotoKey = await uploadPhoto(rightPhoto, 'right');
      const frontPhotoKey = await uploadPhoto(frontPhoto, 'front');
      const rearPhotoKey = await uploadPhoto(rearPhoto, 'rear');
      const interiorPhotoKey = await uploadPhoto(interiorPhoto, 'interior');

      // Upload signatures
      const driverSigKey = await uploadSignature(driverSignature, 'driver');
      const inspectorSigKey = await uploadSignature(inspectorSignature, 'inspector');

      const checklistData = {
        checklistType,
        driverName,
        inspectionDate: new Date().toISOString(),
        vehicleId: parseInt(vehicleId),
        company: 'Bombas Diesel',
        kmReading: parseInt(kmReading),
        interiorClean,
        leftPhotoKey,
        rightPhotoKey,
        frontPhotoKey,
        rearPhotoKey,
        interiorPhotoKey,
        leftDamageMarks,
        rightDamageMarks,
        frontDamageMarks,
        rearDamageMarks,
        generalState: {
          cleanliness: { ok: cleanlinessOk, problems: cleanlinessProblems },
          tires: { ok: tiresOk, problems: tiresProblems },
          fuel: { ok: fuelOk, problems: fuelProblems },
          documentation: { ok: documentationOk, problems: documentationProblems },
        },
        lights: {
          front: { ok: frontLightsOk, problems: frontLightsProblems },
          rear: { ok: rearLightsOk, problems: rearLightsProblems },
        },
        safety: {
          seatbelt: { ok: seatbeltOk, problems: seatbeltProblems },
          extinguisher: { ok: extinguisherOk, problems: extinguisherProblems },
          triangle: { ok: triangleOk, problems: triangleProblems },
          jack: { ok: jackOk, problems: jackProblems },
        },
        engine: {
          oil: { ok: oilOk, problems: oilProblems },
          brakes: { ok: brakesOk, problems: brakesProblems },
          battery: { ok: batteryOk, problems: batteryProblems },
          radiator: { ok: radiatorOk, problems: radiatorProblems },
        },
        finalObservations,
        driverSignature: driverSigKey,
        inspectorSignature: inspectorSigKey,
      };

      console.log('[Fleet] Salvando checklist:', checklistData);

      const response = await fetch('/api/fleet-checklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(checklistData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar checklist');
      }

      alert('Checklist salvo com sucesso!');
      navigate('/fleet');
    } catch (err: any) {
      console.error('[Fleet] Erro:', err);
      setError(err.message || 'Erro ao salvar checklist');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const interiorQuestion = checklistType === 'saida' 
    ? 'Veículo está devidamente limpo para a viagem?'
    : 'Veículo está dentro dos padrões de limpeza como saiu?';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/fleet')}
                className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {checklistType === 'saida' ? 'Vistoria de Saída' : 'Vistoria de Entrada'}
                </h1>
                <p className="text-xs text-slate-400">Checklist de Frota</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Iniciais */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Dados Iniciais</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome do Motorista *
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Digite o nome do motorista"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Veículo *
                </label>
                <div className="flex gap-2">
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Selecione um veículo</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.license_plate} - {v.model}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => navigate('/fleet/vehicles')}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    title="Cadastrar novo veículo"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Quilometragem (KM) *
                </label>
                <input
                  type="number"
                  value={kmReading}
                  onChange={(e) => setKmReading(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Digite a quilometragem atual"
                  required
                />
              </div>
            </div>
          </div>

          {/* Fotos do Veículo */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-6">Fotos do Veículo</h2>
            
            <div className="space-y-8">
              <VehiclePhotoCapture
                label="Lado Esquerdo"
                instruction="Selecione as áreas na foto onde contém avarias ou amassados"
                photo={leftPhoto}
                damageMarks={leftDamageMarks}
                onPhotoCapture={setLeftPhoto}
                onDamageMarksChange={setLeftDamageMarks}
                allowDamageMarks={true}
              />

              <VehiclePhotoCapture
                label="Lado Direito"
                instruction="Selecione as áreas na foto onde contém avarias ou amassados"
                photo={rightPhoto}
                damageMarks={rightDamageMarks}
                onPhotoCapture={setRightPhoto}
                onDamageMarksChange={setRightDamageMarks}
                allowDamageMarks={true}
              />

              <VehiclePhotoCapture
                label="Frente"
                instruction="Selecione as áreas na foto onde contém avarias ou amassados"
                photo={frontPhoto}
                damageMarks={frontDamageMarks}
                onPhotoCapture={setFrontPhoto}
                onDamageMarksChange={setFrontDamageMarks}
                allowDamageMarks={true}
              />

              <VehiclePhotoCapture
                label="Traseira"
                instruction="Selecione as áreas na foto onde contém avarias ou amassados"
                photo={rearPhoto}
                damageMarks={rearDamageMarks}
                onPhotoCapture={setRearPhoto}
                onDamageMarksChange={setRearDamageMarks}
                allowDamageMarks={true}
              />

              <VehiclePhotoCapture
                label="Interior"
                instruction={interiorQuestion}
                photo={interiorPhoto}
                onPhotoCapture={setInteriorPhoto}
                allowDamageMarks={false}
              />

              {interiorPhoto && (
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <p className="text-sm font-medium text-slate-300 mb-3">{interiorQuestion}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setInteriorClean(true)}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                        interiorClean === true
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setInteriorClean(false)}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                        interiorClean === false
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Estado Geral */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Estado Geral</h2>
            
            <div className="space-y-4">
              {[
                { label: 'Limpeza Externa', ok: cleanlinessOk, setOk: setCleanlinessOk, problems: cleanlinessProblems, setProblems: setCleanlinessProblems },
                { label: 'Pneus', ok: tiresOk, setOk: setTiresOk, problems: tiresProblems, setProblems: setTiresProblems },
                { label: 'Combustível', ok: fuelOk, setOk: setFuelOk, problems: fuelProblems, setProblems: setFuelProblems },
                { label: 'Documentação', ok: documentationOk, setOk: setDocumentationOk, problems: documentationProblems, setProblems: setDocumentationProblems },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                  <span className="text-slate-200 font-medium">{item.label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        item.setOk(!item.ok);
                        if (!item.ok) item.setProblems(false);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        item.ok ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        item.setProblems(!item.problems);
                        if (!item.problems) item.setOk(false);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        item.problems ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Com Problemas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Luzes */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Luzes</h2>
            
            <div className="space-y-4">
              {[
                { label: 'Luzes Dianteiras', ok: frontLightsOk, setOk: setFrontLightsOk, problems: frontLightsProblems, setProblems: setFrontLightsProblems },
                { label: 'Luzes Traseiras', ok: rearLightsOk, setOk: setRearLightsOk, problems: rearLightsProblems, setProblems: setRearLightsProblems },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                  <span className="text-slate-200 font-medium">{item.label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        item.setOk(!item.ok);
                        if (!item.ok) item.setProblems(false);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        item.ok ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        item.setProblems(!item.problems);
                        if (!item.problems) item.setOk(false);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        item.problems ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Com Problemas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Segurança */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Segurança</h2>
            
            <div className="space-y-4">
              {[
                { label: 'Cinto de Segurança', ok: seatbeltOk, setOk: setSeatbeltOk, problems: seatbeltProblems, setProblems: setSeatbeltProblems },
                { label: 'Extintor', ok: extinguisherOk, setOk: setExtinguisherOk, problems: extinguisherProblems, setProblems: setExtinguisherProblems },
                { label: 'Triângulo', ok: triangleOk, setOk: setTriangleOk, problems: triangleProblems, setProblems: setTriangleProblems },
                { label: 'Macaco', ok: jackOk, setOk: setJackOk, problems: jackProblems, setProblems: setJackProblems },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                  <span className="text-slate-200 font-medium">{item.label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        item.setOk(!item.ok);
                        if (!item.ok) item.setProblems(false);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        item.ok ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        item.setProblems(!item.problems);
                        if (!item.problems) item.setOk(false);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        item.problems ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Com Problemas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motor */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Motor</h2>
            
            <div className="space-y-4">
              {[
                { label: 'Óleo', ok: oilOk, setOk: setOilOk, problems: oilProblems, setProblems: setOilProblems },
                { label: 'Freios', ok: brakesOk, setOk: setBrakesOk, problems: brakesProblems, setProblems: setBrakesProblems },
                { label: 'Bateria', ok: batteryOk, setOk: setBatteryOk, problems: batteryProblems, setProblems: setBatteryProblems },
                { label: 'Radiador', ok: radiatorOk, setOk: setRadiatorOk, problems: radiatorProblems, setProblems: setRadiatorProblems },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                  <span className="text-slate-200 font-medium">{item.label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        item.setOk(!item.ok);
                        if (!item.ok) item.setProblems(false);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        item.ok ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        item.setProblems(!item.problems);
                        if (!item.problems) item.setOk(false);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        item.problems ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Com Problemas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observações Finais */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Observações Finais</h2>
            <textarea
              value={finalObservations}
              onChange={(e) => setFinalObservations(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px]"
              placeholder="Digite observações adicionais sobre o veículo..."
            />
          </div>

          {/* Assinaturas */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Assinaturas</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assinatura do Motorista *
                </label>
                {!driverSignatureSaved ? (
                  <button
                    type="button"
                    onClick={() => setShowDriverSignature(true)}
                    className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileSignature className="w-5 h-5" />
                    Assinar
                  </button>
                ) : (
                  <div className="relative">
                    <div className="w-full h-32 bg-slate-900 rounded-lg border-2 border-emerald-500 flex items-center justify-center">
                      <div className="text-emerald-500 font-medium">✓ Assinado</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDriverSignature(null);
                        setDriverSignatureSaved(false);
                      }}
                      className="absolute top-2 right-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Refazer
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assinatura do Vistoriador *
                </label>
                {!inspectorSignatureSaved ? (
                  <button
                    type="button"
                    onClick={() => setShowInspectorSignature(true)}
                    className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileSignature className="w-5 h-5" />
                    Assinar
                  </button>
                ) : (
                  <div className="relative">
                    <div className="w-full h-32 bg-slate-900 rounded-lg border-2 border-emerald-500 flex items-center justify-center">
                      <div className="text-emerald-500 font-medium">✓ Assinado</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInspectorSignature(null);
                        setInspectorSignatureSaved(false);
                      }}
                      className="absolute top-2 right-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Refazer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              'Salvando...'
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Checklist
              </>
            )}
          </button>
        </form>
      </main>

      {/* Signature Modals */}
      {showDriverSignature && (
        <SignaturePad
          title="Assinatura do Motorista"
          onSave={handleDriverSignature}
          onCancel={() => setShowDriverSignature(false)}
        />
      )}

      {showInspectorSignature && (
        <SignaturePad
          title="Assinatura do Vistoriador"
          onSave={handleInspectorSignature}
          onCancel={() => setShowInspectorSignature(false)}
        />
      )}
    </div>
  );
}
