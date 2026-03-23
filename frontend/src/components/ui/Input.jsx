import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
    <input
      ref={ref}
      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0
        ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500/20'}
        disabled:bg-slate-50 disabled:text-slate-500`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;
