import React from 'react';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { formatTimestamp, formatPrice, formatVolume } from '../../utils/formatters';
import { Bell, Activity, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export const NotificationCenter: React.FC = () => {
  const { notifications, dismissNotification } = useWebSocketContext();

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none"
      role="region"
      aria-label="Live market notifications"
    >
      {notifications.map((notif) => {
        const isAlert = notif.type === 'alert';
        return (
          <div
            key={notif.id}
            className={cn(
              'pointer-events-auto p-3 bg-white border shadow-md rounded-sm transition-all transform duration-200 animate-in fade-in slide-in-from-bottom-2',
              isAlert
                ? 'border-amber-300 border-l-4 border-l-amber-500'
                : 'border-rose-300 border-l-4 border-l-rose-500'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {isAlert ? (
                  <Bell className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                )}
                <span className="font-mono text-2xs font-bold uppercase tracking-wider text-slate-800">
                  {isAlert ? 'ALERT TRIGGERED' : 'UNUSUAL ACTIVITY'}
                </span>
                <span className="font-mono text-2xs px-1 py-0.2 bg-slate-100 text-slate-700 font-semibold rounded-2xs">
                  {notif.symbol}
                </span>
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="text-slate-400 hover:text-slate-700 p-0.5 focus:outline-none"
                aria-label="Dismiss notification"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-1 text-xs text-slate-800 font-sans">
              {notif.title}
              {notif.message && notif.message !== notif.title && (
                <div className="text-2xs text-slate-600 mt-0.5">{notif.message}</div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between font-mono text-2xs text-slate-500 border-t border-slate-100 pt-1.5">
              <div className="flex items-center gap-2">
                {notif.price && <span>Price: {formatPrice(notif.price)}</span>}
                {notif.volume && <span>Vol: {formatVolume(notif.volume)}</span>}
              </div>
              <span>{formatTimestamp(notif.ts, 'timeOnlyUtc')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
