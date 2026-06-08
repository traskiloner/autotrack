# Autotrack - Gestor de Mantenimiento de Vehículos

Autotrack es una solución web premium y robusta diseñada para el seguimiento exhaustivo del mantenimiento de flotas de vehículos o coches personales. Permite registrar mantenimientos, gestionar alertas de revisiones anuales o por kilometraje, y controlar el inventario de piezas de recambio asociándolas directamente a los registros de mantenimiento con decremento automático de stock.

---

## 1. Arquitectura del Proyecto (Monorepo)

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
*   **`@autotrack/shared`**: Paquete de tipos puros. Define interfaces clave (`CarData`, `Maintenance`, `Part`, `InventoryPart`, `AlertData`, `MaintenanceData`) que usan de forma idéntica tanto la API como el cliente web.
*   **`autotrack-backend`**: Servidor API Express. Maneja la lógica de autenticación JWT, registro de vehículos, carga de facturas físicas/documentos en PDF con `multer`, y transacciones del inventario.
*   **`autotrack-frontend`**: SPA desarrollada con React, Vite y Lucide React. Su diseño emplea una estética moderna y oscura (glassmorphism, micro-animaciones en botones y gráficos de coste interactivos).

---

## 2. Infraestructura y Redes (Docker)

La infraestructura está totalmente aislada de la red externa a través de la red interna de Docker, exponiendo **únicamente el puerto 80** a internet.

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
> Ninguno de los contenedores de aplicación (`frontend`, `backend`, `db`) expone puertos hacia la máquina host. Esto significa que servicios vulnerables como la base de datos o el motor de ejecución Node están completamente protegidos ante ataques de escaneo de puertos externos. El único punto de entrada es el `gateway` Nginx, el cual enruta el tráfico interno de forma segura.

---

## 3. Base de Datos y ORM (Prisma v7)

La base de datos utiliza PostgreSQL. Para interactuar con ella se utiliza **Prisma ORM (v7)** a través de un adaptador nativo de consultas.

### Configuración de Prisma 7
En Prisma 7, la dirección de conexión no se escribe en `schema.prisma`. Se administra centralizadamente en `prisma.config.ts` y se pasa un adaptador en la inicialización:

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
| `User` | `users` | `1:N` con `Car`, `InventoryPart` | Datos de cuenta de usuarios y contraseñas hasheadas. |
| `Car` | `cars` | `N:1` con `User`, `1:N` con `Maintenance`, `Alert` | Vehículos registrados, kilometraje y especificaciones técnicas. |
| `Maintenance` | `maintenances` | `N:1` con `Car`, `1:N` con `Part` | Revisiones de mantenimiento, facturas en PDF y checklists. |
| `Part` | `parts` | `N:1` con `Maintenance`, `N:1` con `InventoryPart` (Opcional) | Piezas asociadas a un servicio de mantenimiento específico. |
| `InventoryPart`| `inventory_parts` | `N:1` con `User`, `1:N` con `Part` | Stock disponible y precios de repuestos listos para usar. |
| `MaintenanceAlert`| `maintenance_alerts`| `N:1` con `Car` | Recordatorios periódicos por fecha o por km. |

---

## 4. Guía de Inicio Rápido

### Requisitos Previos
*   **Docker** y **Docker Compose**
*   **Node.js v20+** y **npm** (para desarrollo local)

### Despliegue en Producción (Docker)

Para construir e iniciar toda la infraestructura (incluyendo la inicialización automática de tablas y sincronización de base de datos en el primer arranque):

1. Clona el repositorio.
2. Inicia los contenedores:
   ```bash
   docker compose up -d --build
   ```
3. Accede al sistema desde tu navegador en: **`http://localhost/`**

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

---

## 5. Detalles de la Lógica del Código

### Transaccionalidad de Stock (Mantenimiento e Inventario)
Cuando se registra un nuevo mantenimiento y se vincula una pieza del inventario (`inventory_part_id`), el controlador realiza una transacción en la base de datos (`prisma.$transaction`) que ejecuta secuencialmente:
1. Crea el registro en la tabla `maintenances`.
2. Asocia y guarda la pieza en `parts`.
3. Decrementa la cantidad indicada del stock de la pieza en `inventory_parts` (evitando valores negativos usando límites programáticos).
4. Actualiza el kilometraje global del vehículo en la tabla `cars` si el kilometraje del mantenimiento registrado es superior al actual.

Al eliminar un mantenimiento, se realiza la acción inversa: se recalculan las cantidades y se **restaura el stock original** de las piezas vinculadas al inventario de forma segura antes de remover la revisión.
