import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Calendar, Milestone, Coins, Layers, Wrench, AlertTriangle, Loader2, Check, Bell, BellOff, Fuel, Droplet, TrendingUp, X, FileText } from 'lucide-react';
import { Maintenance, CarData, Alert, InventoryPart, FuelLog } from '@autotrack/shared';

interface CarDetailProps {
  carId: number;
  onBack: () => void;
}

interface PartInput {
  partName: string;
  brand: string;
  partNumber: string;
  quantity: number;
  price: number;
  inventoryPartId?: number;
}

const CHECKLIST_TEMPLATES = [
  {
    name: 'Aceite y Filtros',
    category: 'Aceite y Filtros',
    items: [
      'Aceite de Motor',
      'Filtro de Aceite',
      'Filtro de Aire',
      'Filtro de Habitáculo',
      'Nivel de Refrigerante',
      'Nivel de Líquido de Frenos'
    ]
  },
  {
    name: 'Revisión de Frenos',
    category: 'Frenos',
    items: [
      'Pastillas de Freno Delanteras',
      'Pastillas de Freno Traseras',
      'Discos de Freno Delanteros/Traseros',
      'Líquido de Frenos (Humedad)'
    ]
  },
  {
    name: 'Mantenimiento Mayor / Anual',
    category: 'Motor',
    items: [
      'Aceite y Filtro de Motor',
      'Filtro de Aire y Habitáculo',
      'Bujías / Calentadores',
      'Estado de Batería y Alternador',
      'Fugas de Líquidos',
      'Presión y Desgaste de Neumáticos',
      'Pastillas y Discos de Freno'
    ]
  },
  {
    name: 'Inspección Pre-ITV',
    category: 'Otros',
    items: [
      'Luces Exteriores (Cruce, Intermitentes, Freno)',
      'Eficacia de Limpiaparabrisas y Nivel de Líquido',
      'Neumáticos (Profundidad de dibujo > 1.6mm)',
      'Cinturones de Seguridad y Anclajes',
      'Inspección Visual de Suspensión y Dirección',
      'Bocina / Claxon'
    ]
  }
];

export const CarDetail: React.FC<CarDetailProps> = ({ carId, onBack }) => {
  const { apiFetch } = useAuth();
  const [car, setCar] = useState<CarData | null>(null);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [inventoryParts, setInventoryParts] = useState<InventoryPart[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'maintenance' | 'alerts' | 'fuel'>('maintenance');

  // Document Preview State
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  // New Checklist Item State
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // New Maintenance Form State
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState(0);
  const [cost, setCost] = useState(0);
  const [parts, setParts] = useState<PartInput[]>([]);
  const [category, setCategory] = useState('Otros');
  const [documentPath, setDocumentPath] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [submittingMaint, setSubmittingMaint] = useState(false);

  // New Alert Form State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertDesc, setAlertDesc] = useState('');
  const [alertTargetDate, setAlertTargetDate] = useState('');
  const [alertTargetMileage, setAlertTargetMileage] = useState('');
  const [submittingAlert, setSubmittingAlert] = useState(false);

  // New Fuel Form State
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelMileage, setFuelMileage] = useState(0);
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('');
  const [fuelTotalCost, setFuelTotalCost] = useState('');
  const [fuelIsFull, setFuelIsFull] = useState(true);
  const [submittingFuel, setSubmittingFuel] = useState(false);


  const fetchData = async () => {
    try {
      setLoading(true);
      const carData = await apiFetch(`/api/cars/${carId}`);
      setCar(carData);
      setMileage(carData.mileage); // pre-populate mileage in maintenance form
      setFuelMileage(carData.mileage); // pre-populate mileage in fuel form

      const maintData = await apiFetch(`/api/cars/${carId}/maintenance`);
      setMaintenances(maintData);

      const alertsData = await apiFetch(`/api/cars/${carId}/alerts`);
      setAlerts(alertsData);

      const inventoryData = await apiFetch('/api/inventory');
      setInventoryParts(inventoryData);

      const fuelData = await apiFetch(`/api/cars/${carId}/fuel`);
      setFuelLogs(fuelData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los detalles del coche');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [carId]);

  useEffect(() => {
    const l = Number(fuelLiters);
    const p = Number(fuelPricePerLiter);
    if (l > 0 && p > 0) {
      setFuelTotalCost((l * p).toFixed(2));
    }
  }, [fuelLiters, fuelPricePerLiter]);

  const handleAddPartRow = () => {
    setParts([...parts, { partName: '', brand: '', partNumber: '', quantity: 1, price: 0 }]);
  };

  const handleRemovePartRow = (index: number) => {
    setParts(parts.filter((_, idx) => idx !== index));
  };

  const handlePartChange = (index: number, field: keyof PartInput, value: any) => {
    const newParts = [...parts];
    newParts[index] = {
      ...newParts[index],
      [field]: value,
    };
    setParts(newParts);

    // Automatically recalculate total maintenance cost if part prices change
    if (field === 'price' || field === 'quantity') {
      const partsCostSum = newParts.reduce((sum, part) => {
        const p = Number(part.price) || 0;
        const q = Number(part.quantity) || 1;
        return sum + (p * q);
      }, 0);
      setCost(Number(partsCostSum.toFixed(2)));
    }
  };

  const handleExportCSV = () => {
    if (!car) return;
    const headers = ['Fecha', 'Kilometraje (km)', 'Descripción', 'Categoría', 'Costo (€)'];
    const rows = maintenances.map((m) => [
      new Date(m.date).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
      m.mileage,
      `"${m.description.replace(/"/g, '""')}"`,
      m.category || 'Otros',
      m.cost
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_${car.brand}_${car.model}_${car.license_plate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingMaint(true);
    setError(null);

    const filteredParts = parts.filter((p) => p.partName.trim() !== '');

    try {
      await apiFetch(`/api/cars/${carId}/maintenance`, {
        method: 'POST',
        body: JSON.stringify({
          description,
          date,
          mileage: Number(mileage),
          cost: Number(cost),
          category,
          documentPath,
          checklist,
          parts: filteredParts.map(p => ({
            partName: p.partName,
            brand: p.brand,
            partNumber: p.partNumber,
            quantity: Number(p.quantity),
            price: Number(p.price),
            inventoryPartId: p.inventoryPartId,
          })),
        }),
      });

      // Re-fetch all data to ensure inventory list is synced with new stock and mileage
      await fetchData();

      setShowMaintModal(false);
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setCost(0);
      setParts([]);
      setCategory('Otros');
      setDocumentPath('');
      setChecklist([]);
      setUploadedFileName('');
    } catch (err: any) {
      setError(err.message || 'Error al añadir el mantenimiento');
    } finally {
      setSubmittingMaint(false);
    }
  };

  const handleDeleteMaintenance = async (maintId: number) => {
    if (!confirm('¿Deseas eliminar este registro de mantenimiento? Esta acción no se puede deshacer.')) return;

    try {
      await apiFetch(`/api/maintenance/${maintId}`, {
        method: 'DELETE',
      });
      // Re-fetch all data to sync inventory stock and details
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el mantenimiento');
    }
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAlert(true);
    setError(null);

    try {
      const newAlert = await apiFetch(`/api/cars/${carId}/alerts`, {
        method: 'POST',
        body: JSON.stringify({
          description: alertDesc,
          targetDate: alertTargetDate || undefined,
          targetMileage: alertTargetMileage ? Number(alertTargetMileage) : undefined,
        }),
      });

      setAlerts([newAlert, ...alerts]);
      setShowAlertModal(false);
      setAlertDesc('');
      setAlertTargetDate('');
      setAlertTargetMileage('');
    } catch (err: any) {
      setError(err.message || 'Error al añadir la alerta');
    } finally {
      setSubmittingAlert(false);
    }
  };

  const handleCompleteAlert = async (alertId: number) => {
    try {
      const updated = await apiFetch(`/api/alerts/${alertId}/complete`, {
        method: 'PUT',
      });
      setAlerts(alerts.map((a) => (a.id === alertId ? updated : a)));
    } catch (err: any) {
      alert(err.message || 'Error al completar la alerta');
    }
  };

  const handleDeleteAlert = async (alertId: number) => {
    if (!confirm('¿Deseas eliminar este aviso/recordatorio?')) return;

    try {
      await apiFetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });
      setAlerts(alerts.filter((a) => a.id !== alertId));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la alerta');
    }
  };

  const handleAddFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFuel(true);
    setError(null);

    try {
      await apiFetch(`/api/cars/${carId}/fuel`, {
        method: 'POST',
        body: JSON.stringify({
          date: fuelDate,
          mileage: Number(fuelMileage),
          liters: Number(fuelLiters),
          pricePerLiter: Number(fuelPricePerLiter),
          totalCost: fuelTotalCost ? Number(fuelTotalCost) : undefined,
          isFullTank: fuelIsFull,
        }),
      });

      // Re-fetch all data to ensure car mileage, fuel logs, and stats are synced
      await fetchData();

      setShowFuelModal(false);
      setFuelDate(new Date().toISOString().split('T')[0]);
      setFuelLiters('');
      setFuelPricePerLiter('');
      setFuelTotalCost('');
      setFuelIsFull(true);
    } catch (err: any) {
      setError(err.message || 'Error al añadir el registro de combustible');
    } finally {
      setSubmittingFuel(false);
    }
  };

  const handleDeleteFuelLog = async (logId: number) => {
    if (!confirm('¿Deseas eliminar este registro de combustible?')) return;

    try {
      await apiFetch(`/api/fuel/${logId}`, {
        method: 'DELETE',
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el repostaje');
    }
  };

  const getAverageDailyMileage = () => {
    if (!car) return 0;
    const points: { date: Date; mileage: number }[] = [];
    
    maintenances.forEach(m => {
      if (m.date && m.mileage) {
        points.push({ date: new Date(m.date), mileage: m.mileage });
      }
    });
    
    fuelLogs.forEach(f => {
      if (f.date && f.mileage) {
        points.push({ date: new Date(f.date), mileage: f.mileage });
      }
    });

    points.push({ date: new Date(), mileage: car.mileage });
    points.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const uniquePoints: { date: Date; mileage: number }[] = [];
    points.forEach(p => {
      if (uniquePoints.length === 0) {
        uniquePoints.push(p);
      } else {
        const last = uniquePoints[uniquePoints.length - 1];
        const dayDiff = Math.abs(p.date.getTime() - last.date.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff >= 1 && p.mileage > last.mileage) {
          uniquePoints.push(p);
        }
      }
    });
    
    if (uniquePoints.length < 2) return 0;
    
    const earliest = uniquePoints[0];
    const latest = uniquePoints[uniquePoints.length - 1];
    const totalDays = (latest.date.getTime() - earliest.date.getTime()) / (1000 * 60 * 60 * 24);
    const totalKm = latest.mileage - earliest.mileage;
    
    if (totalDays <= 0 || totalKm <= 0) return 0;
    return totalKm / totalDays;
  };

  // Helper to determine active alerts status
  const getAlertStatus = (alert: Alert, currentMileage: number) => {
    if (alert.is_completed) return { label: 'Completado', type: 'completed' };

    let isDanger = false;
    let isWarning = false;
    let reasons: string[] = [];

    if (alert.target_date) {
      const diffTime = new Date(alert.target_date).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        isDanger = true;
        reasons.push('Vencido por fecha');
      } else if (diffDays <= 15) {
        isWarning = true;
        reasons.push(`Vence en ${diffDays} días`);
      }
    }

    if (alert.target_mileage) {
      const diffMileage = alert.target_mileage - currentMileage;
      if (diffMileage <= 0) {
        isDanger = true;
        reasons.push('Kilometraje superado');
      } else if (diffMileage <= 1000) {
        isWarning = true;
        reasons.push(`Faltan ${diffMileage.toLocaleString()} km`);
      }
    }

    if (isDanger) return { label: reasons.join(' / '), type: 'active-danger' };
    if (isWarning) return { label: reasons.join(' / '), type: 'active-warning' };

    let futureDetails = [];
    if (alert.target_date) {
      futureDetails.push(new Date(alert.target_date).toLocaleDateString('es-ES', { timeZone: 'UTC' }));
    }
    if (alert.target_mileage) {
      futureDetails.push(`${alert.target_mileage.toLocaleString()} km`);
    }
    return { label: `Programado: ${futureDetails.join(' o ')}`, type: 'normal' };
  };

  const getLogsWithConsumption = () => {
    const sortedLogs = [...fuelLogs].sort((a, b) => a.mileage - b.mileage);
    const result: (FuelLog & { consumption?: number })[] = [];
    
    for (let i = 0; i < sortedLogs.length; i++) {
      const current = sortedLogs[i];
      let consumption: number | undefined;
      
      if (current.is_full_tank && i > 0) {
        let prevFull: FuelLog | null = null;
        for (let j = i - 1; j >= 0; j--) {
          if (sortedLogs[j].is_full_tank) {
            prevFull = sortedLogs[j];
            break;
          }
        }
        if (prevFull) {
          const distance = current.mileage - prevFull.mileage;
          if (distance > 0) {
            consumption = (Number(current.liters) / distance) * 100;
          }
        }
      }
      result.push({ ...current, consumption });
    }
    
    return result.reverse();
  };

  const getAverageConsumption = (logsWithCons: (FuelLog & { consumption?: number })[]) => {
    const validCons = logsWithCons
      .map(l => l.consumption)
      .filter((c): c is number => c !== undefined && c > 0);
    if (validCons.length === 0) return 0;
    return validCons.reduce((sum, c) => sum + c, 0) / validCons.length;
  };

  const renderFuelChart = (logsWithCons: (FuelLog & { consumption?: number })[] | any[]) => {
    const chartLogs = [...logsWithCons]
      .reverse()
      .filter(l => l.consumption !== undefined && l.consumption > 0);

    if (chartLogs.length < 2) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Se necesitan al menos 2 llenados de tanque para mostrar el gráfico.
        </div>
      );
    }

    const values = chartLogs.map(l => l.consumption as number);
    const minVal = Math.min(...values) * 0.9;
    const maxVal = Math.max(...values) * 1.1;
    const valRange = maxVal - minVal || 1;

    const width = 500;
    const height = 150;
    const padding = 20;

    const points = chartLogs.map((log, index) => {
      const x = padding + (index / (chartLogs.length - 1)) * (width - 2 * padding);
      const y = height - padding - (((log.consumption as number) - minVal) / valRange) * (height - 2 * padding);
      return { x, y, val: log.consumption as number, date: log.date };
    });

    const dPath = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;

    return (
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
          <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

          <path d={dPath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, idx) => (
            <g key={idx} className="chart-dot-group" style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--primary)" stroke="#fff" strokeWidth="1.5" />
              <title>{`${p.val.toFixed(1)} L/100km - ${new Date(p.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}`}</title>
            </g>
          ))}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '6px' }}>
          <span>{new Date(chartLogs[0].date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</span>
          <span>Evolución Consumo (L/100km)</span>
          <span>{new Date(chartLogs[chartLogs.length - 1].date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</span>
        </div>
      </div>
    );
  };

  const logsWithCons = getLogsWithConsumption();
  const avgFuelCons = getAverageConsumption(logsWithCons);
  const totalFuelCost = fuelLogs.reduce((sum, l) => sum + Number(l.total_cost), 0);
  const avgFuelPricePerLiter = fuelLogs.length > 0 ? fuelLogs.reduce((sum, l) => sum + Number(l.price_per_liter), 0) / fuelLogs.length : 0;

  const getTemporalAverages = () => {
    if (!car || fuelLogs.length === 0) {
      return { kmPerMonth: 0, costPerMonth: 0, litersPerMonth: 0 };
    }
    
    const sortedLogs = [...fuelLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const oldestLog = sortedLogs[0];
    const newestLog = sortedLogs[sortedLogs.length - 1];
    
    const timeDiffMs = new Date(newestLog.date).getTime() - new Date(oldestLog.date).getTime();
    let days = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
    
    if (days <= 0) {
      days = 30; // fallback to 1 month
    }
    
    const kmDiff = newestLog.mileage - oldestLog.mileage;
    const periodCost = fuelLogs.reduce((sum, l) => sum + Number(l.total_cost), 0);
    const periodLiters = fuelLogs.reduce((sum, l) => sum + Number(l.liters), 0);
    
    const kmPerDay = kmDiff > 0 ? kmDiff / days : (car.mileage - (oldestLog.mileage || 0)) / days || 0;
    const costPerDay = periodCost / days;
    const litersPerDay = periodLiters / days;
    
    return {
      kmPerMonth: kmPerDay * 30.4,
      costPerMonth: costPerDay * 30.4,
      litersPerMonth: litersPerDay * 30.4,
      days
    };
  };

  const temporalStats = getTemporalAverages();

  const totalSpent = maintenances.reduce((sum, m) => sum + Number(m.cost), 0);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
        <p>Cargando detalles...</p>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="container">
        <div className="glass-card" style={{ borderColor: 'var(--danger)', color: '#ff8a8a', padding: '24px', textAlign: 'center' }}>
          <p>{error || 'No se pudo cargar la información del vehículo'}</p>
          <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={onBack}>
            <ArrowLeft size={16} /> Volver al panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '60px' }}>
      {/* Header / Nav */}
      <div className="back-btn" onClick={onBack}>
        <ArrowLeft size={18} /> Volver al Dashboard
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{car.brand} {car.model}</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
            <span className="car-plate" style={{ fontSize: '1rem', padding: '6px 12px' }}>{car.license_plate}</span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ color: 'var(--text-secondary)' }}>Año {car.year}</span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ color: 'var(--text-secondary)' }}>Color: {car.color || 'N/E'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {activeTab === 'maintenance' && (
            <button className="btn-primary" onClick={() => {
              setMileage(car.mileage);
              setShowMaintModal(true);
            }}>
              <Plus size={18} /> Registrar Mantenimiento
            </button>
          )}
          {activeTab === 'alerts' && (
            <button className="btn-primary" onClick={() => setShowAlertModal(true)}>
              <Bell size={18} /> Programar Alerta
            </button>
          )}
          {activeTab === 'fuel' && (
            <button className="btn-primary" onClick={() => {
              setFuelMileage(car.mileage);
              setShowFuelModal(true);
            }} style={{ background: 'var(--success)', boxShadow: '0 4px 15px var(--success-glow)' }}>
              <Fuel size={18} /> Registrar Repostaje
            </button>
          )}
          <button className="btn-secondary" onClick={handleExportCSV}>
            📥 Exportar CSV
          </button>
          <button className="btn-secondary" onClick={handlePrintPDF}>
            🖨️ Imprimir PDF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '40px' }}>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(138, 43, 226, 0.15)', color: 'var(--primary)' }}>
            <Milestone size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Kilometraje Actual</span>
            <span className="stat-value">{car.mileage.toLocaleString()} km</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
            <Coins size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Inversión en Mantenimiento</span>
            <span className="stat-value">{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Layers size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Revisiones Realizadas</span>
            <span className="stat-value">{maintenances.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-nav animate-fade-in" style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button 
          type="button" 
          className={`btn ${activeTab === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('maintenance')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          🔧 Historial de Mantenimientos
        </button>
        <button 
          type="button" 
          className={`btn ${activeTab === 'alerts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('alerts')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          🔔 Alertas e Hitos Predictivos
        </button>
        <button 
          type="button" 
          className={`btn ${activeTab === 'fuel' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('fuel')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          ⛽ Consumo de Combustible
        </button>
      </div>

      {/* Main Section: Two-Column Layout */}
      <div className="detail-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Side: Active Tab Content (spans 2 columns on large screens) */}
        <div style={{ gridColumn: 'span 2' }}>
          
          {/* TAB 1: MAINTENANCE TIMELINE */}
          {activeTab === 'maintenance' && (
            <div className="animate-fade-in">
              <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                Historial de Mantenimiento
              </h3>

              {maintenances.length === 0 ? (
                <div className="glass-card empty-state" style={{ padding: '60px 20px' }}>
                  <div className="empty-icon" style={{ fontSize: '3rem' }}>🔧</div>
                  <h4>No hay mantenimientos registrados</h4>
                  <p style={{ maxWidth: '400px', margin: '0 auto 12px' }}>
                    Aún no has anotado ninguna revisión o reparación para este coche.
                  </p>
                  <button className="btn-secondary" onClick={() => setShowMaintModal(true)}>
                    Registrar primer mantenimiento
                  </button>
                </div>
              ) : (
                <div className="timeline">
                  {maintenances.map((maint) => (
                    <div key={maint.id} className="timeline-item">
                      <div className="timeline-marker"></div>
                      
                      <div className="timeline-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="timeline-date" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} />
                            {new Date(maint.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>•</span>
                          <span className="timeline-date" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Milestone size={14} />
                            {maint.mileage.toLocaleString()} km
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="timeline-cost">{Number(maint.cost).toFixed(2)} €</span>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '6px', background: 'transparent', borderColor: 'transparent', color: 'var(--text-muted)' }}
                            onClick={() => handleDeleteMaintenance(maint.id)}
                            title="Eliminar mantenimiento"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="timeline-body">
                        <p style={{ fontWeight: 500, fontSize: '1.05rem', marginBottom: '8px' }}>{maint.description}</p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            padding: '2px 8px', 
                            borderRadius: '6px', 
                            background: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-secondary)',
                          }}>
                            Categoría: <strong>{maint.category || 'Otros'}</strong>
                          </span>
                          {maint.document_path && (
                            <button 
                              type="button"
                              className="btn-secondary" 
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.78rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                              }}
                              onClick={() => {
                                const baseUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5001' : '');
                                setPreviewDocUrl(`${baseUrl}${maint.document_path}`);
                              }}
                            >
                              📄 Ver Documento
                            </button>
                          )}
                        </div>

                        {(() => {
                          const list = typeof maint.checklist === 'string' ? JSON.parse(maint.checklist) : maint.checklist;
                          if (list && Array.isArray(list) && list.length > 0) {
                            return (
                              <div className="timeline-checklist-display" style={{ marginBottom: '12px' }}>
                                <div className="timeline-checklist-title">Puntos Verificados</div>
                                <div className="timeline-checklist-grid">
                                  {list.map((item, idx) => (
                                    <div key={idx} className="timeline-checklist-item checked">
                                      <span style={{ color: 'var(--success)' }}>✓</span>
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {maint.parts && maint.parts.length > 0 && (
                          <div className="timeline-parts">
                            <div className="timeline-parts-title">Piezas Utilizadas</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                              {maint.parts.map((part) => (
                                <span key={part.id} className="part-tag">
                                  {part.part_name} 
                                  {part.brand && ` (${part.brand})`}
                                  {part.quantity > 1 && ` x${part.quantity}`}
                                  {part.price > 0 && ` - ${(Number(part.price) * part.quantity).toFixed(2)}€`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETAILED PREDICTIVE ALERTS */}
          {activeTab === 'alerts' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Recordatorios e Hitos Predictivos</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Media estimada: <strong>{getAverageDailyMileage().toFixed(1)} km/día</strong>
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="glass-card empty-state" style={{ padding: '40px 20px' }}>
                  <BellOff size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <h4>No hay avisos programados</h4>
                  <p style={{ maxWidth: '400px', margin: '0 auto 16px', fontSize: '0.9rem' }}>
                    Configura avisos por kilometraje o fecha para recibir avisos proactivos cuando toque cambiar piezas o pasar la ITV.
                  </p>
                  <button className="btn-primary" onClick={() => setShowAlertModal(true)}>
                    + Crear mi primer aviso
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Active Alerts */}
                  {alerts.filter(a => !a.is_completed).length > 0 && (
                    <div>
                      <h4 style={{ color: 'var(--warning)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} /> Pendientes o en Progreso
                      </h4>
                      <div className="alerts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {alerts.filter(a => !a.is_completed).map((alert) => {
                          const status = getAlertStatus(alert, car.mileage);
                          const dailyKm = getAverageDailyMileage();
                          
                          // Predictive estimation calculation
                          let predictionText = '';
                          let progressPercent = 0;
                          
                          if (alert.target_mileage) {
                            progressPercent = Math.min(100, Math.max(0, (car.mileage / alert.target_mileage) * 100));
                            
                            if (dailyKm > 0) {
                              const remainingKm = alert.target_mileage - car.mileage;
                              if (remainingKm > 0) {
                                const remainingDays = Math.round(remainingKm / dailyKm);
                                const predictedDate = new Date();
                                predictedDate.setDate(predictedDate.getDate() + remainingDays);
                                predictionText = `Estimado para el ${predictedDate.toLocaleDateString('es-ES')} (~${remainingDays} días)`;
                              } else {
                                predictionText = '¡Kilometraje de aviso superado!';
                              }
                            }
                          }

                          return (
                            <div 
                              key={alert.id} 
                              className={`glass-card alert-card ${status.type === 'active-danger' ? 'active-danger' : status.type === 'active-warning' ? 'active-warning' : ''}`}
                              style={{ display: 'flex', flexDirection: 'column', justifySelf: 'stretch', transform: 'none', boxShadow: 'none' }}
                            >
                              <div style={{ flex: 1 }}>
                                <span className="alert-status-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                  {status.label}
                                </span>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px 0' }}>{alert.description}</h4>
                                
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {alert.target_date && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                      <span>Fecha Límite: {new Date(alert.target_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</span>
                                    </div>
                                  )}
                                  {alert.target_mileage && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <Milestone size={14} style={{ color: 'var(--text-muted)' }} />
                                      <span>Kilómetros Límite: {alert.target_mileage.toLocaleString()} km</span>
                                    </div>
                                  )}
                                </div>

                                {alert.target_mileage && (
                                  <div style={{ marginTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                      <span>Progreso Odométrico</span>
                                      <span>{progressPercent.toFixed(0)}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${progressPercent}%`, height: '100%', background: status.type === 'active-danger' ? 'var(--danger)' : status.type === 'active-warning' ? 'var(--warning)' : 'var(--primary)' }}></div>
                                    </div>
                                    {predictionText && (
                                      <p style={{ fontSize: '0.8rem', color: 'hsl(263, 90%, 75%)', marginTop: '6px', fontStyle: 'italic' }}>
                                        🔮 {predictionText}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                <button 
                                  className="btn-secondary"
                                  style={{ 
                                    padding: '6px 12px', 
                                    fontSize: '0.8rem', 
                                    background: 'rgba(16, 185, 129, 0.05)', 
                                    borderColor: 'rgba(16, 185, 129, 0.15)',
                                    color: 'var(--success)'
                                  }}
                                  onClick={() => handleCompleteAlert(alert.id)}
                                >
                                  <Check size={14} /> Hecho
                                </button>
                                <button 
                                  className="btn-secondary"
                                  style={{ padding: '6px 8px', color: 'var(--danger)', background: 'transparent', borderColor: 'transparent' }}
                                  onClick={() => handleDeleteAlert(alert.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Completed Alerts */}
                  {alerts.filter(a => a.is_completed).length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <h4 style={{ color: 'var(--text-muted)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={16} /> Completados Históricos
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {alerts.filter(a => a.is_completed).map((alert) => (
                          <div 
                            key={alert.id}
                            className="glass-cardCompleted"
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '12px 18px',
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid rgba(255,255,255,0.03)',
                              borderRadius: 'var(--radius-md)',
                              opacity: 0.6
                            }}
                          >
                            <div>
                              <span style={{ textDecoration: 'line-through', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {alert.description}
                              </span>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                                {alert.target_date && <span>Límite: {new Date(alert.target_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</span>}
                                {alert.target_mileage && <span>Kilómetros: {alert.target_mileage.toLocaleString()} km</span>}
                              </div>
                            </div>
                            <button 
                              className="btn-secondary"
                              style={{ padding: '6px', color: 'var(--danger)', background: 'transparent', borderColor: 'transparent' }}
                              onClick={() => handleDeleteAlert(alert.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FUEL CONSUMPTION & LOGS */}
          {activeTab === 'fuel' && (
            <div className="animate-fade-in">
              <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                Registro de Combustible
              </h3>

              {/* Fuel Quick Metrics */}
              <div className="stats-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {/* Consumo Medio L/100km */}
                <div className="glass-card stat-card" style={{ padding: '16px', boxShadow: 'none', transform: 'none' }}>
                  <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', width: '42px', height: '42px' }}>
                    <Droplet size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Consumo Medio</span>
                    <span className="stat-value" style={{ fontSize: '1.35rem' }}>
                      {avgFuelCons > 0 ? `${avgFuelCons.toFixed(2)} L/100` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Kilometraje Medio Temporal */}
                <div className="glass-card stat-card" style={{ padding: '16px', boxShadow: 'none', transform: 'none' }}>
                  <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', width: '42px', height: '42px' }}>
                    <Milestone size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Kilometraje por Tiempo</span>
                    <span className="stat-value" style={{ fontSize: '1.35rem' }}>
                      {temporalStats.kmPerMonth > 0 ? `${Math.round(temporalStats.kmPerMonth).toLocaleString()} km/mes` : 'N/A'}
                    </span>
                    {temporalStats.kmPerMonth > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ~ {(temporalStats.kmPerMonth / 30.4).toFixed(1)} km/día
                      </span>
                    )}
                  </div>
                </div>

                {/* Gasto Medio Temporal */}
                <div className="glass-card stat-card" style={{ padding: '16px', boxShadow: 'none', transform: 'none' }}>
                  <div className="stat-icon" style={{ background: 'rgba(138, 43, 226, 0.15)', color: 'var(--primary)', width: '42px', height: '42px' }}>
                    <Coins size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Gasto por Tiempo</span>
                    <span className="stat-value" style={{ fontSize: '1.35rem' }}>
                      {temporalStats.costPerMonth > 0 ? `${temporalStats.costPerMonth.toFixed(2)} €/mes` : 'N/A'}
                    </span>
                    {temporalStats.litersPerMonth > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ~ {temporalStats.litersPerMonth.toFixed(1)} L/mes
                      </span>
                    )}
                  </div>
                </div>

                {/* Gasto Total Acumulado */}
                <div className="glass-card stat-card" style={{ padding: '16px', boxShadow: 'none', transform: 'none' }}>
                  <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', width: '42px', height: '42px' }}>
                    <Fuel size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Gasto Total</span>
                    <span className="stat-value" style={{ fontSize: '1.35rem' }}>
                      {totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                    {avgFuelPricePerLiter > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Precio medio: {avgFuelPricePerLiter.toFixed(3)} €/L
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fuel Evolution SVG Chart */}
              {fuelLogs.length >= 2 && (
                <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', boxShadow: 'none', transform: 'none' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={16} /> Tendencia de Consumo (L/100km)
                  </h4>
                  {renderFuelChart(logsWithCons)}
                </div>
              )}

              {/* Fuel Odometer Warning */}
              {fuelLogs.length === 0 ? (
                <div className="glass-card empty-state" style={{ padding: '40px 20px' }}>
                  <Fuel size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <h4>No hay repostajes registrados</h4>
                  <p style={{ maxWidth: '400px', margin: '0 auto 16px', fontSize: '0.9rem' }}>
                    Registra cada carga de gasolina/diésel para calcular con precisión la eficiencia L/100km de tu motor y monitorizar los gastos.
                  </p>
                  <button className="btn-primary" onClick={() => { setFuelMileage(car.mileage); setShowFuelModal(true); }} style={{ background: 'var(--success)' }}>
                    Registrar primer repostaje
                  </button>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: '20px', overflowX: 'auto', boxShadow: 'none', transform: 'none' }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 700 }}>Historial de Llenados</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                        <th style={{ padding: '10px' }}>Fecha</th>
                        <th style={{ padding: '10px' }}>Kilómetros</th>
                        <th style={{ padding: '10px' }}>Litros</th>
                        <th style={{ padding: '10px' }}>Precio/L</th>
                        <th style={{ padding: '10px' }}>Total Coste</th>
                        <th style={{ padding: '10px' }}>Depósito</th>
                        <th style={{ padding: '10px' }}>Consumo</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsWithCons.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.92rem' }}>
                          <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                            {new Date(log.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                          </td>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{log.mileage.toLocaleString()} km</td>
                          <td style={{ padding: '10px' }}>{Number(log.liters).toFixed(2)} L</td>
                          <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{Number(log.price_per_liter).toFixed(3)} €</td>
                          <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>{Number(log.total_cost).toFixed(2)} €</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ 
                              fontSize: '0.78rem', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              background: log.is_full_tank ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: log.is_full_tank ? 'var(--success)' : 'var(--warning)'
                            }}>
                              {log.is_full_tank ? 'Lleno' : 'Parcial'}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontWeight: 700, color: 'var(--success)' }}>
                            {log.consumption ? `${log.consumption.toFixed(2)} L/100` : '-'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            <button 
                              className="btn-secondary"
                              style={{ padding: '6px', color: 'var(--danger)', background: 'transparent', borderColor: 'transparent' }}
                              onClick={() => handleDeleteFuelLog(log.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side Column (spans 1 column) */}
        <div style={{ gridColumn: 'span 1' }}>
          
          {/* Ficha Técnica Card */}
          <div className="specs-panel" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚙️ Ficha Técnica
            </h3>
            <div className="specs-grid">
              <div className="specs-item-row">
                <span className="specs-item-label">Nº Bastidor (VIN)</span>
                <span className="specs-item-value" style={{ fontFamily: 'monospace' }}>{car.vin || 'No especificado'}</span>
              </div>
              <div className="specs-item-row">
                <span className="specs-item-label">Código Motor</span>
                <span className="specs-item-value">{car.engine_code || 'No especificado'}</span>
              </div>
              <div className="specs-item-row">
                <span className="specs-item-label">Neumáticos</span>
                <span className="specs-item-value">{car.tire_size || 'No especificado'}</span>
              </div>
              <div className="specs-item-row">
                <span className="specs-item-label">Aceite Recomendado</span>
                <span className="specs-item-value">{car.oil_type || 'No especificado'}</span>
              </div>
            </div>
          </div>

          {/* Quick Alert Widget if NOT in alerts tab */}
          {activeTab !== 'alerts' && (
            <div className="glass-card" style={{ padding: '20px', boxShadow: 'none', transform: 'none' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bell size={16} /> Próximos Avisos
              </h3>
              
              {alerts.filter(a => !a.is_completed).length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                  No hay alertas pendientes.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {alerts.filter(a => !a.is_completed).slice(0, 2).map((alert) => {
                    const status = getAlertStatus(alert, car.mileage);
                    return (
                      <div key={alert.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px' }}>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          color: status.type === 'active-danger' ? 'var(--danger)' : status.type === 'active-warning' ? 'var(--warning)' : 'var(--text-muted)'
                        }}>
                          {status.label}
                        </span>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '2px 0 4px 0' }}>{alert.description}</h4>
                      </div>
                    );
                  })}
                  <button 
                    className="btn-secondary" 
                    style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', justifyContent: 'center' }}
                    onClick={() => setActiveTab('alerts')}
                  >
                    Ver todas las alertas
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Add Maintenance Modal */}
      {showMaintModal && (
        <div className="modal-overlay" onClick={() => setShowMaintModal(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3>Registrar Mantenimiento</h3>
              <button className="modal-close" onClick={() => setShowMaintModal(false)}>×</button>
            </div>

            {error && (
              <div className="glass-card" style={{ borderColor: 'var(--danger)', color: '#ff8a8a', padding: '12px', marginBottom: '16px', fontSize: '0.9rem' }}>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleAddMaintenance}>
              <div className="form-group">
                <label htmlFor="maint-desc">Descripción / Trabajo Realizado *</label>
                <input
                  type="text"
                  id="maint-desc"
                  className="form-control"
                  placeholder="Ej. Cambio de aceite y filtros, Sustitución de neumáticos delanteros"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="maint-category">Categoría del Mantenimiento *</label>
                  <select
                    id="maint-category"
                    className="form-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="Otros">Otros</option>
                    <option value="Aceite y Filtros">Aceite y Filtros</option>
                    <option value="Frenos">Frenos</option>
                    <option value="Neumáticos">Neumáticos</option>
                    <option value="Motor">Motor</option>
                    <option value="Revisión Anual">Revisión Anual</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="maint-date">Fecha *</label>
                  <input
                    type="date"
                    id="maint-date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Checklist Template Selector & Builder */}
              <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontWeight: 600 }}>📋 Checklist de Verificación</label>
                  <select
                    className="form-control"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const t = CHECKLIST_TEMPLATES.find(temp => temp.name === val);
                        if (t) {
                          setChecklist(t.items);
                          setCategory(t.category);
                        }
                      }
                      e.target.value = ""; // reset dropdown
                    }}
                    defaultValue=""
                    style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                  >
                    <option value="" disabled>-- Cargar plantilla rápida --</option>
                    {CHECKLIST_TEMPLATES.map((t, idx) => (
                      <option key={idx} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {checklist.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {checklist.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>✓ {item}</span>
                        <button
                          type="button"
                          style={{ padding: '2px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                          onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                          title="Eliminar punto"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Añadir punto personalizado..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newChecklistItem.trim()) {
                          setChecklist([...checklist, newChecklistItem.trim()]);
                          setNewChecklistItem('');
                        }
                      }
                    }}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (newChecklistItem.trim()) {
                        setChecklist([...checklist, newChecklistItem.trim()]);
                        setNewChecklistItem('');
                      }
                    }}
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="maint-mileage">Kilómetros al realizar la revisión *</label>
                  <input
                    type="number"
                    id="maint-mileage"
                    className="form-control"
                    value={mileage}
                    onChange={(e) => setMileage(Number(e.target.value))}
                    min={0}
                    required
                  />
                  {car && mileage < car.mileage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: '0.78rem', marginTop: '4px' }}>
                      <AlertTriangle size={12} />
                      <span>El kilometraje introducido es menor que el kilometraje actual ({car.mileage.toLocaleString()} km).</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Parts Section */}
              <div className="parts-builder">
                <div className="parts-builder-header">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                    <Wrench size={16} /> Piezas y Recambios Utilizados
                  </h4>
                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleAddPartRow}>
                    + Añadir Pieza
                  </button>
                </div>

                {parts.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '10px 0' }}>
                    No se han añadido piezas. Pulsa "+ Añadir Pieza" si utilizaste repuestos.
                  </p>
                ) : (
                  <div>
                    {parts.map((part, index) => {
                      const selectedInvPart = inventoryParts.find(ip => ip.id === part.inventoryPartId);
                      const isOutOfStock = selectedInvPart && selectedInvPart.stock < part.quantity;

                      return (
                        <div key={index} className="part-builder-card animate-fade-in">
                          <div className="part-builder-card-header">
                            <span className="part-builder-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>Pieza #{index + 1}</span>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                background: part.inventoryPartId ? 'rgba(138, 43, 226, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                color: part.inventoryPartId ? 'hsl(263, 90%, 75%)' : 'var(--text-secondary)'
                              }}>
                                {part.inventoryPartId ? '🔗 Vinculada al Inventario' : '✍️ Introducción Manual'}
                              </span>
                            </span>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 8px', color: 'var(--danger)', background: 'transparent', borderColor: 'transparent' }}
                              onClick={() => handleRemovePartRow(index)}
                              title="Quitar pieza"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="form-group" style={{ marginBottom: '8px' }}>
                            <label>Vincular con pieza del inventario (Opcional)</label>
                            <select
                              className="form-control"
                              value={part.inventoryPartId || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  // Switch to manual mode, reset ID but keep text values
                                  const newParts = [...parts];
                                  newParts[index] = {
                                    ...newParts[index],
                                    inventoryPartId: undefined
                                  };
                                  setParts(newParts);
                                } else {
                                  const selectedId = Number(val);
                                  const invPart = inventoryParts.find(p => p.id === selectedId);
                                  if (invPart) {
                                    // Auto-populate from selected inventory part
                                    const newParts = [...parts];
                                    newParts[index] = {
                                      partName: invPart.name,
                                      brand: invPart.brand || '',
                                      partNumber: invPart.part_number || '',
                                      quantity: 1,
                                      price: Number(invPart.price) || 0,
                                      inventoryPartId: invPart.id,
                                    };
                                    setParts(newParts);

                                    // Recalculate cost
                                    const partsCostSum = newParts.reduce((sum, p) => {
                                      const priceVal = Number(p.price) || 0;
                                      const qtyVal = Number(p.quantity) || 1;
                                      return sum + (priceVal * qtyVal);
                                    }, 0);
                                    setCost(Number(partsCostSum.toFixed(2)));
                                  }
                                }
                              }}
                              style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                            >
                              <option value="">-- Introducir manualmente (Sin vincular) --</option>
                              {inventoryParts.map((ip) => (
                                <option key={ip.id} value={ip.id} disabled={ip.stock <= 0}>
                                  📦 {ip.name} {ip.brand ? `(${ip.brand})` : ''} - Stock: {ip.stock} - {Number(ip.price).toFixed(2)}€
                                </option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group" style={{ marginBottom: '0' }}>
                              <label>Nombre de la pieza *</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Filtro de Aceite, etc."
                                value={part.partName}
                                onChange={(e) => handlePartChange(index, 'partName', e.target.value)}
                                required
                                disabled={!!part.inventoryPartId}
                                style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0' }}>
                              <label>Marca</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Bosch, etc."
                                value={part.brand}
                                onChange={(e) => handlePartChange(index, 'brand', e.target.value)}
                                disabled={!!part.inventoryPartId}
                                style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                            <div className="form-group" style={{ marginBottom: '0' }}>
                              <label>Nº Referencia</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="F-026-407-067"
                                value={part.partNumber}
                                onChange={(e) => handlePartChange(index, 'partNumber', e.target.value)}
                                disabled={!!part.inventoryPartId}
                                style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0' }}>
                              <label>Cantidad</label>
                              <input
                                type="number"
                                className="form-control"
                                value={part.quantity}
                                onChange={(e) => handlePartChange(index, 'quantity', Number(e.target.value))}
                                min={1}
                                style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0' }}>
                              <label>Precio Unitario (€)</label>
                              <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                placeholder="0.00"
                                value={part.price || ''}
                                onChange={(e) => handlePartChange(index, 'price', Number(e.target.value))}
                                min={0}
                                disabled={!!part.inventoryPartId}
                                style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                              />
                            </div>
                          </div>

                          {selectedInvPart && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                              <span className={`stock-badge ${selectedInvPart.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                Stock en inventario: {selectedInvPart.stock}
                              </span>
                              {isOutOfStock && (
                                <span className="stock-warning">
                                  <AlertTriangle size={14} /> La cantidad supera el stock ({selectedInvPart.stock})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label htmlFor="maint-cost">Costo Total de la Operación (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  id="maint-cost"
                  className="form-control"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Se autocalcula sumando el coste de las piezas añadidas, pero puedes editarlo manualmente si incluye mano de obra.
                </span>
              </div>

              {/* Document upload field */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Factura o Recibo (Opcional)</label>
                {documentPath ? (
                  <div className="uploaded-file-badge">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📄 {uploadedFileName || 'Factura adjunta'}
                    </span>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ padding: '4px 8px', color: 'var(--danger)', background: 'transparent', borderColor: 'transparent', width: 'auto' }}
                      onClick={() => { setDocumentPath(''); setUploadedFileName(''); }}
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div 
                    className="file-upload-container"
                    onClick={() => document.getElementById('maint-file-input')?.click()}
                  >
                    {uploadingFile ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 className="animate-spin" size={16} /> Subiendo archivo...
                      </span>
                    ) : (
                      <span>📁 Seleccionar factura o foto...</span>
                    )}
                    <input 
                      type="file" 
                      id="maint-file-input" 
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingFile(true);
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await apiFetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                          });
                          setDocumentPath(res.filePath);
                          setUploadedFileName(file.name);
                        } catch (err: any) {
                          alert('Error al subir archivo: ' + err.message);
                        } finally {
                          setUploadingFile(false);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowMaintModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submittingMaint}>
                  {submittingMaint ? 'Registrando...' : 'Registrar Mantenimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Alert Modal */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Programar Recordatorio</h3>
              <button className="modal-close" onClick={() => setShowAlertModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddAlert}>
              <div className="form-group">
                <label htmlFor="alert-desc">Descripción del recordatorio *</label>
                <input
                  type="text"
                  id="alert-desc"
                  className="form-control"
                  placeholder="Ej. Cambio de pastillas de freno, ITV, Revisión anual"
                  value={alertDesc}
                  onChange={(e) => setAlertDesc(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="alert-date">Fecha Límite (Opcional)</label>
                <input
                  type="date"
                  id="alert-date"
                  className="form-control"
                  value={alertTargetDate}
                  onChange={(e) => setAlertTargetDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="alert-mileage">Kilómetros Límite (Opcional)</label>
                <input
                  type="number"
                  id="alert-mileage"
                  className="form-control"
                  placeholder="Ej. 150000"
                  value={alertTargetMileage}
                  onChange={(e) => setAlertTargetMileage(e.target.value)}
                  min={0}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  El recordatorio se activará si el coche supera este kilometraje.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAlertModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submittingAlert}>
                  {submittingAlert ? 'Programar...' : 'Programar Alerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fuel Log Modal */}
      {showFuelModal && (
        <div className="modal-overlay" onClick={() => setShowFuelModal(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Repostaje</h3>
              <button className="modal-close" onClick={() => setShowFuelModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddFuelLog}>
              <div className="form-group">
                <label htmlFor="fuel-date">Fecha *</label>
                <input
                  type="date"
                  id="fuel-date"
                  className="form-control"
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fuel-mileage">Kilometraje Actual (km) *</label>
                <input
                  type="number"
                  id="fuel-mileage"
                  className="form-control"
                  value={fuelMileage}
                  onChange={(e) => setFuelMileage(Number(e.target.value))}
                  min={0}
                  required
                />
                {car && fuelMileage < car.mileage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: '0.78rem', marginTop: '4px' }}>
                    <AlertTriangle size={12} />
                    <span>El kilometraje introducido es menor que el kilometraje actual ({car.mileage.toLocaleString()} km).</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="fuel-liters">Litros Repostados (L) *</label>
                  <input
                    type="number"
                    step="0.01"
                    id="fuel-liters"
                    className="form-control"
                    placeholder="0.00"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fuel-price">Precio por Litro (€/L) *</label>
                  <input
                    type="number"
                    step="0.001"
                    id="fuel-price"
                    className="form-control"
                    placeholder="0.000"
                    value={fuelPricePerLiter}
                    onChange={(e) => setFuelPricePerLiter(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="fuel-total">Coste Total (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  id="fuel-total"
                  className="form-control"
                  placeholder="0.00"
                  value={fuelTotalCost}
                  onChange={(e) => setFuelTotalCost(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Se calcula automáticamente (Litros × Precio), pero puedes corregirlo si no coincide exactamente con el recibo.
                </span>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={fuelIsFull}
                    onChange={(e) => setFuelIsFull(e.target.checked)}
                  />
                  <span>¿Depósito Lleno? (Necesario para calcular consumo L/100km)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowFuelModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submittingFuel} style={{ background: 'var(--success)', boxShadow: '0 4px 15px var(--success-glow)' }}>
                  {submittingFuel ? 'Registrando...' : 'Registrar Repostaje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocUrl && (
        <div className="modal-overlay" onClick={() => setPreviewDocUrl(null)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} /> Vista Previa de Factura / Recibo
              </h3>
              <button className="modal-close" onClick={() => setPreviewDocUrl(null)}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
              {previewDocUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDocUrl}
                  width="100%"
                  height="500px"
                  style={{ border: 'none', borderRadius: '4px', background: '#fff' }}
                  title="Visor de Factura"
                />
              ) : /\.(jpg|jpeg|png|gif|webp)$/i.test(previewDocUrl.toLowerCase()) ? (
                <img
                  src={previewDocUrl}
                  style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '4px' }}
                  alt="Factura o Recibo"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  <AlertTriangle size={48} style={{ color: 'var(--warning)', marginBottom: '16px', opacity: 0.8 }} />
                  <p>Este tipo de documento no se puede previsualizar directamente.</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Utiliza el botón inferior para abrirlo en una nueva pestaña o descargarlo.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <a
                href={previewDocUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                Abrir en pestaña nueva ↗
              </a>
              <button className="btn-primary" onClick={() => setPreviewDocUrl(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
