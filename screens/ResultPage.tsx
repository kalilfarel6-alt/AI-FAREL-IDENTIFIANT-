import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScanStore } from '../store/useScanStore';
import { identifyPipingComponent } from '../services/geminiService';
import { speakResult, stopSpeech, setVoiceAccent, getVoiceAccent, VoiceAccent } from '../services/speechService';
import { ArrowLeft, Share2, Download, Volume2, Activity, Ruler, Maximize, AlertCircle, Wrench, Info, Loader2, Globe, Settings2 } from 'lucide-react';
import { PipingComponent } from '../types';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const currentScan = useScanStore((state) => state.currentScan);
  const setScanSuccess = useScanStore((state) => state.setScanSuccess);
  const setScanError = useScanStore((state) => state.setScanError);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [accent, setAccent] = useState<VoiceAccent>(getVoiceAccent());
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoPlayed = useRef(false); // Ref to ensure auto-play happens exactly once

  // Effect to trigger AI analysis on mount
  useEffect(() => {
    if (!currentScan || !currentScan.imageUrl) {
      navigate('/');
      return;
    }

    if (currentScan.loading && !currentScan.data && !currentScan.error) {
      const analyze = async () => {
        try {
          const result = await identifyPipingComponent(currentScan.imageUrl);
          setScanSuccess(result);
        } catch (err: any) {
          setScanError(err.message || "Erreur inconnue");
        }
      };
      analyze();
    }
  }, [currentScan, navigate, setScanSuccess, setScanError]);

  // Effect for 5-second speech delay (RUNS ONLY ONCE)
  useEffect(() => {
    if (currentScan?.data && !currentScan.loading && !hasAutoPlayed.current) {
      // Start countdown
      setCountdown(5);
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);

      timerRef.current = setTimeout(() => {
        // Double check auto played ref inside timeout to be safe
        if (!hasAutoPlayed.current) {
            handleSpeak(currentScan.data!, true);
            hasAutoPlayed.current = true;
        }
      }, 5000);

      return () => {
        clearInterval(interval);
        if (timerRef.current) clearTimeout(timerRef.current);
        // Important: we do NOT stop speech on unmount here if we want background audio, 
        // but typically we stop it when leaving the page.
        stopSpeech();
      };
    }
  }, [currentScan?.data, currentScan?.loading]);

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleAccent = () => {
      const newAccent = accent === 'universal' ? 'african' : 'universal';
      setAccent(newAccent);
      setVoiceAccent(newAccent);
      showToast(`Accent : ${newAccent === 'universal' ? 'Français Universel' : 'Africain'}`);
  };

  const handleSpeak = async (data: PipingComponent, isAutoTrigger = false) => {
    // Si c'est un clic manuel et que l'audio joue déjà
    if (!isAutoTrigger && isAudioPlaying) {
        showToast("⏳ Lecture vocale en cours...");
        return;
    }

    // Construction du texte complet
    const text = `
      Analyse terminée. J'ai identifié : ${data.type}.
      
      ${data.description}

      Voici les détails techniques.
      Diamètre nominal : ${data.dn || 'Non spécifié'}.
      Pression nominale : ${data.pn ? data.pn + ' bars' : 'Non spécifiée'}.
      Matériau : ${data.material}.
      Raccordement : ${data.connection}.
      Marque probable : ${data.brands}.
      Normes détectées : ${data.standards.length > 0 ? data.standards.join(', ') : 'Aucune'}.

      Concernant la maintenance et la réparation :
      ${data.maintenance_instructions}
    `;
    
    setIsAudioPlaying(true);
    const started = await speakResult(text, () => {
        setIsAudioPlaying(false);
    });

    if (!started && !isAutoTrigger) {
        // Should logically not happen due to isAudioPlaying check, but safe guard
        showToast("⚠️ Le système vocal est occupé.");
    }
    
    setCountdown(0); 
  };

  if (!currentScan) return null;

  return (
    <div className="min-h-screen bg-industrial-900 text-white flex flex-col relative">
      
      {/* Toast Notification */}
      {toastMessage && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-industrial-800 border border-industrial-orange text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
              <Info size={18} className="text-industrial-orange" />
              <span className="font-medium text-sm">{toastMessage}</span>
          </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={() => navigate('/')} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-2">
            <button className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white">
                <Share2 size={24} />
            </button>
        </div>
      </div>

      {/* Image Area */}
      <div className="h-[40vh] w-full relative bg-black">
        <img 
            src={currentScan.imageUrl} 
            alt="Scan" 
            className="w-full h-full object-contain"
        />
        {currentScan.loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-industrial-orange mb-4"></div>
                <p className="text-industrial-orange font-bold animate-pulse">Analyse IA en cours...</p>
            </div>
        )}
      </div>

      {/* Result Content */}
      <div className="flex-1 bg-industrial-900 -mt-6 rounded-t-3xl relative z-20 px-6 pt-8 pb-10">
        
        {currentScan.error ? (
             <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Erreur d'identification</h3>
                <p className="text-gray-400 mb-6">{currentScan.error}</p>
                <button onClick={() => navigate('/')} className="bg-industrial-800 px-6 py-2 rounded-lg">Réessayer</button>
             </div>
        ) : currentScan.data ? (
            <>
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-black uppercase tracking-wide text-white leading-tight max-w-[80%]">
                        {currentScan.data.type}
                    </h2>
                    <div className="flex flex-col items-end">
                        <span className="bg-industrial-orange text-black text-xs font-bold px-2 py-1 rounded">
                            {currentScan.data.confidence}% Sûr
                        </span>
                    </div>
                </div>

                {/* Description Section */}
                <div className="mb-6">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Info size={12} /> Description
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        {currentScan.data.description}
                    </p>
                </div>

                {/* Tech Specs Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-industrial-800 p-3 rounded-xl border border-gray-700">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                            <Ruler size={14} /> <span>Diamètre (DN)</span>
                        </div>
                        <p className="text-xl font-bold text-white">{currentScan.data.dn || 'N/A'}</p>
                    </div>
                    <div className="bg-industrial-800 p-3 rounded-xl border border-gray-700">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                            <Activity size={14} /> <span>Pression (PN)</span>
                        </div>
                        <p className="text-xl font-bold text-white">{currentScan.data.pn ? `${currentScan.data.pn} bar` : 'N/A'}</p>
                    </div>
                    <div className="bg-industrial-800 p-3 rounded-xl border border-gray-700 col-span-2">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                            <Maximize size={14} /> <span>Matériau & Raccordement</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                            {currentScan.data.material}, {currentScan.data.connection}
                        </p>
                    </div>
                </div>

                {/* Maintenance Section (New) */}
                <div className="bg-industrial-800/50 p-4 rounded-xl border border-gray-700/50 mb-6">
                    <h3 className="text-industrial-orange text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Wrench size={12} /> Maintenance & Réparation
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {currentScan.data.maintenance_instructions}
                    </p>
                </div>

                {/* Norms & Brand */}
                <div className="space-y-3 mb-8">
                     <div className="flex justify-between border-b border-gray-700 pb-2">
                        <span className="text-gray-400">Marque probable</span>
                        <span className="font-medium text-industrial-orange">{currentScan.data.brands}</span>
                     </div>
                     <div className="flex justify-between border-b border-gray-700 pb-2">
                        <span className="text-gray-400">Normes</span>
                        <span className="font-medium text-white text-right">{currentScan.data.standards.join(', ')}</span>
                     </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    {/* Audio Button Group */}
                    <div className="flex-1 flex gap-2">
                        <button 
                            onClick={() => handleSpeak(currentScan.data!)}
                            className={`flex-grow border text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                                isAudioPlaying 
                                ? 'bg-industrial-orange/20 border-industrial-orange text-industrial-orange' 
                                : 'bg-industrial-800 border-gray-600 active:bg-gray-700'
                            }`}
                        >
                            {isAudioPlaying ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Volume2 size={20} className={countdown && countdown > 0 ? "animate-pulse text-industrial-orange" : ""} />
                            )}
                            <span className="whitespace-nowrap">
                                {isAudioPlaying 
                                    ? "Lecture..." 
                                    : countdown && countdown > 0 
                                        ? `${countdown}s` 
                                        : "Écouter"
                                }
                            </span>
                        </button>
                        
                        {/* Accent Toggle */}
                        <button 
                            onClick={toggleAccent}
                            className={`w-14 rounded-xl border flex items-center justify-center transition-all ${
                                accent === 'african' 
                                ? 'bg-green-900/40 border-green-600 text-green-400' 
                                : 'bg-industrial-800 border-gray-600 text-gray-400'
                            }`}
                            title={accent === 'universal' ? "Passer à l'accent Africain" : "Passer à l'accent Universel"}
                        >
                            <Globe size={20} />
                            <span className="sr-only">Changer l'accent</span>
                        </button>
                    </div>
                    
                    <button 
                         onClick={() => navigate('/catalogs', { 
                             state: { 
                                 searchQuery: currentScan.data.brands !== "Inconnue" ? currentScan.data.brands : currentScan.data.type 
                             } 
                         })}
                         className="flex-1 bg-industrial-orange text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-orange-500/20"
                    >
                        <Download size={20} />
                        <span>Fiche Tech.</span>
                    </button>
                </div>
            </>
        ) : null}
      </div>
    </div>
  );
};