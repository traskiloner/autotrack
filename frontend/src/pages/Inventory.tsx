import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Search, Hash, Coins, Loader2, Edit3 } from 'lucide-react';
import { InventoryPart } from '@autotrack/shared';

export const Inventory: React.FC = () => {
  const { apiFetch } = useAuth();
  const [parts, setParts] = useState<InventoryPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<InventoryPart | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    try {
      const data = await apiFetch('/api/inventory');
      setParts(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const openAddModal = () => {
    setEditingPart(null);
    setName('');
    setBrand('');
    setPartNumber('');
    setPrice(0);
    setStock(0);
    setShowModal(true);
  };

  const openEditModal = (part: InventoryPart) => {
    setEditingPart(part);
    setName(part.name);
    setBrand(part.brand || '');
    setPartNumber(part.part_number || '');
    setPrice(part.price);
    setStock(part.stock);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body = {
      name,
      brand,
      partNumber,
      price: Number(price),
      stock: Number(stock),
    };

    try {
      if (editingPart) {
        // Edit flow
        const updatedPart = await apiFetch(`/api/inventory/${editingPart.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setParts(parts.map((p) => (p.id === editingPart.id ? updatedPart : p)));
      } else {
        // Add flow
        const newPart = await apiFetch('/api/inventory', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setParts([newPart, ...parts]);
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la pieza');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePart = async (partId: number) => {
    if (!confirm('¿Seguro que deseas eliminar esta pieza del inventario?')) return;

    try {
      await apiFetch(`/api/inventory/${partId}`, {
        method: 'DELETE',
      });
      setParts(parts.filter((p) => p.id !== partId));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la pieza');
    }
  };

  const handleAdjustStock = async (part: InventoryPart, adjustment: number) => {
    const newStock = part.stock + adjustment;
    if (newStock < 0) return;

    try {
      const updatedPart = await apiFetch(`/api/inventory/${part.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: part.name,
          brand: part.brand,
          partNumber: part.part_number,
          price: part.price,
          stock: newStock,
        }),
      });
      setParts(parts.map((p) => (p.id === part.id ? updatedPart : p)));
    } catch (err: any) {
      alert(err.message || 'Error al ajustar el stock');
    }
  };

  // Filter parts based on search
  const filteredParts = parts.filter((part) => {
    const term = searchTerm.toLowerCase();
    return (
      part.name.toLowerCase().includes(term) ||
      (part.brand && part.brand.toLowerCase().includes(term)) ||
      (part.part_number && part.part_number.toLowerCase().includes(term))
    );
  });

  return (
    <div className="animate-fade-in">
      {/* Navbar will be rendered by App.tsx, but let's keep the user menu here as well if needed. 
          Actually, since App.tsx will hold the tab navigation and navbar, we don't duplicate navbar.
          But we do render standard content inside the container */}

      <main className="container" style={{ paddingTop: '20px' }}>
        {/* Inventory Header */}
        <div className="inventory-header">
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Inventario de Piezas</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Gestiona tus repuestos, consumibles y piezas de repuesto guardadas.
            </p>
          </div>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={18} /> Registrar Pieza
          </button>
        </div>

        {/* Search controls */}
        <div className="glass-card search-bar-container" style={{ padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search 
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
              className="form-control"
              placeholder="Buscar por nombre, marca o referencia..."
              style={{ paddingLeft: '48px', width: '100%', background: 'rgba(0,0,0,0.2)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Loading / Empty States */}
        {loading ? (
          <div className="empty-state">
            <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary)' }} />
            <p>Cargando inventario...</p>
          </div>
        ) : error ? (
          <div className="glass-card" style={{ borderColor: 'var(--danger)', color: '#ff8a8a', padding: '20px', textAlign: 'center' }}>
            <p>{error}</p>
            <button className="btn-secondary" style={{ marginTop: '12px' }} onClick={fetchInventory}>Reintentar</button>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-icon" style={{ fontSize: '4rem' }}>📦</div>
            <h3>No se encontraron piezas</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto 16px' }}>
              {searchTerm 
                ? 'Ninguna pieza coincide con tu término de búsqueda.' 
                : 'Registra piezas de repuesto o herramientas para tenerlas listas al realizar tus mantenimientos.'}
            </p>
            {!searchTerm && (
              <button className="btn-primary" onClick={openAddModal}>
                <Plus size={18} /> Añadir mi primera pieza
              </button>
            )}
          </div>
        ) : (
          <div className="inventory-grid">
            {filteredParts.map((part) => (
              <div key={part.id} className="glass-card inventory-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{part.name}</h4>
                    <span 
                      style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--primary-hover)', 
                        background: 'rgba(138, 43, 226, 0.1)', 
                        padding: '2px 8px', 
                        borderRadius: '6px',
                        border: '1px solid rgba(138, 43, 226, 0.2)'
                      }}
                    >
                      {part.brand || 'Genérica'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Hash size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Ref: <strong>{part.part_number || 'N/E'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Coins size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Precio Unitario: <strong>{Number(part.price).toFixed(2)} €</strong></span>
                    </div>
                  </div>

                  {/* Stock Tracker */}
                  <div className="inventory-stock">
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Stock Disponible</span>
                    <div className="stock-controls">
                      <button className="stock-btn" onClick={() => handleAdjustStock(part, -1)} disabled={part.stock <= 0}>-</button>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, minWidth: '24px', textAlign: 'center', color: part.stock > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                        {part.stock}
                      </span>
                      <button className="stock-btn" onClick={() => handleAdjustStock(part, 1)}>+</button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px', marginTop: '12px' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '8px 12px', display: 'flex', gap: '6px' }}
                    onClick={() => openEditModal(part)}
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ 
                      padding: '8px 12px', 
                      background: 'rgba(239, 68, 68, 0.05)', 
                      borderColor: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--danger)' 
                    }}
                    onClick={() => handleDeletePart(part.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Piece Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPart ? 'Editar Pieza' : 'Registrar Nueva Pieza'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="part-name">Nombre de la pieza *</label>
                <input
                  type="text"
                  id="part-name"
                  className="form-control"
                  placeholder="Ej. Filtro de Aceite, Pastillas Brembo, Batería 12V"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="part-brand">Marca</label>
                  <input
                    type="text"
                    id="part-brand"
                    className="form-control"
                    placeholder="Ej. Bosch, Brembo, Tudor"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="part-ref">Número de Referencia / Modelo</label>
                  <input
                    type="text"
                    id="part-ref"
                    className="form-control"
                    placeholder="Ej. F-026-407-067"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="part-price">Precio Unitario estimado (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    id="part-price"
                    className="form-control"
                    placeholder="0.00"
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    min={0}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="part-stock">Stock Inicial</label>
                  <input
                    type="number"
                    id="part-stock"
                    className="form-control"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingPart ? 'Guardar Cambios' : 'Registrar Pieza'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
