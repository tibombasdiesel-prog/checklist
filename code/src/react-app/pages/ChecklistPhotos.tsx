import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Check, RotateCcw, AlertCircle, X, ArrowLeft, Pencil } from 'lucide-react';
import { useChecklist } from '../hooks/useChecklists';
import EditVehicleModal from '../components/EditVehicleModal';

type PhotoType = 'front' | 'back' | 'left' | 'right' | 'roof';

interface PhotoCapture {
  type: PhotoType;
  label: string;
  blob: Blob | null;
  preview: string | null;
}

export default function ChecklistPhotos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { checklist, loading: checklistLoading } = useChecklist(parseInt(id!));
  const [photos, setPhotos] = useState<PhotoCapture[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (checklist) {
      const photoTypes: PhotoCapture[] = [
        { type: 'front', label: 'Frente do Veículo', blob: null, preview: null },
        { type: 'back', label: 'Traseira do Veículo', blob: null, preview: null },
        { type: 'left', label: 'Lado Esquerdo', blob: null, preview: null },
        { type: 'right', label: 'Lado Direito', blob: null, preview: null },
      ];

      if (checklist.vehicle_type === 'light') {
        photoTypes.push({ type: 'roof', label: 'Teto do Veículo', blob: null, preview: null });
      }

      setPhotos(photoTypes);
    }
  }, [checklist]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      setError('');
      setCameraReady(false);
      setCapturing(true);

      // Small delay for UI transition
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Seu navegador não suporta câmera.');
        return;
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream | null = null;
      
      // Optimized mobile constraints
      const mobileConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 }
        },
        audio: false
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(mobileConstraints);
      } catch (envError) {
        console.log('Environment camera failed:', envError);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
          });
        } catch (userError) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      if (!stream) {
        throw new Error('Não foi possível iniciar a câmera');
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.load();
        
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve) => {
          const video = videoRef.current;
          if (!video) { resolve(); return; }

          const timeout = setTimeout(() => resolve(), 5000);

          const onCanPlay = () => {
            clearTimeout(timeout);
            video.removeEventListener('canplay', onCanPlay);
            resolve();
          };

          video.addEventListener('canplay', onCanPlay);
          video.play().catch(() => {});
        });

        if (videoRef.current.paused) {
          try { await videoRef.current.play(); } catch (e) {}
        }
      }

      setCameraReady(true);
      setCameraError('');
    } catch (err: any) {
      console.error('Camera error:', err);
      
      let errorMessage = 'Erro ao acessar a câmera. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '⚠️ Permissão negada.\n\nToque em "Permitir" quando solicitado.\n\niPhone: Ajustes → Safari → Câmera → Permitir';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'Câmera não encontrada.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Câmera em uso por outro app.';
      } else {
        errorMessage += err.message || 'Erro desconhecido.';
      }
      
      setCameraError(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturing(false);
    setCameraReady(false);
    setCameraError('');
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !cameraReady) {
      setCameraError('Câmera não está pronta. Aguarde...');
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Câmera não está pronta. Aguarde...');
      return;
    }

    const canvas = document.createElement('canvas');
    // Use smaller dimensions for better performance
    const maxWidth = 1024;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Lower quality for smaller files
    canvas.toBlob((blob) => {
      if (blob) {
        const preview = URL.createObjectURL(blob);
        setPhotos(prev => {
          const newPhotos = [...prev];
          newPhotos[currentPhotoIndex] = {
            ...newPhotos[currentPhotoIndex],
            blob,
            preview,
          };
          return newPhotos;
        });
        stopCamera();
      } else {
        setCameraError('Erro ao capturar foto. Tente novamente.');
      }
    }, 'image/jpeg', 0.7);
  }, [currentPhotoIndex, cameraReady, stopCamera]);

  const retakePhoto = useCallback(() => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      if (newPhotos[currentPhotoIndex].preview) {
        URL.revokeObjectURL(newPhotos[currentPhotoIndex].preview!);
      }
      newPhotos[currentPhotoIndex] = {
        ...newPhotos[currentPhotoIndex],
        blob: null,
        preview: null,
      };
      return newPhotos;
    });
    setCameraError('');
  }, [currentPhotoIndex]);

  const confirmAndNext = useCallback(() => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  }, [currentPhotoIndex, photos.length]);

  const uploadPhotos = async () => {
    // Prevent double submission
    if (uploadingRef.current) {
      console.log('[ChecklistPhotos] Já está enviando, ignorando clique duplicado');
      return;
    }

    try {
      uploadingRef.current = true;
      setUploading(true);
      setError('');

      for (const photo of photos) {
        if (!photo.blob) {
          setError(`Foto "${photo.label}" não foi capturada`);
          uploadingRef.current = false;
          setUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append('photo', photo.blob, `${photo.type}.jpg`);
        formData.append('photo_type', photo.type);

        const response = await fetch(`/api/checklists/${id}/photos`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Erro ao enviar foto ${photo.label}`);
        }
      }

      navigate(`/checklist/${id}/video`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar fotos');
      uploadingRef.current = false;
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      photos.forEach(photo => {
        if (photo.preview) URL.revokeObjectURL(photo.preview);
      });
    };
  }, []);

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

  const currentPhoto = photos[currentPhotoIndex];
  const isLastPhoto = currentPhotoIndex === photos.length - 1;

  return (
    <>
      {/* Fullscreen Camera Modal */}
      {capturing && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="relative w-full h-full flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                webkit-playsinline="true"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ 
                  backgroundColor: '#1a1a1a',
                  WebkitTransform: 'translateZ(0)',
                  transform: 'translateZ(0)'
                }}
              />
              
              {/* Loading overlay */}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Iniciando câmera...</p>
                  </div>
                </div>
              )}
              
              {/* Top Overlay */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 sm:p-6 pb-12 safe-area-inset-top">
                <div className="flex items-center justify-between">
                  <button
                    onClick={stopCamera}
                    className="text-white p-2 hover:bg-white/20 rounded-full active:scale-95 transition-transform"
                  >
                    <X className="w-7 h-7 sm:w-8 sm:h-8" />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-white font-bold text-lg sm:text-xl mb-1">
                      {currentPhoto?.label}
                    </p>
                    <p className="text-white/80 text-sm">
                      {currentPhotoIndex + 1} de {photos.length}
                    </p>
                  </div>
                  <div className="w-12" />
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 sm:p-8 pt-16 sm:pt-24 safe-area-inset-bottom">
                {cameraError && (
                  <div className="mb-4 p-3 bg-red-500/90 backdrop-blur text-white rounded-xl text-center">
                    <p className="text-sm whitespace-pre-line">{cameraError}</p>
                    <button 
                      onClick={startCamera}
                      className="mt-2 px-4 py-2 bg-white/20 rounded-lg text-sm font-semibold"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  <button
                    onClick={stopCamera}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-white/20 backdrop-blur text-white rounded-full font-semibold text-sm sm:text-base active:scale-95 transition-transform"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={capturePhoto}
                    disabled={!cameraReady}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform disabled:opacity-50"
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-600 rounded-full flex items-center justify-center">
                      <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                  </button>

                  <div className="w-16 sm:w-24" />
                </div>

                <div className="mt-4 sm:mt-6 text-center">
                  <p className="text-white/90 text-xs sm:text-sm">
                    {cameraReady ? 'Toque no botão para fotografar' : 'Aguarde a câmera carregar'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 safe-area-page">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowBackConfirm(true)}
                    className="p-2 hover:bg-white/10 rounded-lg active:scale-95 transition-transform"
                  >
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Fotos do Veículo</h1>
                    <p className="text-blue-100 text-xs sm:text-sm">
                      {checklist.brand_model} - {checklist.license_plate}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="p-2 hover:bg-white/10 rounded-lg active:scale-95 transition-transform"
                    title="Editar informações"
                  >
                    <Pencil className="w-5 h-5 text-white" />
                  </button>
                </div>
                <img 
                  src="/assets/logo-bombas-diesel-light.png" 
                  alt="Bombas Diesel" 
                  className="h-10 sm:h-12 object-contain"
                  loading="lazy"
                />
              </div>
            </div>

            {error && (
              <div className="m-4 sm:m-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Erro</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="p-4 sm:p-6">
              {/* Progress */}
              <div className="mb-4 sm:mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    {currentPhotoIndex + 1} de {photos.length}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-blue-600">
                    {photos.filter(p => p.blob).length} completas
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${(photos.filter(p => p.blob).length / photos.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Photo Info */}
              <div className="mb-4 sm:mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900 text-sm sm:text-base">
                      {currentPhoto?.preview ? '✓ Foto capturada!' : currentPhoto?.label}
                    </p>
                    <p className="text-xs sm:text-sm text-blue-700">
                      {currentPhoto?.preview 
                        ? 'Revise e confirme ou tire novamente'
                        : 'Toque em "Iniciar Câmera"'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview or Placeholder */}
              {currentPhoto?.preview ? (
                <div className="mb-4 sm:mb-6 relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={currentPhoto.preview}
                    alt={currentPhoto.label}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <div className="bg-green-500 text-white rounded-full p-2 sm:p-3 shadow-lg">
                      <Check className="w-5 h-5 sm:w-8 sm:h-8" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 sm:mb-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-3 border-dashed border-gray-300 aspect-[4/3]">
                  <Camera className="w-16 h-16 sm:w-24 sm:h-24 text-gray-400 mb-3 sm:mb-4" />
                  <p className="text-gray-700 font-bold text-lg sm:text-xl mb-1">{currentPhoto?.label}</p>
                  <p className="text-gray-500 text-xs sm:text-sm">Pronto para fotografar</p>
                </div>
              )}

              {/* Thumbnails */}
              <div className="mb-4 sm:mb-6">
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.type}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`relative aspect-square rounded-lg sm:rounded-xl border-2 sm:border-3 overflow-hidden transition-all ${
                        index === currentPhotoIndex
                          ? 'border-blue-600 ring-2 sm:ring-4 ring-blue-200 scale-105'
                          : photo.preview
                          ? 'border-green-500 opacity-80'
                          : 'border-gray-300 opacity-60'
                      }`}
                    >
                      {photo.preview ? (
                        <>
                          <img src={photo.preview} alt={photo.label} className="w-full h-full object-cover" />
                          <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-green-500 text-white rounded-full p-0.5 sm:p-1">
                            <Check className="w-2 h-2 sm:w-3 sm:h-3" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center">
                          <Camera className="w-3 h-3 sm:w-5 sm:h-5 text-gray-400" />
                          <span className="text-[8px] sm:text-[10px] text-gray-500 mt-0.5">{index + 1}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {!currentPhoto?.preview ? (
                  <>
                    <button
                      onClick={startCamera}
                      className="w-full py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-base sm:text-lg shadow-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-3"
                    >
                      <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                      Tirar Foto
                    </button>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const preview = URL.createObjectURL(file);
                            setPhotos(prev => {
                              const newPhotos = [...prev];
                              newPhotos[currentPhotoIndex] = {
                                ...newPhotos[currentPhotoIndex],
                                blob: file,
                                preview,
                              };
                              return newPhotos;
                            });
                          }
                        }}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="w-full py-4 sm:py-5 border-2 border-blue-600 text-blue-600 rounded-xl font-bold text-base sm:text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-3 cursor-pointer hover:bg-blue-50"
                      >
                        <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                        Selecionar do Dispositivo
                      </label>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={retakePhoto}
                      className="py-4 sm:py-5 border-2 sm:border-3 border-orange-400 text-orange-600 rounded-xl font-bold text-base sm:text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Tirar Novamente</span>
                      <span className="sm:hidden">Refazer</span>
                    </button>
                    
                    <button
                      onClick={!isLastPhoto ? confirmAndNext : uploadPhotos}
                      disabled={uploading}
                      className="py-4 sm:py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-base sm:text-lg disabled:from-gray-400 disabled:to-gray-500 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>{isLastPhoto ? 'Enviar' : 'Feito'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Back Confirmation */}
      {showBackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Voltar?</h3>
                <p className="text-gray-600 text-sm">As fotos serão perdidas.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBackConfirm(false)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold active:scale-[0.98] transition-transform"
              >
                Cancelar
              </button>
              <button
                onClick={() => navigate('/checklist/new')}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold active:scale-[0.98] transition-transform"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
