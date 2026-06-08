import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AlertCircle, ShieldAlert } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login, registerUser, apiFetch } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await apiFetch('/api/admin/setup-check');
        if (res && res.setupRequired) {
          setSetupRequired(true);
        }
      } catch (err) {
        console.error('Error checking admin setup:', err);
      }
    };
    checkSetup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let path = isLogin ? '/api/auth/login' : '/api/auth/register';
    if (setupRequired) {
      path = '/api/admin/setup';
    }

    const body = (isLogin && !setupRequired)
      ? { email, password } 
      : { username, email, password };

    try {
      const data = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (isLogin && !setupRequired) {
        login(data.token, data.user);
      } else {
        // Registering regular user or initial admin setup
        registerUser(data.token, data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">🚗💨</div>
          <h1 className="auth-title">AUTOTRACK</h1>
          <p className="auth-subtitle">Mantén el control de tus vehículos</p>
        </div>

        <div className="glass-card">
          {setupRequired ? (
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(255, 179, 0, 0.1)', border: '1px solid rgba(255, 179, 0, 0.2)', color: 'var(--warning)', marginBottom: '12px' }}>
                <ShieldAlert size={28} />
              </div>
              <h2 style={{ marginBottom: '8px' }}>Inicializar Superusuario</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.4' }}>
                No hay ninguna cuenta de administrador en el sistema. Crea el superusuario inicial para comenzar.
              </p>
            </div>
          ) : (
            <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
          )}

          {error && (
            <div 
              className="glass-container" 
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                borderColor: 'var(--danger)', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#ff8a8a',
                fontSize: '0.9rem'
              }}
            >
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {(!isLogin || setupRequired) && (
              <div className="form-group">
                <label htmlFor="username">Nombre de usuario administrador</label>
                <div style={{ position: 'relative' }}>
                  <User 
                    size={18} 
                    style={{ 
                      position: 'absolute', 
                      left: '16px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--text-muted)' 
                    }} 
                  />
                  <input
                    type="text"
                    id="username"
                    className="form-control"
                    placeholder="ej. admin"
                    style={{ paddingLeft: '48px', width: '100%' }}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin || setupRequired}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  placeholder="ejemplo@correo.com"
                  style={{ paddingLeft: '48px', width: '100%' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label htmlFor="password">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  placeholder="••••••••"
                  style={{ paddingLeft: '48px', width: '100%' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', padding: '14px' }}
              disabled={loading}
            >
              {loading ? 'Cargando...' : setupRequired ? 'Crear Superusuario' : isLogin ? 'Entrar' : 'Registrarse'}
            </button>
          </form>

          {!setupRequired && (
            <div className="auth-toggle">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              <span 
                className="auth-toggle-link" 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

