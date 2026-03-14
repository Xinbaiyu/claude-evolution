interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative w-12 h-6 rounded-full transition-colors
        ${checked ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' : 'bg-slate-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
          shadow-md
          ${checked ? 'transform translate-x-6' : ''}
        `}
      />
    </button>
  );
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}

export function Select({ value, onChange, options, disabled }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        px-4 py-2.5 pr-10 rounded-lg font-mono text-sm font-medium
        bg-slate-800 border-2 border-slate-600 text-slate-100
        hover:border-slate-500 focus:border-cyan-500 focus:outline-none
        transition-colors appearance-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23cbd5e1' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundPosition: 'right 0.5rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.5em 1.5em',
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, disabled }: CheckboxProps) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={`
          w-5 h-5 rounded border-2 transition-all
          ${checked
            ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 border-cyan-500'
            : 'bg-slate-800 border-slate-600'
          }
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        {checked && (
          <svg
            className="w-full h-full text-white p-0.5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M6 10l2 2 6-6" />
          </svg>
        )}
      </div>
    </label>
  );
}
