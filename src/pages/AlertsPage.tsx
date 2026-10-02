import React from 'react';
import { useAssets } from '../hooks/useAssets';
import { useAlerts } from '../hooks/useAlerts';
import { AlertForm } from '../components/alerts/AlertForm';
import { ActiveAlertsTable } from '../components/alerts/ActiveAlertsTable';
import { TriggeredAlertsTable } from '../components/alerts/TriggeredAlertsTable';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';

export const AlertsPage: React.FC = () => {
  const { assets } = useAssets();
  const {
    activeAlerts,
    triggeredAlerts,
    isLoadingActive,
    isLoadingTriggered,
    activeError,
    triggeredError,
    isSubmitting,
    submitError,
    submitSuccess,
    clearSubmitFeedback,
    createAlert,
    deleteAlert,
    refetchActive,
    refetchTriggered,
  } = useAlerts();

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="pb-1">
        <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight">
          ALERT RULES &amp; TRIGGERS
        </h2>
        <p className="text-xs text-slate-500 font-sans">
          Threshold monitoring with real-time WebSocket trigger delivery
        </p>
      </div>

      {/* Create Alert Form */}
      <AlertForm
        assets={assets}
        onSubmit={createAlert}
        isSubmitting={isSubmitting}
        submitError={submitError}
        submitSuccess={submitSuccess}
        onClearFeedback={clearSubmitFeedback}
      />

      {/* Active Alerts Section */}
      <div className="space-y-2">
        {isLoadingActive ? (
          <TableSkeleton rows={4} cols={6} />
        ) : activeError ? (
          <ErrorState
            title="Failed to Load Active Alerts"
            message={activeError}
            onRetry={refetchActive}
          />
        ) : (
          <ActiveAlertsTable alerts={activeAlerts} onDelete={deleteAlert} />
        )}
      </div>

      {/* Triggered Alerts History Section */}
      <div className="space-y-2 pt-2">
        {isLoadingTriggered ? (
          <TableSkeleton rows={5} cols={6} />
        ) : triggeredError ? (
          <ErrorState
            title="Failed to Load Triggered Alerts History"
            message={triggeredError}
            onRetry={refetchTriggered}
          />
        ) : (
          <TriggeredAlertsTable triggeredAlerts={triggeredAlerts} />
        )}
      </div>
    </div>
  );
};
