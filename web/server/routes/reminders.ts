/**
 * 提醒系统 REST API 路由
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const CreateReminderSchema = z.object({
  message: z.string().min(1, 'message is required'),
  triggerAt: z.string().datetime({ offset: true, message: 'triggerAt must be a valid ISO 8601 datetime' }).optional(),
  schedule: z.string().optional(),
}).refine(
  (data) => data.triggerAt || data.schedule,
  { message: 'Either triggerAt or schedule is required' }
);

// POST /api/reminders — Create reminder
router.post('/reminders', async (req: Request, res: Response) => {
  try {
    const parsed = CreateReminderSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Invalid input';
      res.status(400).json({ success: false, error: firstError });
      return;
    }

    const reminderService = (req as any).reminderService;
    if (!reminderService) {
      res.status(503).json({ success: false, error: 'Reminder service not available' });
      return;
    }

    const reminder = await reminderService.create(parsed.data);
    res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create reminder';
    const status = message.includes('in the past') || message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

// GET /api/reminders — List reminders
router.get('/reminders', (req: Request, res: Response) => {
  try {
    const reminderService = (req as any).reminderService;
    if (!reminderService) {
      res.status(503).json({ success: false, error: 'Reminder service not available' });
      return;
    }

    const reminders = reminderService.list();
    res.json({ success: true, data: reminders, meta: { total: reminders.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list reminders';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/reminders/:id — Get reminder detail
router.get('/reminders/:id', (req: Request, res: Response) => {
  try {
    const reminderService = (req as any).reminderService;
    if (!reminderService) {
      res.status(503).json({ success: false, error: 'Reminder service not available' });
      return;
    }

    const reminder = reminderService.getById(req.params.id);
    if (!reminder) {
      res.status(404).json({ success: false, error: 'Reminder not found' });
      return;
    }

    res.json({ success: true, data: reminder });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get reminder';
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/reminders/:id — Delete reminder
router.delete('/reminders/:id', async (req: Request, res: Response) => {
  try {
    const reminderService = (req as any).reminderService;
    if (!reminderService) {
      res.status(503).json({ success: false, error: 'Reminder service not available' });
      return;
    }

    await reminderService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete reminder';
    const status = message === 'Reminder not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
