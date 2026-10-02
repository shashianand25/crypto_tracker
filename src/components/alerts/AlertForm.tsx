import React, { useState } from 'react';
import { CreateAlertPayload, AlertMetric, AlertCondition } from '../../types/alert';
import { AssetInfo } from '../../types/market';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AlertFormProps {
  assets: AssetInfo[];
  onSubmit: (payload: CreateAlertPayload) => Promise<boolean>;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  onClearFeedback: () => void;
  className?: string;
}

export const AlertForm: React.FC<AlertFormProps> = ({
  assets,
  onSubmit,
  isSubmitting,
  submitError,
  submitSuccess,
  onClearFeedback,
  className,
}) => {
  const [symbol, setSymbol] = useState(assets[0]?.symbol || 'BTCUSDT');
  const [metric, setMetric] = useState<AlertMetric>('price');
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [threshold, setThreshold] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync symbol default if assets load later
  React.useEffect(() => {
    if (!symbol && assets.length > 0) {
      setSymbol(assets[0].symbol);
    }
  }, [assets, symbol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearFeedback();

    const numThreshold = Number(threshold.replace(/,/g, '').trim());
    if (isNaN(numThreshold) || numThreshold <= 0) {
      setLocalError('Threshold must be a valid positive number');
      return;
    }

    if (!symbol) {
      setLocalError('Please select a tracked asset');
      return;
    }

    const success = await onSubmit({
      symbol,
      metric,
      condition,
      threshold: numThreshold,
    });

    if (success) {
      setThreshold('');
    }
  };

  return (
    <div className={cn('bg-white border border-slate-200 rounded-sm p-4 select-none', className)}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
        <Bell className="w-4 h-4 text-slate-700" />
        <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
          CREATE ALERT RULE
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Asset */}
          <div>
            <label className="block text-2xs font-mono font-semibold uppercase text-slate-500 mb-1">
              Asset
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full h-8 px-2 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 rounded-sm focus:border-slate-900 outline-none"
            >
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} {a.name ? `(${a.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Metric */}
          <div>
            <label className="block text-2xs font-mono font-semibold uppercase text-slate-500 mb-1">
              Metric
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as AlertMetric)}
              className="w-full h-8 px-2 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 rounded-sm focus:border-slate-900 outline-none"
            >
              <option value="price">Price (USD)</option>
              <option value="volume">Volume</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-2xs font-mono font-semibold uppercase text-slate-500 mb-1">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AlertCondition)}
              className="w-full h-8 px-2 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 rounded-sm focus:border-slate-900 outline-none"
            >
              <option value="above">Above (&gt;=)</option>
              <option value="below">Below (&lt;=)</option>
            </select>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-2xs font-mono font-semibold uppercase text-slate-500 mb-1">
              Threshold
            </label>
            <input
              type="text"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={metric === 'price' ? 'e.g. 70000' : 'e.g. 1500'}
              className="w-full h-8 px-2 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 rounded-sm focus:border-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Feedback Messages */}
        {localError && (
          <div className="flex items-center gap-1.5 text-rose-700 text-2xs font-mono">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{localError}</span>
          </div>
        )}
        {submitError && (
          <div className="flex items-center gap-1.5 text-rose-700 text-2xs font-mono">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{submitError}</span>
          </div>
        )}
        {submitSuccess && (
          <div className="flex items-center gap-1.5 text-emerald-700 text-2xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{submitSuccess}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-mono font-semibold rounded-sm transition-colors shadow-2xs"
          >
            {isSubmitting ? 'Arming Alert...' : 'Arm Alert'}
          </button>
        </div>
      </form>
    </div>
  );
};
