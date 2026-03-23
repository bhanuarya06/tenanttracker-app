import { forwardRef } from 'react';

const Select = forwardRef(({ label, error, options = [], placeholder, className = '', children, ...props }, ref) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
    <select
      ref={ref}
      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 appearance-none
        bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%3E%3Cpath%20stroke%3D%22%2394a3b8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
        bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-10
        ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500/20'}
        disabled:bg-slate-50 disabled:text-slate-500`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children || options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
  </div>
));

Select.displayName = 'Select';
export default Select;
