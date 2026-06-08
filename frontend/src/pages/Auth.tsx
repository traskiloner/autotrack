import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login, registerUser, apiFetch } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const path = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { email, password } 
      : { username, email, password };

    try {
      const data = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (isLogin) {
        login(data.token, data.user);
      } else {
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
          <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>

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
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="username">Nombre de usuario</label>
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
                    placeholder="Tu apodo"
                    style={{ paddingLeft: '48px', width: '100%' }}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
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
              {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Registrarse'}
            </button>
          </form>

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
        </div>
      </div>
    </div>
  );
};
