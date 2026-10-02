import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketContext';
import { AppShell } from './layouts/AppShell';
import { MarketOverviewPage } from './pages/MarketOverviewPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { ComparePage } from './pages/ComparePage';
import { ReplayPage } from './pages/ReplayPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { DataHealthPage } from './pages/DataHealthPage';

export const App: React.FC = () => {
  return (
    <WebSocketProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<MarketOverviewPage />} />
            <Route path="markets" element={<MarketOverviewPage />} />
            <Route path="assets/:symbol" element={<AssetDetailPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="replay" element={<ReplayPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="anomalies" element={<AnomaliesPage />} />
            <Route path="health" element={<DataHealthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WebSocketProvider>
  );
};

export default App;
