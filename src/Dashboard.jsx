import React, { useState, useEffect } from 'react';

import { TrendingUp, TrendingDown, AlertTriangle, Users, DollarSign, Clock, Shield, Zap, Database } from 'lucide-react';
const Dashboard = ({ stats, modelTrained, onTrainModel }) => {
  const [transactions, setTransactions] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);

  const riskColors = {
    Low: '#10b981',
    Medium: '#f59e0b',
    High: '#ef4444',
    Critical: '#dc2626'
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const StatCard = ({ icon: Icon, label, value, trend, color = '#3b82f6' }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: `${color}15`, color }}>
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <h3 className="stat-value">{value}</h3>
        {trend && (
          <div className="stat-trend">
            {trend.direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );

  const RiskDistributionBar = ({ distribution }) => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    
    return (
      <div className="risk-distribution">
        <h3 className="section-title">Risk Distribution</h3>
        <div className="risk-bar">
          {Object.entries(distribution).map(([level, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div
                key={level}
                className="risk-segment"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: riskColors[level]
                }}
                title={`${level}: ${count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="risk-legend">
          {Object.entries(distribution).map(([level, count]) => (
            <div key={level} className="risk-legend-item">
              <div 
                className="risk-legend-dot" 
                style={{ backgroundColor: riskColors[level] }}
              />
              <span>{level}</span>
              <span className="risk-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!stats) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <Shield size={64} className="empty-icon" />
          <h2>No Data Available</h2>
          <p>Upload transaction data to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div>
          <h2 className="page-title">System Overview</h2>
          <p className="page-subtitle">Real-time anomaly detection analytics</p>
        </div>
        {!modelTrained && (
          <button className="btn btn-primary" onClick={onTrainModel}>
            <Zap size={18} />
            Train Model
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon={Database}
          label="Total Transactions"
          value={stats.total_transactions.toLocaleString()}
          color="#3b82f6"
        />
        <StatCard
          icon={Users}
          label="Unique Users"
          value={stats.unique_users.toLocaleString()}
          color="#8b5cf6"
        />
        <StatCard
          icon={DollarSign}
          label="Average Amount"
          value={formatCurrency(stats.amount_stats.mean)}
          color="#10b981"
        />
        <StatCard
          icon={AlertTriangle}
          label="High Risk Alerts"
          value={stats.risk_summary.High + stats.risk_summary.Critical}
          color="#ef4444"
        />
      </div>

      {/* Risk Distribution */}
      <div className="dashboard-section">
        <RiskDistributionBar distribution={stats.risk_summary} />
      </div>

      {/* Additional Stats */}
      <div className="info-grid">
        <div className="info-card">
          <h4>Transaction Volume</h4>
          <div className="info-stat">
            {formatCurrency(stats.amount_stats.total)}
          </div>
          <p className="info-label">Total processed</p>
        </div>

        <div className="info-card">
          <h4>Date Range</h4>
          <div className="info-stat-small">
            {new Date(stats.date_range.start).toLocaleDateString()}
          </div>
          <div className="info-divider">to</div>
          <div className="info-stat-small">
            {new Date(stats.date_range.end).toLocaleDateString()}
          </div>
        </div>

        <div className="info-card">
          <h4>Model Status</h4>
          <div className={`status-badge ${modelTrained ? 'status-active' : 'status-inactive'}`}>
            <div className="status-dot"></div>
            {modelTrained ? 'Active' : 'Not Trained'}
          </div>
          <p className="info-label">Detection engine</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
