import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, login, apiFetch } = useAuth();
  
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  const handleSendTestEmail = async () => {
    setTestLoading(true);
    setTestError(null);
    setTestSuccess(null);

    try {
      await apiFetch('/api/users/test-email', {
        method: 'POST',
      });
      setTestSuccess('Correo de prueba enviado. Por favor, revisa tu bandeja de entrada o los logs de la consola del backend.');
    } catch (err: any) {
      setTestError(err.message || 'Error al enviar el correo de prueba');
    } finally {
      setTestLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password && password !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const body: any = {
        username,
        email,
      };

      if (password && password.trim() !== '') {
        body.password = password;
      }

      const data = await apiFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      // Update state and localStorage via auth context
      login(data.token, data.user);
      
      setSuccess('Tus detalles se han actualizado con éxito');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>👤</span> MI PERFIL
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Gestiona los detalles de tu cuenta de acceso y credenciales
        </p>
      </div>

      <div className="glass-card" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: 600 }}>Detalles del Usuario</h2>

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

        {success && (
          <div 
            className="glass-container" 
            style={{ 
              background: 'rgba(16, 185, 129, 0.1)', 
              borderColor: 'var(--success)', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#a7f3d0',
              fontSize: '0.9rem'
            }}
          >
            <CheckCircle2 size={20} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
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
                required
              />
            </div>
          </div>

          {/* Email */}
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

          <hr style={{ border: '0', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '28px 0' }} />

          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: 600 }}>Cambiar Contraseña</h2>

          {/* New Password */}
          <div className="form-group">
            <label htmlFor="password">Nueva Contraseña <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>(dejar vacío para mantener actual)</span></label>
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
                placeholder="Mínimo 6 caracteres"
                style={{ paddingLeft: '48px', width: '100%' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
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
                id="confirmPassword"
                className="form-control"
                placeholder="Repite la contraseña"
                style={{ paddingLeft: '48px', width: '100%' }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={password !== ''}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Guardando cambios...
              </>
            ) : (
              <>
                <Save size={18} />
                Guardar Cambios
              </>
            )}
          </button>
        </form>
      </div>

      {user?.role === 'admin' && (
        <div className="glass-card" style={{ padding: '28px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '12px', fontWeight: 600 }}>Prueba de Servidor de Correos</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Envía un correo de prueba a tu dirección (<strong>{email}</strong>) para comprobar que la configuración SMTP funciona correctamente.
          </p>

          {testError && (
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
              <span>{testError}</span>
            </div>
          )}

          {testSuccess && (
            <div 
              className="glass-container" 
              style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                borderColor: 'var(--success)', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#a7f3d0',
                fontSize: '0.9rem'
              }}
            >
              <CheckCircle2 size={20} />
              <span>{testSuccess}</span>
            </div>
          )}

          <button 
            type="button" 
            className="btn-secondary" 
            style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={handleSendTestEmail}
            disabled={testLoading}
          >
            {testLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Enviando correo de prueba...
              </>
            ) : (
              <>
                <Mail size={18} />
                Enviar Correo de Prueba
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
