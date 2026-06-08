import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Car, Trash2, Milestone, Calendar, Palette, Loader2, AlertTriangle } from 'lucide-react';
import { CarData, AlertData, MaintenanceData } from '@autotrack/shared';

interface DashboardProps {
  onSelectCar: (carId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectCar }) => {
  const { apiFetch } = useAuth();
  const [cars, setCars] = useState<CarData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [mileage, setMileage] = useState(0);
  const [engineCode, setEngineCode] = useState('');
  const [vin, setVin] = useState('');
  const [tireSize, setTireSize] = useState('');
  const [oilType, setOilType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const carsData = await apiFetch('/api/cars');
      setCars(carsData);

      const alertsData = await apiFetch('/api/alerts');
      setAlerts(alertsData);

      const maintData = await apiFetch('/api/maintenances');
      setMaintenances(maintData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos del garaje');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const newCar = await apiFetch('/api/cars', {
        method: 'POST',
        body: JSON.stringify({
          brand,
          model,
          year: Number(year),
          licensePlate,
          color,
          mileage: Number(mileage),
          engineCode,
          vin,
          tireSize,
          oilType,
        }),
      });

      setCars([newCar, ...cars]);
      setShowModal(false);
      setBrand('');
      setModel('');
      setYear(new Date().getFullYear());
      setLicensePlate('');
      setColor('');
      setMileage(0);
      setEngineCode('');
      setVin('');
      setTireSize('');
      setOilType('');
    } catch (err: any) {
      setError(err.message || 'Error al añadir el vehículo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCar = async (e: React.MouseEvent, carId: number) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar este vehículo y todo su historial?')) return;

    try {
      await apiFetch(`/api/cars/${carId}`, {
        method: 'DELETE',
      });
      setCars(cars.filter((c) => c.id !== carId));
      setAlerts(alerts.filter((a) => a.car_id !== carId));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el coche');
    }
  };

  // Helper to filter alerts that are actually triggered/due
  const triggeredAlerts = alerts.filter((alert) => {
    if (alert.target_date) {
      const diffTime = new Date(alert.target_date).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return true;
    }
    if (alert.target_mileage && alert.current_mileage >= alert.target_mileage) {
      return true;
    }
    return false;
  });

  // Helper for text formatting
  const getAlertWarningText = (alert: AlertData) => {
    const triggers = [];
    if (alert.target_date) {
      const diffTime = new Date(alert.target_date).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        triggers.push(`fecha límite superada (${new Date(alert.target_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })})`);
      }
    }
    if (alert.target_mileage && alert.current_mileage >= alert.target_mileage) {
      triggers.push(`kilometraje superado (${alert.current_mileage.toLocaleString()} >= ${alert.target_mileage.toLocaleString()} km)`);
    }
    return triggers.join(' / ');
  };

  const totalMileage = cars.reduce((acc, car) => acc + (car.mileage || 0), 0);
  const averageYear = cars.length > 0 
    ? Math.round(cars.reduce((acc, car) => acc + car.year, 0) / cars.length) 
    : 0;

  // Month Bar Chart calculations
  const currentYear = new Date().getFullYear();
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    monthName: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
    amount: 0,
  }));

  maintenances.forEach((m) => {
    const d = new Date(m.date);
    if (d.getFullYear() === currentYear) {
      const month = d.getMonth();
      monthlyData[month].amount += Number(m.cost) || 0;
    }
  });

  const maxMonthSpend = Math.max(...monthlyData.map((d) => d.amount), 100);

  // Spend per category calculations
  const categories = [
    { name: 'Aceite y Filtros', color: 'hsl(142, 70%, 45%)' },
    { name: 'Frenos', color: 'hsl(0, 84%, 55%)' },
    { name: 'Neumáticos', color: 'hsl(200, 80%, 50%)' },
    { name: 'Motor', color: 'hsl(35, 92%, 45%)' },
    { name: 'Revisión Anual', color: 'hsl(280, 80%, 55%)' },
    { name: 'Otros', color: 'hsl(220, 15%, 55%)' },
  ];

  const categoryData = categories.map((cat) => {
    const total = maintenances
      .filter((m) => m.category === cat.name || (cat.name === 'Otros' && !categories.some(c => c.name === m.category)))
      .reduce((sum, m) => sum + Number(m.cost), 0);
    return {
      ...cat,
      total,
    };
  });

  const totalSpend = categoryData.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="animate-fade-in">
      <main className="container" style={{ paddingTop: '20px' }}>
        
        {/* Triggered Global Alerts Notification Banner */}
        {triggeredAlerts.length > 0 && (
          <div className="notifications-panel">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontWeight: 700 }}>
              <AlertTriangle size={18} /> Avisos de Mantenimiento Activos
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {triggeredAlerts.map((alert) => (
                <div key={alert.id} className="notification-item">
                  <span style={{ color: 'var(--text-primary)' }}>
                    🚗 <strong>{alert.brand} {alert.model}</strong> ({alert.license_plate}):{' '}
                    <span style={{ color: '#ffb05c' }}>{alert.description}</span> —{' '}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      {getAlertWarningText(alert)}
                    </span>
                  </span>
                  <span className="notification-badge">Acción Requerida</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics section */}
        <div className="stats-grid">
          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(138, 43, 226, 0.15)', color: 'var(--primary)' }}>
              <Car size={28} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Coches en Garaje</span>
              <span className="stat-value">{cars.length}</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Milestone size={28} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Kilómetros Acumulados</span>
              <span className="stat-value">{totalMileage.toLocaleString()} km</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
              <Calendar size={28} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Año Medio de la Flota</span>
              <span className="stat-value">{averageYear || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Charts & Analytics */}
        {cars.length > 0 && maintenances.length > 0 && (
          <div className="chart-section">
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
              Análisis de Gastos de la Flota
            </h3>
            
            <div className="charts-grid-layout">
              {/* Month Bar Chart */}
              <div className="chart-card-wrapper">
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Gastos Mensuales ({currentYear})</h4>
                <div className="chart-svg-container">
                  {monthlyData.map((d, index) => {
                    const percentHeight = Math.min(100, (d.amount / maxMonthSpend) * 100);
                    return (
                      <div key={index} className="chart-bar-col">
                        <div className="chart-bar-tooltip">
                          {d.amount.toFixed(2)} €
                        </div>
                        <div 
                          className="chart-bar-rect" 
                          style={{ height: `${percentHeight}%` }}
                        ></div>
                        <span className="chart-label-text">{d.monthName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spend by Category */}
              <div className="chart-card-wrapper">
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>Gastos por Categoría</h4>
                <div className="category-legend-list">
                  {categoryData.map((cat, idx) => {
                    const percent = totalSpend > 0 ? (cat.total / totalSpend) * 100 : 0;
                    return (
                      <div key={idx} className="category-legend-item">
                        <div className="category-legend-name">
                          <span className="category-dot" style={{ backgroundColor: cat.color }}></span>
                          <span>{cat.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', backgroundColor: cat.color }}></div>
                          </div>
                          <span className="category-legend-value">
                            {cat.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>Mis Vehículos</h2>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Añadir Coche
          </button>
        </div>

        {/* Loading / Error states */}
        {loading ? (
          <div className="empty-state">
            <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary)' }} />
            <p>Cargando tus vehículos...</p>
          </div>
        ) : error ? (
          <div className="glass-card" style={{ borderColor: 'var(--danger)', color: '#ff8a8a', padding: '20px', textAlign: 'center' }}>
            <p>{error}</p>
            <button className="btn-secondary" style={{ marginTop: '12px' }} onClick={fetchDashboardData}>Reintentar</button>
          </div>
        ) : cars.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-icon" style={{ fontSize: '4rem' }}>🚗</div>
            <h3>No tienes coches registrados</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto 16px' }}>
              Registra tu primer vehículo para poder llevar un control de sus mantenimientos y piezas usadas.
            </p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Registrar mi primer coche
            </button>
          </div>
        ) : (
          <div className="cars-grid">
            {cars.map((car) => {
              // Check if this specific car has any triggered alerts
              const hasAlerts = triggeredAlerts.some((a) => a.car_id === car.id);
              return (
                <div 
                  key={car.id} 
                  className="glass-card car-card"
                  onClick={() => onSelectCar(car.id)}
                  style={hasAlerts ? { borderColor: 'rgba(245, 158, 11, 0.4)' } : undefined}
                >
                  <div>
                    <div className="car-header">
                      <div>
                        <div className="car-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {car.brand} {car.model}
                          {hasAlerts && <span title="Alertas pendientes"><AlertTriangle size={16} style={{ color: 'var(--warning)' }} /></span>}
                        </div>
                        <div className="car-subtitle">Año {car.year}</div>
                      </div>
                      <span className="car-plate">{car.license_plate}</span>
                    </div>

                    <div className="car-details">
                      <div className="detail-item">
                        <span className="detail-label">Kilometraje</span>
                        <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Milestone size={14} style={{ color: 'var(--text-muted)' }} />
                          {car.mileage.toLocaleString()} km
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Color</span>
                        <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Palette size={14} style={{ color: 'var(--text-muted)' }} />
                          {car.color || 'No especificado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ 
                        padding: '8px 12px', 
                        background: 'rgba(239, 68, 68, 0.05)', 
                        borderColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)' 
                      }}
                      onClick={(e) => handleDeleteCar(e, car.id)}
                      title="Eliminar coche"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Car Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Nuevo Vehículo</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddCar}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="brand">Marca *</label>
                  <input
                    type="text"
                    id="brand"
                    className="form-control"
                    placeholder="Ej. Ford, Toyota, BMW"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="model">Modelo *</label>
                  <input
                    type="text"
                    id="model"
                    className="form-control"
                    placeholder="Ej. Focus, Corolla, M3"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="year">Año *</label>
                  <input
                    type="number"
                    id="year"
                    className="form-control"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    min={1900}
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="licensePlate">Matrícula *</label>
                  <input
                    type="text"
                    id="licensePlate"
                    className="form-control"
                    placeholder="Ej. 1234ABC"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="color">Color</label>
                  <input
                    type="text"
                    id="color"
                    className="form-control"
                    placeholder="Ej. Rojo, Gris Metalizado"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mileage">Kilómetros Actuales</label>
                  <input
                    type="number"
                    id="mileage"
                    className="form-control"
                    value={mileage}
                    onChange={(e) => setMileage(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="vin">Número de Bastidor (VIN)</label>
                  <input
                    type="text"
                    id="vin"
                    className="form-control"
                    placeholder="Ej. WBA..."
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="engineCode">Código de Motor</label>
                  <input
                    type="text"
                    id="engineCode"
                    className="form-control"
                    placeholder="Ej. 1.9 TDI ASZ / B58"
                    value={engineCode}
                    onChange={(e) => setEngineCode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="tireSize">Medida de Neumáticos</label>
                  <input
                    type="text"
                    id="tireSize"
                    className="form-control"
                    placeholder="Ej. 225/45 R17"
                    value={tireSize}
                    onChange={(e) => setTireSize(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="oilType">Tipo de Aceite Recomendado</label>
                  <input
                    type="text"
                    id="oilType"
                    className="form-control"
                    placeholder="Ej. 5W-30 LL-04"
                    value={oilType}
                    onChange={(e) => setOilType(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Registrar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
