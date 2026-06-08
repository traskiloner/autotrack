import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { CarDetail } from './pages/CarDetail';
import { Inventory } from './pages/Inventory';
import { Loader2, LogOut } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'cars' | 'inventory'>('cars');
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%vh', height: '100vh' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Cargando garaje...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Global Navbar */}
      <nav className="navbar">
        <div className="container navbar-container">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="nav-logo" onClick={() => { setCurrentTab('cars'); setSelectedCarId(null); }} style={{ cursor: 'pointer' }}>
              <span>🚗</span>
              <span>AUTOTRACK</span>
            </div>
            
            <ul className="nav-links">
              <li>
                <span 
                  className={`nav-link ${currentTab === 'cars' ? 'active' : ''}`}
                  onClick={() => { setCurrentTab('cars'); setSelectedCarId(null); }}
                >
                  Mis Coches
                </span>
              </li>
              <li>
                <span 
                  className={`nav-link ${currentTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => { setCurrentTab('inventory'); }}
                >
                  Inventario de Piezas
                </span>
              </li>
            </ul>
          </div>
          
          <div className="nav-user">
            <span>Bienvenido, <strong>{user?.username}</strong></span>
            <button className="btn-secondary btn-icon" onClick={logout} title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Tab Render */}
      <div style={{ flexGrow: 1 }}>
        {currentTab === 'cars' ? (
          selectedCarId !== null ? (
            <CarDetail carId={selectedCarId} onBack={() => setSelectedCarId(null)} />
          ) : (
            <Dashboard onSelectCar={(carId) => setSelectedCarId(carId)} />
          )
        ) : (
          <Inventory />
        )}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return <MainLayout />;
};

export default App;
