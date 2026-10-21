import { z } from 'zod';

/**
 * Validation schemas shared by backend (request validation) and frontend (forms).
 * Field names follow the API payloads (camelCase).
 */

const currentYear = new Date().getFullYear();

/** Treats '', null and undefined as "not provided". */
const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

/** Optional text: '' / null become null, undefined stays undefined (= "don't change" on updates). */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

const requiredText = (max: number, label: string) =>
  z
    .string({ error: `${label} es obligatorio` })
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(max, `${label}: máximo ${max} caracteres`);

const nonNegativeInt = (label: string) =>
  z.coerce
    .number({ error: `${label} debe ser un número` })
    .int(`${label} debe ser un número entero`)
    .min(0, `${label} no puede ser negativo`);

const optionalNonNegativeInt = (label: string) =>
  z.preprocess(emptyToUndefined, nonNegativeInt(label).optional());

const money = (label: string) =>
  z.coerce
    .number({ error: `${label} debe ser un número` })
    .min(0, `${label} no puede ser negativo`)
    .max(99_999_999, `${label} es demasiado alto`);

const dateField = (label: string) =>
  z.coerce.date({ error: `${label} no es una fecha válida` }).refine((d) => !isNaN(d.getTime()), {
    message: `${label} no es una fecha válida`,
  });

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

export const idSchema = z.coerce
  .number({ error: 'Identificador no válido' })
  .int('Identificador no válido')
  .positive('Identificador no válido');

export const roleSchema = z.enum(['user', 'admin'], { error: 'Rol no válido' });

export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(128, 'La contraseña es demasiado larga');

export const usernameSchema = z
  .string({ error: 'El nombre de usuario es obligatorio' })
  .trim()
  .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
  .max(50, 'El nombre de usuario no puede superar 50 caracteres')
  .regex(/^[\p{L}\p{N}._ -]+$/u, 'El nombre de usuario contiene caracteres no permitidos');

export const emailSchema = z
  .string({ error: 'El correo es obligatorio' })
  .trim()
  .toLowerCase()
  .max(100, 'El correo no puede superar 100 caracteres')
  .pipe(z.email('El correo electrónico no es válido'));

/** Paths returned by POST /api/upload, e.g. `/uploads/3f2a....pdf`. */
export const documentPathSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\/uploads\/[A-Za-z0-9._-]{1,200}$/, 'Ruta de documento no válida')
    .nullable()
    .optional()
);

// ---------------------------------------------------------------------------
// Auth / users
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria').max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string({ error: 'Refresh token es requerido' }).min(1, 'Refresh token es requerido').max(2048),
});

export const updateProfileSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), passwordSchema.optional()),
});

export const adminCreateUserSchema = registerSchema.extend({
  role: roleSchema,
});

export const adminUpdateUserSchema = z.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  role: roleSchema.optional(),
  is_active: z.boolean().optional(),
  password: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), passwordSchema.optional()),
});

export const transferCarSchema = z.object({
  userId: idSchema,
});

// ---------------------------------------------------------------------------
// Cars & sharing
// ---------------------------------------------------------------------------

export const carSchema = z.object({
  brand: requiredText(50, 'La marca'),
  model: requiredText(50, 'El modelo'),
  year: z.coerce
    .number({ error: 'El año debe ser un número' })
    .int('El año debe ser un número entero')
    .min(1900, 'El año no es válido')
    .max(currentYear + 1, 'El año no es válido'),
  licensePlate: requiredText(20, 'La matrícula'),
  color: optionalText(30),
  mileage: optionalNonNegativeInt('El kilometraje'),
  engineCode: optionalText(50),
  vin: optionalText(50),
  tireSize: optionalText(50),
  oilType: optionalText(50),
});

export const carUpdateSchema = carSchema.partial();

export const shareCarSchema = z.object({
  identifier: requiredText(100, 'El nombre de usuario o email'),
  canEdit: z.boolean().optional(),
});

export const sharePermissionSchema = z.object({
  canEdit: z.boolean({ error: 'canEdit debe ser verdadero o falso' }),
});

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export const partInputSchema = z.object({
  partName: requiredText(100, 'El nombre de la pieza'),
  brand: optionalText(50),
  partNumber: optionalText(50),
  quantity: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int('La cantidad debe ser un número entero').min(1, 'La cantidad mínima es 1').max(10_000).default(1)
  ),
  price: z.preprocess(emptyToUndefined, money('El precio de la pieza').default(0)),
  inventoryPartId: z.preprocess(emptyToUndefined, idSchema.optional()),
});

export const checklistSchema = z
  .array(z.string().trim().min(1).max(200, 'Cada punto del checklist admite 200 caracteres'))
  .max(100, 'El checklist admite como máximo 100 puntos');

export const maintenanceSchema = z.object({
  description: requiredText(5000, 'La descripción'),
  details: optionalText(20000),
  mileage: nonNegativeInt('El kilometraje'),
  cost: z.preprocess(emptyToUndefined, money('El coste').optional()),
  date: dateField('La fecha'),
  category: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
  documentPath: documentPathSchema,
  checklist: z.preprocess(
    (v) => {
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      }
      return v ?? undefined;
    },
    checklistSchema.optional()
  ),
  parts: z.array(partInputSchema).max(100, 'Máximo 100 piezas por mantenimiento').optional(),
});

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const inventoryPartSchema = z.object({
  name: requiredText(100, 'El nombre de la pieza'),
  brand: optionalText(50),
  partNumber: optionalText(50),
  price: z.preprocess(emptyToUndefined, money('El precio').optional()),
  stock: optionalNonNegativeInt('El stock'),
  purchaseUrl: z.preprocess(
    emptyToUndefined,
    z
      .url({ protocol: /^https?$/, error: 'La URL de compra no es válida (debe empezar por http/https)' })
      .max(2000)
      .nullable()
      .optional()
  ),
});

export const inventoryPartUpdateSchema = inventoryPartSchema.partial();

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export const alertSchema = z
  .object({
    description: requiredText(255, 'La descripción de la alerta'),
    targetDate: z.preprocess(emptyToUndefined, dateField('La fecha objetivo').optional()),
    targetMileage: optionalNonNegativeInt('El kilometraje objetivo'),
  })
  .refine((a) => a.targetDate !== undefined || a.targetMileage !== undefined, {
    message: 'Debes introducir una fecha o un kilometraje objetivo',
  });

// ---------------------------------------------------------------------------
// Fuel
// ---------------------------------------------------------------------------

export const fuelLogSchema = z.object({
  date: dateField('La fecha'),
  mileage: nonNegativeInt('El kilometraje'),
  liters: z.coerce
    .number({ error: 'Los litros deben ser un número' })
    .positive('Los litros deben ser un número mayor que 0')
    .max(10_000, 'Los litros son demasiado altos'),
  pricePerLiter: z.coerce
    .number({ error: 'El precio por litro debe ser un número' })
    .positive('El precio por litro debe ser un número mayor que 0')
    .max(1_000, 'El precio por litro es demasiado alto'),
  totalCost: z.preprocess(emptyToUndefined, money('El coste total').optional()),
  isFullTank: z.boolean().optional().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CarInput = z.infer<typeof carSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
export type PartInput = z.infer<typeof partInputSchema>;
export type FuelLogInput = z.infer<typeof fuelLogSchema>;
export type AlertInput = z.infer<typeof alertSchema>;
export type InventoryPartInput = z.infer<typeof inventoryPartSchema>;
