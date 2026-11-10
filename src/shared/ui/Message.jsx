import { CircleAlert, Info, LoaderCircle } from 'lucide-react';

export function Message({ tone = 'info', children }) {
  const icon = tone === 'danger'
    ? <CircleAlert size={18} aria-hidden="true" />
    : tone === 'loading'
      ? <LoaderCircle className="spin" size={18} aria-hidden="true" />
      : <Info size={18} aria-hidden="true" />;

  return (
    <div className={`message message--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {icon}
      <p>{children}</p>
    </div>
  );
}
