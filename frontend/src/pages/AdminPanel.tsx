import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Car, 
  Wrench, 
  Fuel, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  ShieldAlert, 
  UserCheck, 
  Package, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';

interface GlobalStats {
  totalUsers: number;
  totalCars: number;
  totalFuelLogs: number;
  totalMaintenanceCost: number;
  totalInventoryStock: number;
  partsCount: number;
}

interface UserListItem {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  _count: {
    cars: number;
    inventory: number;
  };
}

interface CarListItem {
  id: number;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  mileage: number;
  user: {
    id: number;
    username: string;
    email: string;
  } | null;
}

export const AdminPanel: React.FC = () => {
  const { apiFetch, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'cars'>('dashboard');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [cars, setCars] = useState<CarListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User CRUD states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  
  const [modalUsername, setModalUsername] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalRole, setModalRole] = useState('user');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const fetchTabRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'dashboard') {
        const statsData = await apiFetch('/api/admin/stats');
        setStats(statsData);
      } else if (activeTab === 'users') {
        const usersData = await apiFetch('/api/admin/users');
        setUsers(usersData);
      } else if (activeTab === 'cars') {
        const carsData = await apiFetch('/api/admin/cars');
        setCars(carsData);
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener datos de administración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabRequests();
  }, [activeTab]);

  const openCreateModal = () => {
    setEditingUser(null);
    setModalUsername('');
    setModalEmail('');
    setModalPassword('');
    setModalRole('user');
    setShowUserModal(true);
  };

  const openEditModal = (target: UserListItem) => {
    setEditingUser(target);
    setModalUsername(target.username);
    setModalEmail(target.email);
    setModalPassword(''); // Empty by default
    setModalRole(target.role);
    setShowUserModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setError(null);

    const isEdit = !!editingUser;
    const url = isEdit ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
    const method = isEdit ? 'PUT' : 'POST';
    
    const body: any = {
      username: modalUsername,
      email: modalEmail,
      role: modalRole
    };

    if (!isEdit || (modalPassword && modalPassword.trim() !== '')) {
      body.password = modalPassword;
    }

    try {
      await apiFetch(url, {
        method,
        body: JSON.stringify(body)
      });
      setShowUserModal(false);
      // Reload current list
      fetchTabRequests();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al procesar el usuario');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteUser = async (targetId: number, targetName: string) => {
    if (targetId === currentUser?.id) {
      alert('No puedes eliminar tu propia cuenta administradora.');
      return;
    }
    
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${targetName}"?\nSe borrarán TODOS sus coches, mantenimientos y piezas registradas.`)) {
      return;
    }

    try {
      setLoading(true);
      await apiFetch(`/api/admin/users/${targetId}`, {
        method: 'DELETE'
      });
      fetchTabRequests();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el usuario');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Admin Title & Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛡️</span> PANEL DE ADMINISTRACIÓN
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Gestión centralizada de usuarios, vehículos y métricas globales
            </p>
          </div>
          <button 
            onClick={fetchTabRequests} 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="detail-tabs" style={{ background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignSelf: 'flex-start', border: '1px solid rgba(255,255,255,0.04)' }}>
          <button 
            className={`detail-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Resumen Global
          </button>
          <button 
            className={`detail-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Usuarios ({users.length || '...'})
          </button>
          <button 
            className={`detail-tab ${activeTab === 'cars' ? 'active' : ''}`}
            onClick={() => setActiveTab('cars')}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Flota Global ({cars.length || '...'})
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-container" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px', color: '#ff9292' }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading && !showUserModal ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
          <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)' }} />
          <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>Obteniendo datos del sistema...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && stats && (
            <div className="animate-fade-in">
              {/* Stat Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                
                {/* Users Stat */}
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase' }}>Usuarios Totales</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.2 }}>{stats.totalUsers}</span>
                  </div>
                </div>

                {/* Cars Stat */}
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <Car size={24} />
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase' }}>Vehículos</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.2 }}>{stats.totalCars}</span>
                  </div>
                </div>

                {/* Maintenance Cost Stat */}
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <Wrench size={24} />
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase' }}>Inversión en Talleres</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.2 }}>{stats.totalMaintenanceCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</span>
                  </div>
                </div>

                {/* Fuel Logs Stat */}
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <Fuel size={24} />
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase' }}>Repostajes Registrados</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.2 }}>{stats.totalFuelLogs}</span>
                  </div>
                </div>

              </div>

              {/* Extra Summary Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* System Activity */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={18} style={{ color: 'var(--primary)' }} /> Componentes de Inventario y Base de Datos
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Repuestos únicos en inventarios:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{stats.partsCount} referencias</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Stock acumulado de piezas:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{stats.totalInventoryStock} unidades</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Promedio vehículos por usuario:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{(stats.totalUsers > 0 ? (stats.totalCars / stats.totalUsers).toFixed(1) : 0)} coches</strong>
                    </div>
                  </div>
                </div>

                {/* System info */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 Consejos de Administración
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                    Como administrador, puedes gestionar las cuentas de usuario de la plataforma. Si detectas que un usuario tiene problemas con sus claves, puedes editar su cuenta en la pestaña de <strong>Usuarios</strong> e ingresar una nueva contraseña para restaurar su acceso.
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginTop: '10px', margin: 0 }}>
                    Al eliminar una cuenta de usuario, la base de datos se limpia de manera eficiente en cascada, eliminando todos sus vehículos, alertas, facturas e historial de repostaje.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Listado de Usuarios Registrados</h3>
                <button 
                  onClick={openCreateModal} 
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', padding: '8px 14px' }}
                >
                  <Plus size={16} />
                  Crear Usuario
                </button>
              </div>

              {users.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No se encontraron usuarios en la plataforma.
                </div>
              ) : (
                <div className="table-responsive" style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Usuario</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rol</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Vehículos</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Inventario</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fecha de Registro</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.92rem' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 600 }}>{u.username}</td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td style={{ padding: '14px 16px' }}>
                            {u.role === 'admin' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ff7a7a', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                                <ShieldAlert size={12} /> Admin
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                                <UserCheck size={12} /> Usuario
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 500 }}>{u._count.cars}</td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{u._count.inventory} ref.</td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                            {new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button 
                                onClick={() => openEditModal(u)}
                                className="btn-secondary btn-icon" 
                                style={{ padding: '6px' }}
                                title="Editar Usuario"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="btn-secondary btn-icon" 
                                style={{ padding: '6px', color: 'var(--danger)' }}
                                title="Eliminar Usuario"
                                disabled={u.id === currentUser?.id}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FLEET MANAGEMENT */}
          {activeTab === 'cars' && (
            <div className="animate-fade-in">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Vehículos Registrados en la Plataforma</h3>

              {cars.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No hay vehículos registrados en el sistema en este momento.
                </div>
              ) : (
                <div className="table-responsive" style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Coche</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Año</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Matrícula</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Kilometraje</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Propietario</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email del Propietario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cars.map(car => (
                        <tr key={car.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.92rem' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 600 }}>{car.brand} {car.model}</td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{car.year}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.82rem' }}>
                              {car.license_plate}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 500 }}>{car.mileage?.toLocaleString('es-ES')} km</td>
                          <td style={{ padding: '14px 16px', fontWeight: 500 }}>{car.user ? car.user.username : <em style={{ color: 'var(--text-muted)' }}>Ninguno</em>}</td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                            {car.user ? car.user.email : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* USER CREATE/EDIT MODAL */}
      {showUserModal && (
        <div className="modal-backdrop" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card modal-content animate-scale-up" style={{ width: '420px', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem' }}>
              {editingUser ? `Editar Usuario: ${editingUser.username}` : 'Crear Nuevo Usuario'}
            </h3>

            <form onSubmit={handleUserSubmit}>
              <div className="form-group">
                <label htmlFor="modalUsername">Nombre de Usuario</label>
                <input
                  type="text"
                  id="modalUsername"
                  className="form-control"
                  value={modalUsername}
                  onChange={e => setModalUsername(e.target.value)}
                  placeholder="ej. pedro_gomez"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modalEmail">Correo Electrónico</label>
                <input
                  type="email"
                  id="modalEmail"
                  className="form-control"
                  value={modalEmail}
                  onChange={e => setModalEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modalPassword">
                  Contraseña {editingUser && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>(dejar vacío para no cambiar)</span>}
                </label>
                <input
                  type="password"
                  id="modalPassword"
                  className="form-control"
                  value={modalPassword}
                  onChange={e => setModalPassword(e.target.value)}
                  placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña de acceso'}
                  required={!editingUser}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="modalRole">Rol del Usuario</label>
                <select
                  id="modalRole"
                  className="form-control"
                  value={modalRole}
                  onChange={e => setModalRole(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white' }}
                >
                  <option value="user" style={{ background: '#1a1a1e' }}>Usuario Estándar (user)</option>
                  <option value="admin" style={{ background: '#1a1a1e' }}>Administrador (admin)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowUserModal(false)} 
                  className="btn-secondary"
                  disabled={modalSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
