import { describe, it, expect, beforeEach } from 'vitest';
import {
  SharedStateManager,
  DaemonEventBus,
  createDefaultDaemonState,
} from './shared-state.js';

describe('SharedStateManager', () => {
  let manager: SharedStateManager;

  beforeEach(() => {
    manager = new SharedStateManager();
  });

  describe('getState', () => {
    it('should return default state on init', () => {
      const state = manager.getState();

      expect(state.scheduler.isRunning).toBe(false);
      expect(state.scheduler.lastExecution).toBeNull();
      expect(state.scheduler.nextExecution).toBeNull();
      expect(state.scheduler.totalExecutions).toBe(0);

      expect(state.webServer.isRunning).toBe(false);
      expect(state.webServer.port).toBe(0);
      expect(state.webServer.activeConnections).toBe(0);

      expect(state.suggestions.pending).toBe(0);
      expect(state.suggestions.approved).toBe(0);
      expect(state.suggestions.rejected).toBe(0);
    });

    it('should return readonly state', () => {
      const state = manager.getState();
      expect(Object.isFrozen(state)).toBe(false); // Not frozen, but typed as Readonly
    });
  });

  describe('scheduler state updates', () => {
    it('should update scheduler state', () => {
      const nextExec = new Date('2026-03-14T12:00:00Z');

      manager.updateScheduler({
        isRunning: true,
        nextExecution: nextExec,
      });

      const state = manager.getState();
      expect(state.scheduler.isRunning).toBe(true);
      expect(state.scheduler.nextExecution).toEqual(nextExec);
    });

    it('should record scheduler execution', () => {
      manager.recordSchedulerExecution(1500);

      const state = manager.getState();
      expect(state.scheduler.totalExecutions).toBe(1);
      expect(state.scheduler.lastExecution).toBeInstanceOf(Date);
    });

    it('should increment total executions on multiple runs', () => {
      manager.recordSchedulerExecution(100);
      manager.recordSchedulerExecution(200);
      manager.recordSchedulerExecution(300);

      const state = manager.getState();
      expect(state.scheduler.totalExecutions).toBe(3);
    });

    it('should start scheduler with next execution time', () => {
      const nextExec = new Date('2026-03-14T18:00:00Z');

      manager.startScheduler(nextExec);

      const state = manager.getState();
      expect(state.scheduler.isRunning).toBe(true);
      expect(state.scheduler.nextExecution).toEqual(nextExec);
    });

    it('should stop scheduler and clear next execution', () => {
      const nextExec = new Date('2026-03-14T18:00:00Z');
      manager.startScheduler(nextExec);

      manager.stopScheduler();

      const state = manager.getState();
      expect(state.scheduler.isRunning).toBe(false);
      expect(state.scheduler.nextExecution).toBeNull();
    });
  });

  describe('web server state updates', () => {
    it('should update web server state', () => {
      manager.updateWebServer({
        isRunning: true,
        port: 10010,
        activeConnections: 5,
      });

      const state = manager.getState();
      expect(state.webServer.isRunning).toBe(true);
      expect(state.webServer.port).toBe(10010);
      expect(state.webServer.activeConnections).toBe(5);
    });

    it('should start web server', () => {
      manager.startWebServer(3000);

      const state = manager.getState();
      expect(state.webServer.isRunning).toBe(true);
      expect(state.webServer.port).toBe(3000);
    });

    it('should stop web server and reset port', () => {
      manager.startWebServer(3000);

      manager.stopWebServer();

      const state = manager.getState();
      expect(state.webServer.isRunning).toBe(false);
      expect(state.webServer.port).toBe(0);
    });
  });

  describe('suggestions state updates', () => {
    it('should update suggestions stats', () => {
      manager.updateSuggestions({
        pending: 10,
        approved: 5,
        rejected: 2,
      });

      const state = manager.getState();
      expect(state.suggestions.pending).toBe(10);
      expect(state.suggestions.approved).toBe(5);
      expect(state.suggestions.rejected).toBe(2);
    });
  });

  describe('event bus', () => {
    it('should emit scheduler:executed event', () => {
      return new Promise<void>((resolve) => {
        const eventBus = manager.getEventBus();

        eventBus.once('scheduler:executed', (data) => {
          expect(data.timestamp).toBeInstanceOf(Date);
          expect(data.duration).toBe(1500);
          resolve();
        });

        manager.recordSchedulerExecution(1500);
      });
    });

    it('should emit scheduler:started event', () => {
      return new Promise<void>((resolve) => {
        const eventBus = manager.getEventBus();

        eventBus.once('scheduler:started', () => {
          resolve();
        });

        manager.startScheduler(new Date());
      });
    });

    it('should emit scheduler:stopped event', () => {
      return new Promise<void>((resolve) => {
        const eventBus = manager.getEventBus();

        eventBus.once('scheduler:stopped', () => {
          resolve();
        });

        manager.stopScheduler();
      });
    });

    it('should emit webserver:started event with port', () => {
      return new Promise<void>((resolve) => {
        const eventBus = manager.getEventBus();

        eventBus.once('webserver:started', (data) => {
          expect(data.port).toBe(10010);
          resolve();
        });

        manager.startWebServer(10010);
      });
    });

    it('should emit webserver:stopped event', () => {
      return new Promise<void>((resolve) => {
        const eventBus = manager.getEventBus();

        eventBus.once('webserver:stopped', () => {
          resolve();
        });

        manager.stopWebServer();
      });
    });

    it('should emit suggestions:updated event with stats', () => {
      return new Promise<void>((resolve) => {
        const eventBus = manager.getEventBus();

        eventBus.once('suggestions:updated', (stats) => {
          expect(stats.pending).toBe(15);
          expect(stats.approved).toBe(10);
          expect(stats.rejected).toBe(5);
          resolve();
        });

        manager.updateSuggestions({
          pending: 15,
          approved: 10,
          rejected: 5,
        });
      });
    });

    it('should support multiple event listeners', () => {
      const eventBus = manager.getEventBus();
      const calls: number[] = [];

      eventBus.on('scheduler:started', () => calls.push(1));
      eventBus.on('scheduler:started', () => calls.push(2));

      manager.startScheduler(new Date());

      expect(calls).toEqual([1, 2]);
    });

    it('should support removing event listeners', () => {
      const eventBus = manager.getEventBus();
      const calls: number[] = [];

      const listener = () => calls.push(1);
      eventBus.on('scheduler:started', listener);
      eventBus.off('scheduler:started', listener);

      manager.startScheduler(new Date());

      expect(calls).toEqual([]);
    });
  });
});

describe('DaemonEventBus', () => {
  it('should be a type-safe event emitter', () => {
    const eventBus = new DaemonEventBus();

    // Type checking happens at compile time
    eventBus.on('scheduler:executed', (data) => {
      expect(data.timestamp).toBeInstanceOf(Date);
      expect(typeof data.duration).toBe('number');
    });

    eventBus.emit('scheduler:executed', {
      timestamp: new Date(),
      duration: 1000,
    });
  });
});

describe('createDefaultDaemonState', () => {
  it('should create default state structure', () => {
    const state = createDefaultDaemonState();

    expect(state).toEqual({
      scheduler: {
        isRunning: false,
        lastExecution: null,
        nextExecution: null,
        totalExecutions: 0,
      },
      webServer: {
        isRunning: false,
        port: 0,
        activeConnections: 0,
      },
      suggestions: {
        pending: 0,
        approved: 0,
        rejected: 0,
      },
    });
  });
});
