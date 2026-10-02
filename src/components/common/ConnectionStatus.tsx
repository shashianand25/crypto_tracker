import React from 'react';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { cn } from '../../utils/cn';

interface ConnectionStatusProps {
  className?: string;
  showReconnectButton?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className,
  showReconnectButton = false,
}) => {
  const { status, reconnect } = useWebSocketContext();

  const getStatusConfig = () => {
    switch (status) {
      case 'CONNECTED':
        return {
          label: 'LIVE',
          dotClass: 'bg-emerald-600',
          textClass: 'text-emerald-800',
          bgClass: 'bg-emerald-50 border-emerald-300',
        };
      case 'RECONNECTED':
        return {
          label: 'RECONNECTED',
          dotClass: 'bg-emerald-600',
          textClass: 'text-emerald-800',
          bgClass: 'bg-emerald-50 border-emerald-300',
        };
      case 'CONNECTING':
        return {
          label: 'CONNECTING',
          dotClass: 'bg-amber-500 animate-pulse',
          textClass: 'text-amber-800',
          bgClass: 'bg-amber-50 border-amber-300',
        };
      case 'RECONNECTING':
        return {
          label: 'RECONNECTING',
          dotClass: 'bg-amber-500 animate-pulse',
          textClass: 'text-amber-800',
          bgClass: 'bg-amber-50 border-amber-300',
        };
      case 'DISCONNECTED':
      default:
        return {
          label: 'DISCONNECTED',
          dotClass: 'bg-rose-600',
          textClass: 'text-rose-800',
          bgClass: 'bg-rose-50 border-rose-300',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 border text-2xs font-mono font-medium rounded-sm select-none',
          config.bgClass,
          config.textClass
        )}
        title={`WebSocket status: ${status}`}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full inline-block', config.dotClass)} />
        <span>{config.label}</span>
      </div>

      {showReconnectButton && (status === 'DISCONNECTED' || status === 'RECONNECTING') && (
        <button
          onClick={reconnect}
          className="text-2xs font-mono underline text-slate-600 hover:text-slate-900 focus:outline-none"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};
