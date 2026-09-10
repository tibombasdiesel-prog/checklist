import { useState, useRef } from 'react';
import { Camera, Check, X, Trash2 } from 'lucide-react';

interface DamageMark {
  id: string;
  x: number;
  y: number;
  description: string;
}

interface VehiclePhotoCaptureProps {
  label: string;
  instruction: string;
  photo: File | null;
  damageMarks?: DamageMark[];
  onPhotoCapture: (file: File) => void;
  onDamageMarksChange?: (marks: DamageMark[]) => void;
  allowDamageMarks?: boolean;
  required?: boolean;
}

export default function VehiclePhotoCapture({
  label,
  instruction,
  photo,
  damageMarks = [],
  onPhotoCapture,
  onDamageMarksChange,
  allowDamageMarks = false,
  required = true,
}: VehiclePhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [tempMark, setTempMark] = useState<{ x: number; y: number } | null>(null);
  const [markDescription, setMarkDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onPhotoCapture(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!allowDamageMarks || !photo) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setTempMark({ x, y });
    setShowMarkModal(true);
  };

  const handleSaveMark = () => {
    if (!tempMark || !onDamageMarksChange) return;

    const newMark: DamageMark = {
      id: Date.now().toString(),
      x: tempMark.x,
      y: tempMark.y,
      description: markDescription,
    };

    onDamageMarksChange([...damageMarks, newMark]);
    setShowMarkModal(false);
    setTempMark(null);
    setMarkDescription('');
  };

  const handleRemoveMark = (id: string) => {
    if (!onDamageMarksChange) return;
    onDamageMarksChange(damageMarks.filter(m => m.id !== id));
  };

  const handleRetake = () => {
    setPreview(null);
    if (onDamageMarksChange) {
      onDamageMarksChange([]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{label}</h3>
          <p className="text-sm text-slate-400">{instruction}</p>
        </div>
        {photo && (
          <button
            type="button"
            onClick={handleRetake}
            className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600 transition-colors"
          >
            Refazer
          </button>
        )}
      </div>

      {!photo ? (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
            id={`photo-${label}`}
            required={required}
          />
          <label
            htmlFor={`photo-${label}`}
            className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-600 rounded-2xl bg-slate-800/50 hover:bg-slate-800 hover:border-emerald-500 transition-all cursor-pointer"
          >
            <Camera className="w-12 h-12 text-slate-400 mb-3" />
            <span className="text-white font-medium">Tirar Foto</span>
            <span className="text-sm text-slate-400 mt-1">Toque para abrir a câmera</span>
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700">
            {preview && (
              <div className="relative">
                <img
                  ref={imageRef}
                  src={preview}
                  alt={label}
                  onClick={handleImageClick}
                  className={`w-full h-auto ${allowDamageMarks ? 'cursor-crosshair' : ''}`}
                />
                {/* Damage Marks */}
                {damageMarks.map((mark) => (
                  <div
                    key={mark.id}
                    style={{
                      position: 'absolute',
                      left: `${mark.x}%`,
                      top: `${mark.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="group"
                  >
                    <div className="w-8 h-8 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <X className="w-4 h-4 text-white" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMark(mark.id);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <Check className="w-4 h-4" />
              Foto capturada
            </div>
          </div>

          {allowDamageMarks && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <p className="text-sm text-slate-300">
                {damageMarks.length === 0
                  ? 'Toque na foto para marcar áreas com avarias, amassados ou danos'
                  : `${damageMarks.length} ponto(s) de dano marcado(s)`}
              </p>
            </div>
          )}

          {/* Damage marks list */}
          {allowDamageMarks && damageMarks.length > 0 && (
            <div className="space-y-2">
              {damageMarks.map((mark, index) => (
                <div
                  key={mark.id}
                  className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">{index + 1}</span>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {mark.description || 'Sem descrição'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMark(mark.id)}
                    className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mark Modal */}
      {showMarkModal && tempMark && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Marcar Dano</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descrição do dano
              </label>
              <input
                type="text"
                value={markDescription}
                onChange={(e) => setMarkDescription(e.target.value)}
                placeholder="Ex: Arranhão profundo, Amassado, Risco leve..."
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMarkModal(false);
                  setTempMark(null);
                  setMarkDescription('');
                }}
                className="flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMark}
                disabled={!markDescription.trim()}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
