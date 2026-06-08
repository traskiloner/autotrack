# Autotrack - Gestor de Mantenimiento de Vehículos

Autotrack es una solución web premium y robusta creada con **Google Antigravity**. Su funcionalidad principal es ayudar a que las personas puedan registrar y hacer un seguimiento detallado del mantenimiento, coste y estado de sus vehículos o coches personales de forma centralizada.

La plataforma permite gestionar mantenimientos con checklists dinámicos, realizar el seguimiento del consumo de combustible, proyectar estimaciones predictivas de kilometraje, subir y previsualizar facturas (PDF/Imágenes), controlar piezas de recambio en stock y administrar cuentas de usuario desde un portal de superusuario.

---

## 1. Características Principales

1.  **Gestión de Vehículos**: Registro de especificaciones técnicas (modelo, año, código de motor, medidas de neumáticos, etc.) y kilometraje activo.
2.  **Registro de Mantenimientos**: Historial detallado de revisiones, vinculación de repuestos y cálculo automático de costos.
3.  **Control de Consumo de Combustible**: Módulo para registrar repostajes y obtener estadísticas avanzadas de medias de consumo (L/100km), coste medio de combustible (€/L) y kilometraje por tiempo (km/mes, €/mes).
4.  **Hitos Predictivos del Odómetro**: Predicción automática de las fechas de vencimiento de las alertas de mantenimiento basadas en el comportamiento real de conducción (km diarios estimados).
5.  **Checklists Dinámicos**: Plantillas precargadas y modificables en tiempo real para agilizar el registro de mantenimientos (Frenos, Pre-ITV, Aceites, Mantenimiento Anual).
6.  **Visor de Facturas Integrado**: Visualización directa en ventana modal de recibos en formato PDF e imágenes (JPG, PNG, WEBP).
7.  **Inventario Transaccional**: Reducción automática de stock en el inventario de repuestos al asociarlos a un mantenimiento, con restauración automática en caso de eliminación.
8.  **Portal de Administración**: Vista de superusuario para ver estadísticas globales del sistema y realizar operaciones CRUD (crear, editar, borrar y reasignar roles) sobre las cuentas de usuario.
9.  **Mi Perfil**: Sección para que cualquier usuario pueda autogestionar su nombre de usuario, email y contraseña.

---

## 2. Arquitectura del Proyecto (Monorepo)

El proyecto está estructurado como un **monorepo de npm** organizado mediante workspaces para facilitar la reutilización de código y tipos TypeScript:

```
autotrack-monorepo/
├── package.json               # Configuración de workspaces (shared, backend, frontend)
├── nginx-gateway.conf         # Proxy inverso de entrada
├── docker-compose.yml         # Orquestación de infraestructura en contenedores
├── shared/                    # Tipos e interfaces comunes en TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   └── src/index.ts           # Definiciones de tipos exportadas
├── backend/                   # API REST en Node/Express con Prisma
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma      # Esquema de la Base de Datos
│   │   └── prisma.config.ts   # Configuración de base de datos (Prisma v7)
│   └── src/                   # Código TypeScript del backend
└── frontend/                  # Aplicación de interfaz React SPA (Vite)
    ├── Dockerfile             # Build multi-etapa con Nginx
    ├── nginx.conf             # Enrutamiento SPA local de Nginx
    └── src/                   # Interfaz de usuario React
```

### Paquetes del Workspace
*   **`@autotrack/shared`**: Contiene las interfaces y definiciones comunes (`CarData`, `Maintenance`, `Part`, `InventoryPart`, `AlertData`, `MaintenanceData`, `FuelLog`, `User`) utilizadas tanto por la API del servidor como por la app cliente.
*   **`autotrack-backend`**: Servidor API Express. Implementa enrutamiento seguro, autenticación JWT, registro de uploads físicos de facturas con `multer`, transacciones del inventario con Prisma y endpoints de administración protegidos.
*   **`autotrack-frontend`**: SPA desarrollada en React y TypeScript con estilos premium en Dark Mode (glassmorphism, gráficos de consumo interactivos y micro-animaciones interactivas).

---

## 3. Infraestructura y Redes (Docker)

La infraestructura está aislada a través de la red interna de Docker, exponiendo **únicamente el puerto 80** a internet en el host local.

### Flujo de Red de las Peticiones

```mermaid
graph TD
    User([Navegador del Usuario]) -- Puerto 80 / --> Gateway[autotrack_gateway Nginx]
    User -- Puerto 80 /api/ o /uploads/ --> Gateway
    
    subgraph Red Interna de Docker (autotrack_network)
        Gateway -- "/" --> Frontend[autotrack_frontend Nginx]
        Gateway -- "/api/*" o "/uploads/*" --> Backend[autotrack_backend:5001]
        Backend -- "Prisma TCP" --> DB[(autotrack_db:5432)]
    end
    
    style Gateway fill:#8a2be2,stroke:#fff,stroke-width:2px,color:#fff
    style Frontend fill:#1e90ff,stroke:#fff,stroke-width:1px,color:#fff
    style Backend fill:#32cd32,stroke:#fff,stroke-width:1px,color:#fff
    style DB fill:#ff8c00,stroke:#fff,stroke-width:1px,color:#fff
```

> [!IMPORTANT]
> **Seguridad y Puertos Internos**  
> Ninguno de los contenedores de aplicación (`frontend`, `backend`, `db`) expone puertos hacia la máquina host. El único punto de entrada es el `gateway` Nginx, el cual enruta el tráfico interno de forma segura.

---

## 4. Base de Datos y ORM (Prisma v7)

La base de datos utiliza PostgreSQL. Para interactuar con ella se utiliza **Prisma ORM (v7)** a través de un adaptador nativo de consultas.

### Configuración de Prisma 7
En Prisma 7, la dirección de conexión se administra en `prisma.config.ts` y se pasa un adaptador en la inicialización:

```typescript
// backend/src/db/index.ts
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
```

### Tabla de Modelos
Todos los modelos de base de datos están configurados en [schema.prisma](file:///Users/alberto.andrades/Personal/autotrack-antigravity/backend/prisma/schema.prisma) mapeados de forma limpia usando convenciones de nombres en `snake_case` para el API y la DB:

| Modelo Prisma | Tabla de PostgreSQL | Relaciones | Descripción |
| :--- | :--- | :--- | :--- |
| `User` | `users` | `1:N` con `Car`, `InventoryPart` | Cuentas de usuario con campos de nombre, email, contraseña hasheada y rol. |
| `Car` | `cars` | `N:1` con `User`, `1:N` con `Maintenance`, `Alert`, `FuelLog` | Vehículos registrados, kilometraje y especificaciones técnicas. |
| `Maintenance` | `maintenances` | `N:1` con `Car`, `1:N` con `Part` | Revisiones de mantenimiento, facturas en PDF y checklists. |
| `Part` | `parts` | `N:1` con `Maintenance`, `N:1` con `InventoryPart` (Opcional) | Piezas asociadas a un servicio de mantenimiento específico. |
| `InventoryPart`| `inventory_parts` | `N:1` con `User`, `1:N` con `Part` | Stock disponible y precios de repuestos en almacén. |
| `MaintenanceAlert`| `maintenance_alerts`| `N:1` con `Car` | Recordatorios periódicos por fecha o por km. |
| `FuelLog` | `fuel_logs` | `N:1` con `Car` | Registros de repostajes (litros, coste total y estado de llenado) para consumos medios. |

---

## 5. Guía de Inicio Rápido

### Requisitos Previos
*   **Docker** y **Docker Compose**
*   **Node.js v20+** y **npm** (para desarrollo local)

### Configuración de Archivos de Entorno
Copia el archivo `.env.example` para crear tu configuración local:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### Despliegue en Producción (Docker)

Para construir e iniciar toda la infraestructura (incluyendo la inicialización automática de tablas y sincronización de base de datos en el primer arranque):

1. Inicia los contenedores:
   ```bash
   docker compose up -d --build
   ```
2. Accede al sistema desde tu navegador en: **`http://localhost/`**
3. **Primer Inicio (Superusuario)**: El sistema detectará que no hay administradores y te guiará para configurar la cuenta de superusuario inicial del sistema.

### Desarrollo Local (Modo Híbrido)

Si deseas realizar modificaciones en caliente sin reconstruir los contenedores:

1. Levanta únicamente la base de datos PostgreSQL:
   ```bash
   docker compose up -d db
   ```
2. Instala las dependencias en la raíz del monorepo:
   ```bash
   npm install
   ```
3. Construye el paquete de tipos compartidos:
   ```bash
   npm run build:shared
   ```
4. Ejecuta el backend y el frontend en terminales separadas en modo de desarrollo:
   ```bash
   # En una terminal para el Backend:
   npm run dev -w backend

   # En otra terminal para el Frontend:
   npm run dev -w frontend
   ```
   *Nota: En desarrollo local en el puerto 5173, la aplicación del frontend se comunicará automáticamente con la API en `http://localhost:5001`.*
