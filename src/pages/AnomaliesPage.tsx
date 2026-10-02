import React, { useState } from 'react';
import { useAssets } from '../hooks/useAssets';
import { useAnomalies } from '../hooks/useAnomalies';
import { AnomalyEvent } from '../types/anomaly';
import { AnomalyTable } from '../components/anomalies/AnomalyTable';
import { AnomalyInspector } from '../components/anomalies/AnomalyInspector';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { Filter, RotateCcw } from 'lucide-react';

export const AnomaliesPage: React.FC = () => {
  const { assets } = useAssets();
  const {
    anomalies,
    isLoading,
    error,
    filterSymbol,
    setFilterSymbol,
    fromTime,
    setFromTime,
    toTime,
    setToTime,
    refetch,
  } = useAnomalies();

  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);

  const handleResetFilters = () => {
    setFilterSymbol('');
    setFromTime('');
    setToTime('');
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="pb-1">
        <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight">
          ANOMALY DETECTION &amp; INVESTIGATION
        </h2>
        <p className="text-xs text-slate-500 font-sans">
          Investigation console for statistically anomalous price and volume signatures
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-sm p-3.5 select-none">
        <div className="flex flex-wrap items-end gap-3 text-xs font-mono">
          {/* Asset Filter */}
          <div>
            <label className="block text-2xs font-semibold uppercase text-slate-500 mb-1">
              FILTER ASSET
            </label>
            <select
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-sm font-semibold text-slate-900 outline-none"
            >
              <option value="">ALL ASSETS</option>
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* From Time */}
          <div>
            <label className="block text-2xs font-semibold uppercase text-slate-500 mb-1">
              FROM (UTC / ISO)
            </label>
            <input
              type="datetime-local"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              className="h-8 px-2 bg-slate-50 border border-slate-300 rounded-sm text-slate-800 outline-none text-xs font-mono"
            />
          </div>

          {/* To Time */}
          <div>
            <label className="block text-2xs font-semibold uppercase text-slate-500 mb-1">
              TO (UTC / ISO)
            </label>
            <input
              type="datetime-local"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="h-8 px-2 bg-slate-50 border border-slate-300 rounded-sm text-slate-800 outline-none text-xs font-mono"
            />
          </div>

          {/* Filter / Reset Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="h-8 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-sm font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>APPLY FILTER</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm transition-colors"
              title="Reset filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Anomaly Context Inspector */}
      {selectedAnomaly && (
        <AnomalyInspector
          anomaly={selectedAnomaly}
          onClose={() => setSelectedAnomaly(null)}
        />
      )}

      {/* Anomalies Table */}
      <div className="space-y-2">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <ErrorState
            title="Failed to Load Anomaly Records"
            message={error}
            onRetry={refetch}
          />
        ) : (
          <AnomalyTable
            anomalies={anomalies}
            selectedAnomaly={selectedAnomaly}
            onSelectAnomaly={(a) => setSelectedAnomaly(a)}
          />
        )}
      </div>
    </div>
  );
};
