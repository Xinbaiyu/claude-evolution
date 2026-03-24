import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing service
vi.mock('../../src/reminders/store.js', () => ({
  loadReminders: vi.fn().mockResolvedValue([]),
  saveReminders: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/reminders/scheduler.js', () => ({
  scheduleReminder: vi.fn(),
  cancelReminder: vi.fn(),
  cancelAll: vi.fn(),
  timeToCronExpression: vi.fn().mockReturnValue('0 15 25 3 *'),
  validateCronExpression: vi.fn().mockReturnValue(true),
}));

vi.mock('../../src/utils/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { ReminderService } from '../../src/reminders/service.js';
import { NotificationDispatcher } from '../../src/notifications/dispatcher.js';
import { loadReminders, saveReminders } from '../../src/reminders/store.js';
import { scheduleReminder, cancelReminder, cancelAll, validateCronExpression } from '../../src/reminders/scheduler.js';

function createDispatcher(): NotificationDispatcher {
  return new NotificationDispatcher();
}

describe('ReminderService', () => {
  let service: ReminderService;
  let dispatcher: NotificationDispatcher;

  beforeEach(() => {
    vi.clearAllMocks();
    dispatcher = createDispatcher();
    service = new ReminderService(dispatcher);
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('create', () => {
    it('creates a one-shot reminder with triggerAt', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      const reminder = await service.create({
        message: '喝水',
        triggerAt: future,
      });

      expect(reminder.message).toBe('喝水');
      expect(reminder.type).toBe('one-shot');
      expect(reminder.status).toBe('active');
      expect(reminder.triggerAt).toBe(future);
      expect(reminder.id).toBeDefined();
      expect(saveReminders).toHaveBeenCalledOnce();
      expect(scheduleReminder).toHaveBeenCalledOnce();
    });

    it('creates a recurring reminder with schedule', async () => {
      const reminder = await service.create({
        message: '检查邮件',
        schedule: '0 9 * * *',
      });

      expect(reminder.message).toBe('检查邮件');
      expect(reminder.type).toBe('recurring');
      expect(reminder.schedule).toBe('0 9 * * *');
      expect(reminder.cronExpression).toBe('0 9 * * *');
      expect(scheduleReminder).toHaveBeenCalledOnce();
    });

    it('throws when message is empty', async () => {
      await expect(service.create({ message: '' })).rejects.toThrow('message is required');
    });

    it('throws when neither triggerAt nor schedule provided', async () => {
      await expect(service.create({ message: 'test' })).rejects.toThrow(
        'Either triggerAt or schedule is required'
      );
    });

    it('throws when triggerAt is in the past', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      await expect(service.create({ message: 'test', triggerAt: past })).rejects.toThrow(
        'Reminder time is in the past'
      );
    });

    it('throws when triggerAt is invalid', async () => {
      await expect(
        service.create({ message: 'test', triggerAt: 'not-a-date' })
      ).rejects.toThrow('triggerAt must be a valid ISO 8601 datetime');
    });

    it('throws when cron expression is invalid', async () => {
      vi.mocked(validateCronExpression).mockReturnValueOnce(false);
      await expect(
        service.create({ message: 'test', schedule: 'bad' })
      ).rejects.toThrow('Invalid cron expression');
    });
  });

  describe('delete', () => {
    it('deletes an existing reminder', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      const reminder = await service.create({ message: 'test', triggerAt: future });

      await service.delete(reminder.id);

      expect(cancelReminder).toHaveBeenCalledWith(reminder.id);
      expect(service.list()).toHaveLength(0);
      expect(saveReminders).toHaveBeenCalledTimes(2); // create + delete
    });

    it('throws when reminder not found', async () => {
      await expect(service.delete('nonexistent')).rejects.toThrow('Reminder not found');
    });
  });

  describe('list', () => {
    it('returns only active reminders', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      await service.create({ message: 'r1', triggerAt: future });
      await service.create({ message: 'r2', schedule: '0 9 * * *' });

      const list = service.list();
      expect(list).toHaveLength(2);
      expect(list.every((r) => r.status === 'active')).toBe(true);
    });

    it('returns empty array when no reminders', () => {
      expect(service.list()).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('returns the reminder by id', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      const created = await service.create({ message: 'find me', triggerAt: future });

      const found = service.getById(created.id);
      expect(found).toBeDefined();
      expect(found!.message).toBe('find me');
    });

    it('returns undefined for unknown id', () => {
      expect(service.getById('unknown')).toBeUndefined();
    });
  });

  describe('recover', () => {
    it('restores persisted reminders and schedules them', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      vi.mocked(loadReminders).mockResolvedValueOnce([
        {
          id: 'r1',
          message: 'persisted',
          type: 'recurring',
          createdAt: new Date().toISOString(),
          schedule: '0 9 * * *',
          cronExpression: '0 9 * * *',
          status: 'active',
        },
        {
          id: 'r2',
          message: 'future one-shot',
          type: 'one-shot',
          createdAt: new Date().toISOString(),
          triggerAt: future,
          cronExpression: '0 15 25 3 *',
          status: 'active',
        },
      ]);

      await service.recover();

      expect(service.list()).toHaveLength(2);
      expect(scheduleReminder).toHaveBeenCalledTimes(2);
    });

    it('immediately triggers overdue one-shot reminders', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      const dispatchSpy = vi.spyOn(dispatcher, 'dispatch').mockResolvedValue();

      vi.mocked(loadReminders).mockResolvedValueOnce([
        {
          id: 'overdue',
          message: 'overdue reminder',
          type: 'one-shot',
          createdAt: new Date().toISOString(),
          triggerAt: past,
          cronExpression: '0 0 1 1 *',
          status: 'active',
        },
      ]);

      await service.recover();

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'overdue reminder', type: 'reminder' })
      );
      // Should not schedule overdue reminders
      expect(scheduleReminder).not.toHaveBeenCalled();
    });

    it('skips non-active reminders', async () => {
      vi.mocked(loadReminders).mockResolvedValueOnce([
        {
          id: 'done',
          message: 'already triggered',
          type: 'one-shot',
          createdAt: new Date().toISOString(),
          cronExpression: '0 0 1 1 *',
          status: 'triggered',
        },
      ]);

      await service.recover();

      expect(scheduleReminder).not.toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('calls cancelAll', () => {
      service.shutdown();
      expect(cancelAll).toHaveBeenCalledOnce();
    });
  });
});
