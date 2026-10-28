import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { escapeHtml } from '../services/emailService';
import { hashRefreshToken } from '../controllers/authController';
import { setSecretsForTesting } from '../config';
import {
  registerSchema,
  carSchema,
  maintenanceSchema,
  fuelLogSchema,
  sharePermissionSchema,
} from '@autotrack/shared';

describe('Security & Validation Tests', () => {
  beforeAll(() => {
    setSecretsForTesting({
      jwt: 'test_jwt_secret_value_for_unit_testing_1234567890',
      files: 'test_file_signing_secret_for_unit_testing_1234567890',
    });
  });

  describe('HTML Escaping (Email injection prevention)', () => {
    it('escapes HTML tags, quotes and ampersands properly', () => {
      const malicious = '<script>alert("xss")</script> & "foo" \'bar\'';
      const safe = escapeHtml(malicious);
      expect(safe).not.toContain('<script>');
      expect(safe).toContain('&lt;script&gt;');
      expect(safe).toContain('&quot;xss&quot;');
      expect(safe).toContain('&amp;');
      expect(safe).toContain('&#39;bar&#39;');
    });

    it('handles empty or null inputs safely', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null as any)).toBe('');
      expect(escapeHtml(undefined as any)).toBe('');
    });
  });

  describe('Refresh Token Hashing', () => {
    it('hashes tokens deterministically with SHA-256', () => {
      const token = 'sample_opaque_refresh_token_string';
      const hash1 = hashRefreshToken(token);
      const hash2 = hashRefreshToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // 64 hex characters
    });
  });

  describe('Shared Zod Schemas Validation', () => {
    it('rejects passwords shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        username: 'validuser',
        email: 'test@example.com',
        password: '123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos 8 caracteres');
      }
    });

    it('rejects invalid email formats', () => {
      const result = registerSchema.safeParse({
        username: 'validuser',
        email: 'not-an-email',
        password: 'validPassword123',
      });
      expect(result.success).toBe(false);
    });

    it('validates car schema and rejects missing required fields', () => {
      const result = carSchema.safeParse({
        brand: 'Toyota',
      });
      expect(result.success).toBe(false);
    });

    it('validates maintenance checklist as array and normalizes', () => {
      const result = maintenanceSchema.safeParse({
        description: 'Cambio de aceite',
        mileage: 120000,
        date: '2026-05-10',
        checklist: ['Aceite', 'Filtro'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative liters or price in fuel logs', () => {
      const result = fuelLogSchema.safeParse({
        date: '2026-05-10',
        mileage: 120000,
        liters: -5,
        pricePerLiter: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('validates share permission schema correctly', () => {
      expect(sharePermissionSchema.safeParse({ canEdit: true }).success).toBe(true);
      expect(sharePermissionSchema.safeParse({ canEdit: false }).success).toBe(true);
      expect(sharePermissionSchema.safeParse({ canEdit: 'yes' }).success).toBe(false);
      expect(sharePermissionSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('HTTP Endpoints Authorization & Protection', () => {
    it('returns 401 when accessing protected /api/cars without token', async () => {
      const res = await request(app).get('/api/cars');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('No token provided');
    });

    it('returns 401 when accessing protected /api/inventory without token', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.status).toBe(401);
    });

    it('returns 401 when updating share role without token', async () => {
      const res = await request(app)
        .put('/api/cars/1/share/2')
        .send({ canEdit: true });
      expect(res.status).toBe(401);
    });

    it('returns 401 when accessing /uploads/:filename without token', async () => {
      const res = await request(app).get('/uploads/document.pdf');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Se requiere autenticación');
    });

    it('returns 401 when accessing /uploads/:filename with invalid token query', async () => {
      const res = await request(app).get('/uploads/document.pdf?token=invalid_jwt_token');
      expect(res.status).toBe(401);
    });

    it('rejects registration with invalid payload (Zod validation in express)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'ab', // too short (< 3 chars)
        email: 'bad-email',
        password: 'short',
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });
  });
});
