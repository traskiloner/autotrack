import React from 'react';
import { X, Shield } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 14, 23, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflow: 'hidden',
          borderColor: 'var(--border-glass)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '16px',
            marginBottom: '16px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{ 
                background: 'var(--primary-glow)', 
                color: 'var(--primary)', 
                padding: '8px', 
                borderRadius: 'var(--radius-sm)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Shield size={22} style={{ color: 'var(--primary)' }} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Política de Privacidad</h2>
          </div>
          <button 
            className="btn-secondary btn-icon" 
            onClick={onClose}
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              cursor: 'pointer'
            }}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div 
          style={{
            overflowY: 'auto',
            paddingRight: '8px',
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            flexGrow: 1
          }}
        >
          <p style={{ marginBottom: '16px', color: 'var(--text-primary)', fontWeight: 500 }}>
            Última actualización: Julio 2026
          </p>

          <p style={{ marginBottom: '16px' }}>
            En <strong>AutoTrack</strong> nos tomamos muy en serio la privacidad y la protección de tus datos personales. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos la información cuando utilizas nuestra aplicación.
          </p>

          {/* 1. Responsable */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
              1. Responsable del Tratamiento de los Datos
            </h3>
            <p>
              AutoTrack es una aplicación desarrollada para la gestión y seguimiento personal de vehículos. El responsable del tratamiento de los datos que se recopilan a través de la aplicación es el propio usuario administrador del despliegue o la entidad propietaria de la instancia correspondiente del servicio.
            </p>
          </section>

          {/* 2. Datos recopilados */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
              2. Datos que Recopilamos
            </h3>
            <p style={{ marginBottom: '8px' }}>
              Para poder ofrecerte las funcionalidades de seguimiento y mantenimiento de tus coches, recopilamos la siguiente información:
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
              <li><strong>Datos de tu Cuenta:</strong> Nombre de usuario, dirección de correo electrónico y contraseña (esta última cifrada de manera segura con hashing).</li>
              <li><strong>Datos de tus Vehículos:</strong> Marca, modelo, año, matrícula/VIN (si lo introduces), kilometraje actual, imagen del coche y configuración de alertas.</li>
              <li><strong>Registros de Mantenimiento:</strong> Detalles de servicios realizados (cambios de aceite, neumáticos, filtros, etc.), costes asociados y fechas.</li>
              <li><strong>Inventario de Repuestos:</strong> Repuestos guardados, cantidades, precios y notas adicionales.</li>
            </ul>
          </section>

          {/* 3. Finalidad */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
              3. Finalidad del Tratamiento
            </h3>
            <p style={{ marginBottom: '8px' }}>
              Tus datos personales e información vehicular son tratados con las siguientes finalidades exclusivas:
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
              <li>Permitirte gestionar de forma centralizada el inventario de coches y repuestos.</li>
              <li>Calcular alertas de mantenimiento basadas en tiempo transcurrido o kilometraje.</li>
              <li>Enviarte notificaciones por correo electrónico sobre tus próximas alertas de mantenimiento configuradas.</li>
              <li>Proporcionarte acceso seguro a tu perfil personal en múltiples dispositivos.</li>
            </ul>
          </section>

          {/* 4. Conservación de datos */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
              4. Conservación y Eliminación de Datos
            </h3>
            <p>
              Tus datos se almacenan de manera indefinida mientras mantengas activa tu cuenta en AutoTrack. Puedes eliminar todos tus datos en cualquier momento: si decides eliminar tu cuenta desde la sección <strong>"Zona de Peligro"</strong> de tu Perfil, el sistema procederá a borrar permanentemente tu usuario, tus coches, tus repuestos y tus mantenimientos asociados de manera inmediata e irreversible de la base de datos activa.
            </p>
          </section>

          {/* 5. Derechos del usuario */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
              5. Derechos de los Usuarios (ARCO)
            </h3>
            <p style={{ marginBottom: '8px' }}>
              Como titular de los datos, dispones de plenos derechos sobre tu información de acuerdo con las normativas de protección de datos aplicables:
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
              <li><strong>Acceso:</strong> Puedes ver toda la información de tus vehículos, repuestos e información de perfil navegando por la app.</li>
              <li><strong>Rectificación:</strong> Puedes editar tu perfil, información del vehículo o repuestos directamente en sus respectivas secciones en cualquier momento.</li>
              <li><strong>Supresión:</strong> Tienes derecho a la eliminación inmediata de tu cuenta mediante la función de autogestión de baja de cuenta.</li>
              <li><strong>Oposición y Limitación:</strong> Puedes deshabilitar los envíos de correos electrónicos de alertas o revocar permisos específicos editando tus configuraciones de alertas.</li>
            </ul>
          </section>

          {/* 6. Seguridad */}
          <section style={{ marginBottom: '10px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
              6. Seguridad y Confidencialidad
            </h3>
            <p>
              Implementamos medidas técnicas y organizativas adecuadas para proteger tu información. Las comunicaciones entre la aplicación y el servidor viajan de forma cifrada mediante HTTPS, y las contraseñas se almacenan mediante algoritmos de hashing seguro de una sola vía (bcrypt), evitando que puedan ser descifradas incluso en caso de acceso no autorizado a la base de datos.
            </p>
          </section>
        </div>

        {/* Footer Actions */}
        <div 
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '16px',
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0
          }}
        >
          <button 
            type="button" 
            className="btn-primary" 
            onClick={onClose}
            style={{ padding: '10px 24px', fontSize: '0.9rem' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
