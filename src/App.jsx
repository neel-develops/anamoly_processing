import React, { useState, useEffect } from 'react';
import { Upload, Activity, AlertTriangle, TrendingUp, BarChart3, Shield, Database, FileText, Link } from 'lucide-react';
import "./App.css";
import UploadSection from "./UploadSection";

import Dashboard from './Dashboard';
import TransactionList from './TransactionList';
import Analytics from './Analytics';
import LiveDataConnector from './LiveDataConnector';

const API_BASE_URL = 'https://anamolyprocessing-production.up.railway.app';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [modelTrained, setModelTrained] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch statistics on mount and periodically
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/statistics`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleUploadSuccess = async (metadata) => {
    showNotification('Upload successful! Training model...', 'success');
    await trainModel();
    await fetchStats();
  };

  const trainModel = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_ensemble: false, contamination: 0.1 })
      });

      if (response.ok) {
        const data = await response.json();
        setModelTrained(true);
        showNotification(`Model trained on ${data.training_samples} transactions`, 'success');
      } else {
        throw new Error('Training failed');
      }
    } catch (error) {
      showNotification('Training failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'upload', label: 'Upload Data', icon: Upload },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'live', label: 'Live Data', icon: Link }
  ];

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <Shield className="logo-icon" />
            <div>
              <h1 className="logo-text">Anomaly Detector</h1>
              <p className="logo-subtitle">Real-time Transaction Intelligence</p>
            </div>
          </div>
          
          <div className="header-status">
            {modelTrained && (
              <div className="status-badge status-active">
                <div className="status-dot"></div>
                Model Active
              </div>
            )}
            {stats && (
              <div className="header-stat">
                <Database size={18} />
                <span>{stats.total_transactions.toLocaleString()} transactions</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-content">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {notification && (
          <div className={`notification notification-${notification.type}`}>
            {notification.message}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            stats={stats} 
            modelTrained={modelTrained}
            onTrainModel={trainModel}
          />
        )}

        {activeTab === 'upload' && (
          <UploadSection 
            onUploadSuccess={handleUploadSuccess}
            apiBaseUrl={API_BASE_URL}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionList 
            apiBaseUrl={API_BASE_URL}
            modelTrained={modelTrained}
          />
        )}

        {activeTab === 'analytics' && (
          <Analytics 
            stats={stats}
            apiBaseUrl={API_BASE_URL}
          />
        )}

        {activeTab === 'live' && (
          <LiveDataConnector 
            apiBaseUrl={API_BASE_URL}
            onSuccess={handleUploadSuccess}
          />
        )}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
}

export default App;
