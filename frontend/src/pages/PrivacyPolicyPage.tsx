import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div className="glass-card animate-fade-in" style={{ maxWidth: '800px', width: '100%', padding: '40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={32} style={{ color: 'var(--primary)' }} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>Política de Privacidad</h1>
          </div>
          <button 
            className="btn-secondary" 
            onClick={() => window.location.href = '/'}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
          >
            <ArrowLeft size={18} />
            Volver
          </button>
        </div>

        {/* Content */}
        <div style={{ lineHeight: '1.7', color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
          <p style={{ marginBottom: '20px', color: 'var(--text-primary)', fontWeight: 500 }}>
            Última actualización: Julio 2026
          </p>

          <p style={{ marginBottom: '30px' }}>
            En <strong>AutoTrack</strong> nos tomamos muy en serio la privacidad y la protección de tus datos personales. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos la información cuando utilizas nuestra aplicación web y móvil.
          </p>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 600, marginBottom: '12px' }}>
              1. Responsable del Tratamiento de los Datos
            </h2>
            <p>
              AutoTrack es una aplicación desarrollada para la gestión y seguimiento personal de vehículos. El responsable del tratamiento de los datos que se recopilan a través de la aplicación es el propio usuario administrador del despliegue o la entidad propietaria de la instancia correspondiente del servicio.
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 600, marginBottom: '12px' }}>
              2. Datos que Recopilamos
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Para poder ofrecerte las funcionalidades de seguimiento y mantenimiento de tus coches, recopilamos la siguiente información:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Datos de tu Cuenta:</strong> Nombre de usuario, dirección de correo electrónico y contraseña (cifrada de manera segura con algoritmos de hashing).</li>
              <li style={{ marginBottom: '8px' }}><strong>Datos de tus Vehículos:</strong> Marca, modelo, año, matrícula/VIN, kilometraje actual, imágenes del vehículo y configuración de alertas.</li>
              <li style={{ marginBottom: '8px' }}><strong>Registros de Mantenimiento:</strong> Detalles de servicios mecánicos realizados, costes asociados, facturas y fechas.</li>
              <li style={{ marginBottom: '8px' }}><strong>Inventario:</strong> Repuestos guardados, cantidades, ubicaciones físicas y precios.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 600, marginBottom: '12px' }}>
              3. Finalidad del Tratamiento
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Tus datos personales e información vehicular son tratados con las siguientes finalidades exclusivas:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>Permitirte gestionar de forma centralizada tu inventario de coches y mantenimiento.</li>
              <li style={{ marginBottom: '8px' }}>Calcular y generar alertas de mantenimiento automáticas basadas en tiempo o kilometraje.</li>
              <li style={{ marginBottom: '8px' }}>Enviarte notificaciones por correo electrónico sobre tus próximas alertas.</li>
              <li style={{ marginBottom: '8px' }}>Proporcionarte un acceso seguro y sincronizado a tu perfil personal en múltiples dispositivos (Web, iOS y Android).</li>
            </ul>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 600, marginBottom: '12px' }}>
              4. Conservación y Eliminación de Datos
            </h2>
            <p>
              Tus datos se almacenan de manera indefinida mientras mantengas activa tu cuenta. Puedes eliminar todos tus datos en cualquier momento: si decides eliminar tu cuenta desde la sección <strong>"Zona de Peligro"</strong> en tu Perfil, el sistema procederá a borrar permanentemente tu usuario y todos los registros asociados de manera inmediata e irreversible.
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 600, marginBottom: '12px' }}>
              5. Derechos de los Usuarios (ARCO)
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Dispones de plenos derechos sobre tu información de acuerdo con las normativas de protección de datos:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Acceso:</strong> Puedes ver y exportar toda tu información navegando por las pantallas de la app.</li>
              <li style={{ marginBottom: '8px' }}><strong>Rectificación:</strong> Puedes editar tu perfil y registros en cualquier momento.</li>
              <li style={{ marginBottom: '8px' }}><strong>Supresión:</strong> Derecho al olvido y borrado permanente de tu cuenta autogestionado.</li>
              <li style={{ marginBottom: '8px' }}><strong>Oposición y Limitación:</strong> Puedes revocar el permiso de envío de correos desactivando tus notificaciones en cada vehículo.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 600, marginBottom: '12px' }}>
              6. Seguridad y Confidencialidad
            </h2>
            <p>
              Las comunicaciones entre tu dispositivo y nuestros servidores viajan de forma segura mediante HTTPS. Todas las credenciales críticas, como tu contraseña, se almacenan empleando algoritmos de hashing seguro de una sola vía (bcrypt), de forma que ni los propios administradores del sistema pueden conocerla.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
