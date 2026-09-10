import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Video, Check, ArrowRight, RotateCcw, AlertCircle, X, Circle, ArrowLeft, Play, Pencil } from 'lucide-react';
import { useChecklist } from '../hooks/useChecklists';
import EditVehicleModal from '../components/EditVehicleModal';

export default function ChecklistVideo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { checklist, loading: checklistLoading } = useChecklist(parseInt(id!));
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const uploadingRef = useRef(false);

  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      setError('');
      setCameraReady(false);

      console.log('Starting camera for video...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Seu navegador não suporta acesso à câmera.');
        return;
      }

      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream | null = null;
      
      // Optimized constraints for mobile devices
      const mobileConstraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };

      try {
        console.log('Trying optimized mobile constraints...');
        stream = await navigator.mediaDevices.getUserMedia(mobileConstraints);
        console.log('Camera started successfully');
      } catch (envError) {
        console.log('Primary constraints failed, trying fallback:', envError);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: true
          });
        } catch (userError) {
          console.log('User camera failed, trying minimal:', userError);
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }
      }

      if (!stream) {
        throw new Error('Não foi possível iniciar a câmera');
      }

      console.log('Stream obtained, tracks:', stream.getTracks().length);
      streamRef.current = stream;
      
      if (videoRef.current) {
        // Reset video element completely
        videoRef.current.srcObject = null;
        videoRef.current.load();
        
        // Set attributes for mobile compatibility
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        
        // Set srcObject
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current;
          if (!video) { reject(new Error('Video element not found')); return; }

          const timeout = setTimeout(() => {
            console.log('Video timeout - trying to play anyway');
            resolve();
          }, 5000);

          const onCanPlay = () => {
            console.log('Video can play');
            clearTimeout(timeout);
            video.removeEventListener('canplay', onCanPlay);
            resolve();
          };

          video.addEventListener('canplay', onCanPlay);
          
          // Try to play immediately
          video.play().catch(e => console.log('Initial play failed:', e));
        });

        // Ensure video is playing
        if (videoRef.current.paused) {
          try {
            await videoRef.current.play();
          } catch (e) {
            console.log('Play after ready failed:', e);
          }
        }
      }

      setCameraReady(true);
      setCameraError('');
      console.log('Camera ready for recording!');
    } catch (err: any) {
      console.error('Camera error:', err);
      
      let errorMessage = 'Erro ao acessar a câmera. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '⚠️ Permissão negada.\n\nQuando aparecer a mensagem, toque em "Permitir".\n\niPhone: Ajustes → Safari → Câmera → Permitir\nAndroid: Toque no cadeado na barra de endereço';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'Nenhuma câmera encontrada.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Câmera em uso por outro app.';
      } else {
        errorMessage += err.message || 'Erro desconhecido.';
      }
      
      setCameraError(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCameraReady(false);
    setRecordingTime(0);
    setCameraError('');
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setCameraError('Câmera não está pronta. Toque em "Iniciar Câmera".');
      return;
    }

    try {
      chunksRef.current = [];
      
      // Find supported codec - prioritize most compatible options
      const options: MediaRecorderOptions = { videoBitsPerSecond: 1000000 }; // 1 Mbps for smaller files
      
      const codecsToTry = [
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
        ''
      ];
      
      for (const codec of codecsToTry) {
        if (!codec) {
          console.log('Using browser default codec');
          break;
        }
        if (MediaRecorder.isTypeSupported(codec)) {
          options.mimeType = codec;
          console.log('Using codec:', codec);
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', chunksRef.current.length);
        const mimeType = options.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log('Video blob created, size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoPreview(url);
        stopCamera();
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        setCameraError('Erro ao gravar vídeo');
        setRecording(false);
      };

      // Start recording with 2 second chunks for better memory management
      mediaRecorder.start(2000);
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      console.log('Recording started');
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setCameraError('Erro ao iniciar gravação: ' + err.message);
    }
  }, [stopCamera]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recording]);

  const retakeVideo = useCallback(() => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoBlob(null);
    setVideoPreview(null);
    setRecordingTime(0);
    setCameraError('');
    setShowStartButton(true);
  }, [videoPreview]);

  const uploadVideo = async () => {
    if (!videoBlob) {
      setError('Nenhum vídeo para enviar');
      return;
    }

    // Prevent double submission
    if (uploadingRef.current) {
      console.log('[ChecklistVideo] Já está enviando, ignorando clique duplicado');
      return;
    }

    try {
      uploadingRef.current = true;
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('video', videoBlob, 'vehicle-360.webm');
      formData.append('duration_seconds', Math.floor(recordingTime).toString());

      const response = await fetch(`/api/checklists/${id}/video`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar vídeo');
      }

      navigate(`/checklist/${id}/signatures`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar vídeo');
      uploadingRef.current = false;
    } finally {
      setUploading(false);
    }
  };

  const handleStartCamera = async () => {
    setShowStartButton(false);
    await startCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Fullscreen Camera/Recording View */}
      {!videoPreview && !showStartButton && (
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
              
              {/* Loading overlay when camera not ready */}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Iniciando câmera...</p>
                    <p className="text-white/60 text-sm mt-2">Aguarde o carregamento</p>
                  </div>
                </div>
              )}
              
              {/* Top Overlay */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 sm:p-6 pb-12 safe-area-inset-top">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowBackConfirm(true)}
                    className="text-white p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
                  >
                    <X className="w-7 h-7 sm:w-8 sm:h-8" />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-white font-bold text-lg sm:text-xl mb-1">
                      Vídeo 360°
                    </p>
                    {recording && (
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <p className="text-red-400 font-mono text-lg font-bold">
                          {formatTime(recordingTime)}
                        </p>
                      </div>
                    )}
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
                      onClick={handleStartCamera}
                      className="mt-2 px-4 py-2 bg-white/20 rounded-lg text-sm font-semibold"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  {!recording ? (
                    <>
                      <button
                        onClick={() => setShowBackConfirm(true)}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-white/20 backdrop-blur text-white rounded-full font-semibold text-sm sm:text-base active:scale-95 transition-transform"
                      >
                        Voltar
                      </button>
                      
                      <button
                        onClick={startRecording}
                        disabled={!cameraReady}
                        className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                      >
                        <Circle className="w-10 h-10 sm:w-12 sm:h-12 text-white fill-white" />
                      </button>

                      <div className="w-16 sm:w-24" />
                    </>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                    >
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded"></div>
                    </button>
                  )}
                </div>

                <div className="mt-4 sm:mt-6 text-center">
                  <p className="text-white/90 text-xs sm:text-sm">
                    {!recording 
                      ? (cameraReady ? 'Toque no botão vermelho para gravar' : 'Aguarde a câmera carregar')
                      : 'Grave todos os ângulos do veículo'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Camera Screen */}
      {!videoPreview && showStartButton && (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center safe-area-page">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 text-center">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-90" />
                <h1 className="text-2xl font-bold mb-2">Vídeo 360° do Veículo</h1>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-blue-100 text-sm">
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
              
              <div className="p-6">
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800 font-medium mb-2">📹 Instruções:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Grave pelo menos 20 segundos</li>
                    <li>• Mostre todos os ângulos do veículo</li>
                    <li>• Mantenha o celular firme</li>
                    <li>• Permita acesso à câmera e microfone</li>
                  </ul>
                </div>

                <button
                  onClick={handleStartCamera}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg shadow-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6" />
                  Gravar Vídeo
                </button>

                <div className="relative mt-3">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setVideoBlob(file);
                        setVideoPreview(url);
                        
                        // Try to get video duration
                        const video = document.createElement('video');
                        video.preload = 'metadata';
                        video.onloadedmetadata = () => {
                          setRecordingTime(Math.floor(video.duration));
                          URL.revokeObjectURL(video.src);
                        };
                        video.src = url;
                      }
                    }}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="w-full py-4 border-2 border-red-600 text-red-600 rounded-xl font-bold text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-3 cursor-pointer hover:bg-red-50 block"
                  >
                    <Video className="w-6 h-6" />
                    Selecionar do Dispositivo
                  </label>
                </div>

                <button
                  onClick={() => setShowBackConfirm(true)}
                  className="w-full mt-3 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview and Upload Screen */}
      {videoPreview && (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 safe-area-page">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowBackConfirm(true)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </button>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold">Vídeo Gravado</h1>
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
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Erro</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="p-4 sm:p-6">
                <div className="mb-4 sm:mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-900 text-sm sm:text-base">
                        Vídeo gravado com sucesso!
                      </p>
                      <p className="text-xs sm:text-sm text-green-700">
                        Duração: {formatTime(recordingTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 sm:mb-6">
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl bg-black">
                    <video
                      ref={previewVideoRef}
                      src={videoPreview}
                      controls
                      playsInline
                      webkit-playsinline="true"
                      className="w-full aspect-video"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={retakeVideo}
                    className="py-4 sm:py-5 border-2 sm:border-3 border-orange-400 text-orange-600 rounded-xl font-bold text-base sm:text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Gravar Novamente</span>
                    <span className="sm:hidden">Regravar</span>
                  </button>
                  
                  <button
                    onClick={uploadVideo}
                    disabled={uploading}
                    className="py-4 sm:py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-base sm:text-lg disabled:from-gray-400 disabled:to-gray-500 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Enviando...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Confirmar e Continuar</span>
                        <span className="sm:hidden">Confirmar</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  Voltar à etapa anterior?
                </h3>
                <p className="text-gray-600 text-sm">
                  O vídeo será descartado. Tem certeza?
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowBackConfirm(false)}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold active:scale-[0.98] transition-transform"
              >
                Cancelar
              </button>
              <button
                onClick={() => navigate(`/checklist/${id}/photos`)}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-semibold active:scale-[0.98] transition-transform"
              >
                Sim, Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
