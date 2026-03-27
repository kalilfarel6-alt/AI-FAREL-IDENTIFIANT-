import React from 'react';
import { CustomCamera } from '../components/CustomCamera';
import { Link } from 'react-router-dom';
import { BookOpen, History, Settings } from 'lucide-react';
import { useScanStore } from '../store/useScanStore';

export const HomeScreen: React.FC = () => {
  const history = useScanStore((state) => state.history);

  return (
    <div className="flex flex-col min-h-screen bg-industrial-900 text-white p-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 pt-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase leading-none">
            ETS MARCUS<br />
            <span className="text-industrial-orange text-3xl">APP IDENTIFICATION</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">Assistant Tuyauterie Industrielle</p>
        </div>
        <div className="bg-industrial-800 p-2 rounded-full">
          <Settings className="text-gray-400" size={24} />
        </div>
      </div>

      {/* Main Action Area */}
      <div className="bg-industrial-800 rounded-2xl p-6 shadow-xl border border-gray-700 mb-8">
        <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-industrial-900 flex items-center justify-center border-2 border-industrial-orange shadow-[0_0_15px_rgba(255,149,0,0.3)]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
            </div>
        </div>
        <h2 className="text-xl font-bold text-center mb-6">Nouvelle Identification</h2>
        <CustomCamera />
      </div>

      {/* Navigation Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/catalogs" className="bg-industrial-800 p-5 rounded-xl border border-gray-700 active:bg-gray-700 transition-colors">
          <BookOpen className="text-industrial-orange mb-3" size={28} />
          <h3 className="font-bold text-lg">Catalogues</h3>
          <p className="text-xs text-gray-400 mt-1">Fiches techniques PDF</p>
        </Link>
        
        <div className="bg-industrial-800 p-5 rounded-xl border border-gray-700 opacity-80">
          <History className="text-blue-400 mb-3" size={28} />
          <h3 className="font-bold text-lg">Historique</h3>
          <p className="text-xs text-gray-400 mt-1">{history.length} scans récents</p>
        </div>
      </div>

       {/* Recent History Preview (Bonus) */}
       {history.length > 0 && (
        <div className="mt-8">
          <h3 className="text-gray-400 text-sm font-bold uppercase mb-3 tracking-wider">Dernier Scan</h3>
          <div className="bg-industrial-800 rounded-lg p-3 flex items-center gap-4 border-l-4 border-industrial-orange">
             <img src={history[0].imageUrl} className="w-12 h-12 rounded bg-gray-900 object-cover" alt="Scan" />
             <div>
                <p className="font-bold text-white">{history[0].data?.type || "Non identifié"}</p>
                <p className="text-xs text-gray-400">{new Date(history[0].timestamp).toLocaleDateString()}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};