import { useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/client';
import type { Reminder } from '../api/client';
import { wsClient } from '../api/websocket';
import { toast } from '../components/Toast';
import { DatePicker, TimePicker, Select, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import type { Dayjs } from 'dayjs';

dayjs.locale('zh-cn');

type ReminderMode = 'one-shot' | 'recurring';
type RecurringType = 'daily' | 'weekly' | 'monthly' | 'custom';

const WEEKDAYS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
];

const ANTD_THEME = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#f59e0b',
    borderRadius: 4,
  },
};

function buildCronExpression(
  recurringType: RecurringType,
  time: Dayjs,
  weekdays: number[],
  monthDay: number,
  customCron: string,
): string {
  if (recurringType === 'custom') return customCron;

  const minute = time.minute();
  const hour = time.hour();

  switch (recurringType) {
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekly':
      return `${minute} ${hour} * * ${weekdays.sort().join(',')}`;
    case 'monthly':
      return `${minute} ${hour} ${monthDay} * *`;
    default:
      return '';
  }
}

function describeCron(reminder: Reminder): string {
  if (reminder.triggerAt) {
    return new Date(reminder.triggerAt).toLocaleString('zh-CN');
  }
  const expr = reminder.schedule || reminder.cronExpression;
  const parts = expr.split(' ');
  if (parts.length !== 5) return expr;

  const [min, hour, dom, , dow] = parts;
  const timeStr = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;

  if (dom === '*' && dow === '*') return `每天 ${timeStr}`;
  if (dom === '*' && dow !== '*') {
    const days = dow.split(',').map((d) => {
      const found = WEEKDAYS.find((w) => String(w.value) === d);
      return found ? `周${found.label}` : d;
    });
    return `每周${days.join('、')} ${timeStr}`;
  }
  if (dom !== '*' && dow === '*') return `每月 ${dom} 日 ${timeStr}`;
  return expr;
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ReminderMode>('one-shot');
  const [triggerAt, setTriggerAt] = useState<Dayjs | null>(dayjs().add(30, 'minute'));
  const [creating, setCreating] = useState(false);

  // Recurring state
  const [recurringType, setRecurringType] = useState<RecurringType>('daily');
  const [recurringTime, setRecurringTime] = useState<Dayjs>(dayjs().hour(9).minute(0));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [monthDay, setMonthDay] = useState(1);
  const [customCron, setCustomCron] = useState('');

  const fetchReminders = async () => {
    try {
      const data = await apiClient.getReminders();
      setReminders(data);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    const unsub = wsClient.on('reminder_triggered', () => {
      toast.success('提醒已触发');
      fetchReminders();
    });
    return unsub;
  }, []);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreate = async () => {
    if (!message.trim()) {
      toast.error('请输入提醒内容');
      return;
    }

    setCreating(true);
    try {
      if (mode === 'one-shot') {
        if (!triggerAt) {
          toast.error('请选择提醒时间');
          setCreating(false);
          return;
        }
        await apiClient.createReminder({
          message: message.trim(),
          triggerAt: triggerAt.toISOString(),
        });
      } else {
        if (recurringType === 'weekly' && weekdays.length === 0) {
          toast.error('请至少选择一天');
          setCreating(false);
          return;
        }
        const cron = buildCronExpression(recurringType, recurringTime, weekdays, monthDay, customCron);
        if (!cron.trim()) {
          toast.error('请输入 Cron 表达式');
          setCreating(false);
          return;
        }
        await apiClient.createReminder({ message: message.trim(), schedule: cron });
      }

      toast.success('提醒已创建');
      setMessage('');
      setTriggerAt(dayjs().add(30, 'minute'));
      setCustomCron('');
      await fetchReminders();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteReminder(id);
      toast.success('提醒已删除');
      await fetchReminders();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  };

  const btnClass = (active: boolean) =>
    `px-3 py-1 rounded font-mono text-sm border transition-colors ${
      active
        ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
        : 'text-slate-400 border-slate-600 hover:border-amber-500/30'
    }`;

  return (
    <ConfigProvider theme={ANTD_THEME} locale={zhCN}>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2
            className="text-2xl font-black text-amber-500 tracking-tight"
            style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
          >
            提醒管理
          </h2>
          <p className="text-sm text-slate-400 font-mono mt-1">
            持久化提醒 — 即使退出 Claude Code 也不会丢失
          </p>
        </div>

        {/* Create Form */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-200 mb-4">创建提醒</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 font-mono mb-1">提醒内容</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="例如：检查部署状态"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 font-mono placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-4 items-center">
              <label className="block text-sm text-slate-400 font-mono">类型</label>
              <div className="flex gap-2">
                <button onClick={() => setMode('one-shot')} className={btnClass(mode === 'one-shot')}>
                  一次性
                </button>
                <button onClick={() => setMode('recurring')} className={btnClass(mode === 'recurring')}>
                  重复
                </button>
              </div>
            </div>

            {/* One-shot: DatePicker */}
            {mode === 'one-shot' && (
              <div>
                <label className="block text-sm text-slate-400 font-mono mb-1">提醒时间</label>
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  value={triggerAt}
                  onChange={(val) => setTriggerAt(val)}
                  placeholder="选择日期和时间"
                  size="large"
                  style={{ width: 280 }}
                  disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
                />
              </div>
            )}

            {/* Recurring controls */}
            {mode === 'recurring' && (
              <div className="space-y-4">
                {/* Recurring Type */}
                <div className="flex gap-4 items-center">
                  <label className="block text-sm text-slate-400 font-mono">频率</label>
                  <div className="flex gap-2">
                    {([
                      ['daily', '每日'],
                      ['weekly', '每周'],
                      ['monthly', '每月'],
                      ['custom', '自定义'],
                    ] as const).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => setRecurringType(type)}
                        className={btnClass(recurringType === type)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time picker (daily/weekly/monthly) */}
                {recurringType !== 'custom' && (
                  <div>
                    <label className="block text-sm text-slate-400 font-mono mb-1">时间</label>
                    <TimePicker
                      format="HH:mm"
                      value={recurringTime}
                      onChange={(val) => { if (val) setRecurringTime(val); }}
                      size="large"
                      style={{ width: 140 }}
                    />
                  </div>
                )}

                {/* Weekly: weekday multi-select */}
                {recurringType === 'weekly' && (
                  <div>
                    <label className="block text-sm text-slate-400 font-mono mb-2">星期</label>
                    <div className="flex gap-2">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          onClick={() => toggleWeekday(day.value)}
                          className={`w-10 h-10 rounded font-mono text-sm border transition-colors ${
                            weekdays.includes(day.value)
                              ? 'text-amber-500 bg-amber-500/15 border-amber-500/40 font-bold'
                              : 'text-slate-400 border-slate-600 hover:border-amber-500/30'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly: day select */}
                {recurringType === 'monthly' && (
                  <div>
                    <label className="block text-sm text-slate-400 font-mono mb-1">每月几号</label>
                    <Select
                      value={monthDay}
                      onChange={(val) => setMonthDay(val)}
                      size="large"
                      style={{ width: 120 }}
                      options={Array.from({ length: 31 }, (_, i) => ({
                        value: i + 1,
                        label: `${i + 1} 日`,
                      }))}
                    />
                  </div>
                )}

                {/* Custom cron */}
                {recurringType === 'custom' && (
                  <div>
                    <label className="block text-sm text-slate-400 font-mono mb-1">
                      Cron 表达式
                      <span className="text-slate-500 ml-2">例如: 0 9 * * 1-5 (工作日9点)</span>
                    </label>
                    <input
                      type="text"
                      value={customCron}
                      onChange={(e) => setCustomCron(e.target.value)}
                      placeholder="0 9 * * *"
                      className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 font-mono placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Preview */}
                {recurringType !== 'custom' && (
                  <div className="text-xs text-slate-500 font-mono">
                    预览: {buildCronExpression(recurringType, recurringTime, weekdays, monthDay, '')}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2 bg-amber-500 text-slate-900 font-bold font-mono rounded hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {creating ? '创建中...' : '创建提醒'}
            </button>
          </div>
        </div>

        {/* Reminder List */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-slate-200 mb-4">
            活跃提醒
            <span className="ml-2 text-sm font-normal text-slate-400">({reminders.length})</span>
          </h3>

          {loading ? (
            <div className="text-slate-500 font-mono text-sm">加载中...</div>
          ) : reminders.length === 0 ? (
            <div className="text-slate-500 font-mono text-sm py-8 text-center">
              暂无提醒 — 通过上方表单或在 Claude Code 中说「提醒我...」创建
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-100 font-mono truncate">{r.message}</div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          r.type === 'one-shot'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-green-500/10 text-green-400'
                        }`}
                      >
                        {r.type === 'one-shot' ? '一次性' : '重复'}
                      </span>
                      <span>{describeCron(r)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="ml-4 px-3 py-1 text-sm font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded transition-colors"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </ConfigProvider>
  );
}
