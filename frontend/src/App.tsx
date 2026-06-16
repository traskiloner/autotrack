import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { CarDetail } from './pages/CarDetail';
import { Inventory } from './pages/Inventory';
import { AdminPanel } from './pages/AdminPanel';
import { Profile } from './pages/Profile';
import { Loader2, LogOut, Car, Package, User, ShieldCheck } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'cars' | 'inventory' | 'admin' | 'profile'>('cars');
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', height: '100vh' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Cargando garaje...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="app-main-layout">
      {/* Global Navbar */}
      <nav className="navbar">
        <div className="container navbar-container">
          <div className="navbar-left">
            <div className="nav-logo" onClick={() => { setCurrentTab('cars'); setSelectedCarId(null); }} style={{ cursor: 'pointer' }}>
              <span className="logo-emoji">🚗</span>
              <span className="logo-text">AUTOTRACK</span>
            </div>
            
            <ul className="nav-links">
              <li>
                <span 
                  className={`nav-link ${currentTab === 'cars' ? 'active' : ''}`}
                  onClick={() => { setCurrentTab('cars'); setSelectedCarId(null); }}
                >
                  <Car size={20} className="nav-icon" />
                  <span className="nav-text">Mis Coches</span>
                </span>
              </li>
              <li>
                <span 
                  className={`nav-link ${currentTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => { setCurrentTab('inventory'); }}
                >
                  <Package size={20} className="nav-icon" />
                  <span className="nav-text">Inventario</span>
                </span>
              </li>
              <li>
                <span 
                  className={`nav-link ${currentTab === 'profile' ? 'active' : ''}`}
                  onClick={() => { setCurrentTab('profile'); }}
                >
                  <User size={20} className="nav-icon" />
                  <span className="nav-text">Mi Perfil</span>
                </span>
              </li>
              {user?.role === 'admin' && (
                <li>
                  <span 
                    className={`nav-link ${currentTab === 'admin' ? 'active' : ''}`}
                    onClick={() => { setCurrentTab('admin'); setSelectedCarId(null); }}
                  >
                    <ShieldCheck size={20} className="nav-icon" />
                    <span className="nav-text">Admin</span>
                  </span>
                </li>
              )}
            </ul>
          </div>
          
          <div className="nav-user">
            <span className="user-greeting">Bienvenido, <strong style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('profile')} title="Ver mi perfil">{user?.username}</strong></span>
            <button className="btn-secondary btn-icon logout-btn" onClick={logout} title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Tab Render */}
      <div style={{ flexGrow: 1 }}>
        {currentTab === 'admin' ? (
          <AdminPanel />
        ) : currentTab === 'profile' ? (
          <Profile />
        ) : currentTab === 'cars' ? (
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
