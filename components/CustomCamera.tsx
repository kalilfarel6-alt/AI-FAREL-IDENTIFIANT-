
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, Zap, Loader2, Maximize } from 'lucide-react';
import { useScanStore } from '../store/useScanStore';
import { useNavigate } from 'react-router-dom';

export const CustomCamera: React.FC = () => {
  const navigate = useNavigate();
  const startScan = useScanStore((state) => state.startScan);
  
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsLive(false);
  };

  const startCamera = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsLive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Accès caméra refusé ou non supporté.");
      fileInputRef.current?.click();
    } finally {
      setIsLoading(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Visual feedback: Flash
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      // Delay slightly for the flash effect to be seen
      setTimeout(() => handleImageCaptured(dataUrl), 200);
    }
  };

  const handleImageCaptured = (base64: string) => {
    stopCamera();
    startScan(base64);
    navigate('/result');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          handleImageCaptured(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="w-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      <canvas ref={canvasRef} className="hidden" />

      {!isLive ? (
        <div className="flex flex-col gap-4">
          <button
            onClick={startCamera}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 w-full bg-industrial-orange text-black font-black py-4 rounded-2xl shadow-[0_4px_20px_rgba(255,149,0,0.4)] active:scale-95 transition-all disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
            <span className="uppercase tracking-tight text-lg">Lancer le scan caméra</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-3 w-full bg-industrial-800 border border-gray-700 text-gray-400 font-bold py-3 rounded-xl active:bg-gray-700 transition-colors"
          >
            <Upload size={20} />
            <span>Importer une photo</span>
          </button>
          
          {error && <p className="text-red-500 text-xs text-center mt-2 font-bold uppercase">{error}</p>}
        </div>
      ) : (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
          {/* Visual Flash Effect */}
          {flashActive && <div className="absolute inset-0 z-[110] bg-white animate-pulse"></div>}

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
            <button 
              onClick={stopCamera}
              className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white active:scale-90 transition-transform"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/20">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-white tracking-widest uppercase">Live Identification</span>
            </div>
            <button className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white active:scale-90 transition-transform">
                <Zap size={24} className="opacity-50" />
            </button>
          </div>

          {/* Video Stream Container */}
          <div className="relative flex-1 bg-gray-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
               <div className="relative w-72 h-72">
                  {/* Dynamic Corners */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-industrial-orange rounded-tl-2xl animate-[pulse_2s_infinite]"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-industrial-orange rounded-tr-2xl animate-[pulse_2s_infinite]"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-industrial-orange rounded-bl-2xl animate-[pulse_2s_infinite]"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-industrial-orange rounded-br-2xl animate-[pulse_2s_infinite]"></div>
                  
                  {/* Focus Reticle */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-8 h-8 border border-white/50 rounded-full flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  </div>
               </div>
               
               <div className="mt-8 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                 <p className="text-white text-[10px] font-bold uppercase tracking-[0.2em]">Cadrage optimal détecté</p>
               </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="h-40 bg-industrial-900 flex items-center justify-around px-8 pb-6 border-t border-gray-800">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-2xl bg-industrial-800 flex flex-col items-center justify-center text-gray-400 active:scale-90 transition-all border border-gray-700"
            >
                <Upload size={20} />
                <span className="text-[8px] mt-1 uppercase font-bold">Galerie</span>
            </button>
            
            <div className="relative group">
                {/* Breathe animation ring */}
                <div className="absolute inset-0 -m-2 bg-industrial-orange/30 rounded-full animate-ping opacity-20 group-active:hidden"></div>
                <button 
                    onClick={capturePhoto}
                    className="relative w-24 h-24 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                    <div className="w-20 h-20 rounded-full bg-white shadow-inner flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-gray-200 animate-[pulse_3s_infinite] opacity-50"></div>
                    </div>
                </button>
            </div>

            <button 
                onClick={startCamera}
                className="w-14 h-14 rounded-2xl bg-industrial-800 flex flex-col items-center justify-center text-gray-400 active:scale-90 transition-all border border-gray-700"
            >
                <RefreshCw size={20} />
                <span className="text-[8px] mt-1 uppercase font-bold">Rotation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
