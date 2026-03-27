
import React, { useEffect } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HomeScreen } from './screens/HomeScreen';
import { ResultPage } from './screens/ResultPage';
import { CatalogsScreen } from './screens/CatalogsScreen';
import { getAvailableVoices } from './services/speechService';

const App: React.FC = () => {
  
  // Pre-load voices on mount as some browsers load them asynchronously
  useEffect(() => {
    // Guard against undefined window.speechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      getAvailableVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        getAvailableVoices();
      };
    }
  }, []);

  return (
    <MemoryRouter>
      <div className="antialiased font-sans text-gray-100 bg-industrial-900 min-h-screen">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/catalogs" element={<CatalogsScreen />} />
        </Routes>
      </div>
    </MemoryRouter>
  );
};

export default App;
