import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, FileText, ChevronDown, ChevronUp, Download, Search, X, Globe, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Manufacturer, WebResource } from '../types';
import { searchManufacturersResources } from '../services/geminiService';

const MANUFACTURERS: Manufacturer[] = [
  {
    id: '1',
    name: 'Samson',
    logo: 'S',
    catalogs: [
      { id: 'c1', title: 'Vannes de régulation Série 3241', year: '2023', size: '2.4 MB', url: '#' },
      { id: 'c2', title: 'Positionneurs électropneumatiques', year: '2022', size: '1.8 MB', url: '#' }
    ]
  },
  {
    id: '2',
    name: 'KSB',
    logo: 'K',
    catalogs: [
      { id: 'c3', title: 'Pompes centrifuges Etanorm', year: '2024', size: '5.1 MB', url: '#' },
      { id: 'c4', title: 'Robinetterie à papillon BOAX', year: '2023', size: '3.2 MB', url: '#' }
    ]
  },
  {
    id: '3',
    name: 'Spirax Sarco',
    logo: 'SP',
    catalogs: [
      { id: 'c5', title: 'Purgeurs de vapeur', year: '2023', size: '4.0 MB', url: '#' }
    ]
  },
  {
    id: '4',
    name: 'Saint-Gobain PAM',
    logo: 'SG',
    catalogs: [
      { id: 'c6', title: 'Canalisations Fonte Ductile', year: '2021', size: '12.5 MB', url: '#' }
    ]
  }
];

export const CatalogsScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Web Search States
  const [webResults, setWebResults] = useState<WebResource[]>([]);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);

  // Initialisation intelligente basée sur la navigation (depuis ResultPage)
  useEffect(() => {
    if (location.state && (location.state as any).searchQuery) {
        const query = (location.state as any).searchQuery as string;
        setSearchQuery(query);
        
        // Auto-expand si c'est un fabricant connu
        const match = MANUFACTURERS.find(m => m.name.toLowerCase() === query.toLowerCase());
        if (match) {
            setExpandedId(match.id);
        }
    }
  }, [location.state]);

  // Effet pour la recherche Web (Debounce)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 3) {
        setIsSearchingWeb(true);
        const results = await searchManufacturersResources(searchQuery);
        setWebResults(results);
        setIsSearchingWeb(false);
      } else {
        setWebResults([]);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDownload = (fileName: string) => {
      alert(`Téléchargement de ${fileName} lancé (simulation).`);
  }

  const filteredManufacturers = useMemo(() => {
    if (!searchQuery.trim()) return MANUFACTURERS;

    const lowerQuery = searchQuery.toLowerCase();
    
    return MANUFACTURERS.filter(mfg => {
      // Check if manufacturer name matches
      const nameMatch = mfg.name.toLowerCase().includes(lowerQuery);
      
      // Check if any catalog title matches
      const catalogMatch = mfg.catalogs.some(cat => 
        cat.title.toLowerCase().includes(lowerQuery)
      );

      return nameMatch || catalogMatch;
    });
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-industrial-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-industrial-800 p-4 pt-6 shadow-md border-b border-gray-700 sticky top-0 z-20">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Catalogues Fabricants</h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-3 border border-gray-600 rounded-xl leading-5 bg-industrial-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-industrial-orange focus:ring-1 focus:ring-industrial-orange sm:text-sm transition-colors"
            placeholder="Rechercher fabricant, document ou type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.length > 0 && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        {/* Suggestion rapide si scan récent */}
        {!searchQuery && location.state && (location.state as any).searchQuery && (
             <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-400">Suggestion :</span>
                <button 
                    onClick={() => setSearchQuery((location.state as any).searchQuery)}
                    className="bg-industrial-orange/20 text-industrial-orange text-xs px-3 py-1 rounded-full border border-industrial-orange/30 active:bg-industrial-orange/30"
                >
                    {(location.state as any).searchQuery}
                </button>
             </div>
        )}
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        
        {/* Section 1: Catalogues Locaux */}
        <div className="space-y-3">
            {searchQuery && <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Base de données locale</h2>}
            
            {filteredManufacturers.length === 0 ? (
            searchQuery && !isSearchingWeb && webResults.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                    Aucun catalogue local trouvé.
                </div>
            ) : null
            ) : (
            filteredManufacturers.map((mfg) => (
                <div key={mfg.id} className="bg-industrial-800 rounded-xl overflow-hidden border border-gray-700 transition-all">
                <button 
                    onClick={() => toggleExpand(mfg.id)}
                    className="w-full flex items-center justify-between p-4 active:bg-gray-700"
                >
                    <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-industrial-orange border border-gray-600">
                        {mfg.logo}
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-lg">{mfg.name}</h3>
                        <p className="text-xs text-gray-400">{mfg.catalogs.length} documents disponibles</p>
                    </div>
                    </div>
                    {expandedId === mfg.id ? <ChevronUp size={20} className="text-industrial-orange" /> : <ChevronDown size={20} className="text-gray-500" />}
                </button>
                
                {expandedId === mfg.id && (
                    <div className="bg-industrial-900/50 p-2 space-y-2 border-t border-gray-700">
                    {mfg.catalogs.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-industrial-800 border border-gray-700/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <FileText size={24} className="text-red-400 shrink-0" />
                            <div className="min-w-0">
                            <p className={`font-medium text-sm truncate pr-2 ${cat.title.toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery ? 'text-industrial-orange' : ''}`}>
                                {cat.title}
                            </p>
                            <p className="text-xs text-gray-500">{cat.year} • {cat.size}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleDownload(cat.title)}
                            className="p-2 bg-industrial-900 rounded-full text-industrial-orange hover:bg-black transition-colors"
                        >
                            <Download size={18} />
                        </button>
                        </div>
                    ))}
                    </div>
                )}
                </div>
            ))
            )}
        </div>

        {/* Section 2: Résultats Web (Google Search Grounding) */}
        {searchQuery.length >= 3 && (
            <div className="space-y-3 pt-2 border-t border-gray-800">
                 <h2 className="text-xs font-bold text-industrial-orange uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Globe size={14} /> Ressources Web Enrichies (Google)
                 </h2>
                 
                 {isSearchingWeb ? (
                     <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
                         <Loader2 className="animate-spin" size={20} />
                         <span className="text-sm">Recherche en ligne...</span>
                     </div>
                 ) : webResults.length > 0 ? (
                     <div className="grid grid-cols-1 gap-3">
                         {webResults.map((res, idx) => (
                             <a 
                                key={idx} 
                                href={res.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-industrial-800 p-3 rounded-xl border border-gray-700 flex items-start gap-3 active:bg-gray-700 transition-colors"
                             >
                                <div className="bg-blue-500/10 p-2 rounded-lg shrink-0">
                                    <Globe size={20} className="text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-sm text-blue-300 leading-tight mb-1 truncate">{res.title}</h4>
                                    <p className="text-xs text-gray-400 truncate">{res.source}</p>
                                </div>
                                <ExternalLink size={16} className="text-gray-500 mt-1" />
                             </a>
                         ))}
                     </div>
                 ) : (
                     <p className="text-gray-500 text-sm italic pl-2">Aucun résultat web supplémentaire trouvé.</p>
                 )}
            </div>
        )}

      </div>
      
      <div className="p-4 text-center text-gray-500 text-xs mt-auto">
        ETS MARCUS APP v1.1.0 • Powered by Gemini Vision
      </div>
    </div>
  );
};