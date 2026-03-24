import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Server } from 'http';
import { ReminderService } from '../../src/reminders/service.js';
import { NotificationDispatcher } from '../../src/notifications/dispatcher.js';
import remindersRouter from '../../web/server/routes/reminders.js';

// Mock dependencies
vi.mock('../../src/reminders/store.js', () => ({
  loadReminders: vi.fn().mockResolvedValue([]),
  saveReminders: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/reminders/scheduler.js', () => ({
  scheduleReminder: vi.fn(),
  cancelReminder: vi.fn(),
  cancelAll: vi.fn(),
  timeToCronExpression: vi.fn().mockReturnValue('0 15 25 3 *'),
  validateCronExpression: vi.fn().mockImplementation((expr: string) => {
    return /^[\d*,\-\/]+ [\d*,\-\/]+ [\d*,\-\/]+ [\d*,\-\/]+ [\d*,\-\/]+$/.test(expr);
  }),
}));

vi.mock('../../src/utils/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Reminders REST API', () => {
  let app: ReturnType<typeof express>;
  let service: ReminderService;

  beforeAll(() => {
    const dispatcher = new NotificationDispatcher();
    service = new ReminderService(dispatcher);

    app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.reminderService = service;
      next();
    });
    app.use('/api', remindersRouter);
  });

  afterAll(() => {
    service.shutdown();
  });

  describe('POST /api/reminders', () => {
    it('creates a one-shot reminder', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      const res = await request(app)
        .post('/api/reminders')
        .send({ message: '喝水', triggerAt: future });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('喝水');
      expect(res.body.data.type).toBe('one-shot');
    });

    it('creates a recurring reminder', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .send({ message: '检查邮件', schedule: '0 9 * * *' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('recurring');
    });

    it('returns 400 when message is missing', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .send({ triggerAt: new Date(Date.now() + 60_000).toISOString() });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when neither triggerAt nor schedule provided', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .send({ message: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid triggerAt format', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .send({ message: 'test', triggerAt: 'tomorrow' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for past triggerAt', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      const res = await request(app)
        .post('/api/reminders')
        .send({ message: 'test', triggerAt: past });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('past');
    });

    it('returns 400 for invalid cron expression', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .send({ message: 'test', schedule: 'invalid cron' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/reminders', () => {
    it('returns list of active reminders', async () => {
      const res = await request(app).get('/api/reminders');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/reminders/:id', () => {
    it('returns a reminder by id', async () => {
      const future = new Date(Date.now() + 120_000).toISOString();
      const createRes = await request(app)
        .post('/api/reminders')
        .send({ message: 'find-me', triggerAt: future });

      const id = createRes.body.data.id;
      const res = await request(app).get(`/api/reminders/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('find-me');
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/api/reminders/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/reminders/:id', () => {
    it('updates message', async () => {
      const future = new Date(Date.now() + 120_000).toISOString();
      const createRes = await request(app)
        .post('/api/reminders')
        .send({ message: 'original', triggerAt: future });

      const id = createRes.body.data.id;
      const res = await request(app)
        .patch(`/api/reminders/${id}`)
        .send({ message: 'updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('updated');
    });

    it('updates triggerAt', async () => {
      const future1 = new Date(Date.now() + 120_000).toISOString();
      const future2 = new Date(Date.now() + 240_000).toISOString();
      const createRes = await request(app)
        .post('/api/reminders')
        .send({ message: 'test', triggerAt: future1 });

      const id = createRes.body.data.id;
      const res = await request(app)
        .patch(`/api/reminders/${id}`)
        .send({ triggerAt: future2 });

      expect(res.status).toBe(200);
      expect(res.body.data.triggerAt).toBe(future2);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app)
        .patch('/api/reminders/nonexistent')
        .send({ message: 'x' });

      expect(res.status).toBe(404);
    });

    it('returns 400 for past triggerAt', async () => {
      const future = new Date(Date.now() + 120_000).toISOString();
      const createRes = await request(app)
        .post('/api/reminders')
        .send({ message: 'test', triggerAt: future });

      const id = createRes.body.data.id;
      const past = new Date(Date.now() - 60_000).toISOString();
      const res = await request(app)
        .patch(`/api/reminders/${id}`)
        .send({ triggerAt: past });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/reminders/:id', () => {
    it('deletes a reminder', async () => {
      const future = new Date(Date.now() + 120_000).toISOString();
      const createRes = await request(app)
        .post('/api/reminders')
        .send({ message: 'delete-me', triggerAt: future });

      const id = createRes.body.data.id;
      const res = await request(app).delete(`/api/reminders/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).delete('/api/reminders/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
