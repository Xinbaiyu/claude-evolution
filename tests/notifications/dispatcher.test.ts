import { describe, it, expect, vi } from 'vitest';
import { NotificationDispatcher } from '../../src/notifications/dispatcher.js';
import type { Notification, NotificationChannel } from '../../src/notifications/channel.js';

vi.mock('../../src/utils/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function createMockChannel(name: string, shouldFail = false): NotificationChannel {
  return {
    name,
    send: shouldFail
      ? vi.fn().mockRejectedValue(new Error(`${name} failed`))
      : vi.fn().mockResolvedValue(undefined),
  };
}

const testNotification: Notification = {
  title: '测试',
  body: '测试内容',
  type: 'reminder',
};

describe('NotificationDispatcher', () => {
  it('dispatches to all channels', async () => {
    const dispatcher = new NotificationDispatcher();
    const ch1 = createMockChannel('ch1');
    const ch2 = createMockChannel('ch2');
    dispatcher.addChannel(ch1);
    dispatcher.addChannel(ch2);

    await dispatcher.dispatch(testNotification);

    expect(ch1.send).toHaveBeenCalledWith(testNotification);
    expect(ch2.send).toHaveBeenCalledWith(testNotification);
  });

  it('continues when one channel fails', async () => {
    const dispatcher = new NotificationDispatcher();
    const failing = createMockChannel('failing', true);
    const working = createMockChannel('working');
    dispatcher.addChannel(failing);
    dispatcher.addChannel(working);

    await dispatcher.dispatch(testNotification);

    expect(failing.send).toHaveBeenCalledOnce();
    expect(working.send).toHaveBeenCalledOnce();
    // Should not throw
  });

  it('handles zero channels gracefully', async () => {
    const dispatcher = new NotificationDispatcher();
    await expect(dispatcher.dispatch(testNotification)).resolves.toBeUndefined();
  });

  it('handles all channels failing', async () => {
    const dispatcher = new NotificationDispatcher();
    dispatcher.addChannel(createMockChannel('f1', true));
    dispatcher.addChannel(createMockChannel('f2', true));

    await expect(dispatcher.dispatch(testNotification)).resolves.toBeUndefined();
  });
});
