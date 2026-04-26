import React, { useState, useEffect } from 'react';

import { TrendingUp, TrendingDown, AlertTriangle, Users, DollarSign, Clock, Shield, Zap, Database } from 'lucide-react';
const Analytics = ({ stats, apiBaseUrl }) => {
  const [transactions, setTransactions] = useState([]);
  const [timeDistribution, setTimeDistribution] = useState([]);
  const [userAnalytics, setUserAnalytics] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/transactions?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
        processAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const processAnalytics = (data) => {
    // Time distribution
    const hourCounts = new Array(24).fill(0);
    const riskByHour = new Array(24).fill(0);
    
    data.forEach(tx => {
      const hour = new Date(tx.timestamp).getHours();
      hourCounts[hour]++;
      riskByHour[hour] += tx.risk_score;
    });

    const timeData = hourCounts.map((count, hour) => ({
      hour,
      count,
      avgRisk: count > 0 ? riskByHour[hour] / count : 0
    }));
    setTimeDistribution(timeData);

    // User analytics
    const userMap = new Map();
    data.forEach(tx => {
      if (!tx.user_id) return;
      
      if (!userMap.has(tx.user_id)) {
        userMap.set(tx.user_id, {
          userId: tx.user_id,
          txCount: 0,
          totalAmount: 0,
          avgRisk: 0,
          highRiskCount: 0
        });
      }
      
      const user = userMap.get(tx.user_id);
      user.txCount++;
      user.totalAmount += tx.amount;
      user.avgRisk += tx.risk_score;
      if (tx.risk_level === 'High' || tx.risk_level === 'Critical') {
        user.highRiskCount++;
      }
    });

    const users = Array.from(userMap.values())
      .map(u => ({ ...u, avgRisk: u.avgRisk / u.txCount }))
      .sort((a, b) => b.avgRisk - a.avgRisk)
      .slice(0, 10);
    
    setUserAnalytics(users);
  };

  const HourlyChart = () => {
    const maxCount = Math.max(...timeDistribution.map(d => d.count));
    const maxRisk = 100;

    return (
      <div className="chart-container">
        <h3 className="chart-title">
          <Clock size={20} />
          Hourly Transaction Pattern
        </h3>
        <div className="bar-chart">
          {timeDistribution.map(({ hour, count, avgRisk }) => {
            const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const riskColor = avgRisk < 30 ? '#10b981' : avgRisk < 60 ? '#f59e0b' : '#ef4444';

            return (
              <div key={hour} className="bar-item">
                <div className="bar-column">
                  <div
                    className="bar"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: riskColor
                    }}
                    title={`${hour}:00 - ${count} transactions (Avg risk: ${avgRisk.toFixed(1)})`}
                  />
                </div>
                <div className="bar-label">{hour}</div>
              </div>
            );
          })}
        </div>
        <div className="chart-legend">
          <span>Hour of Day</span>
        </div>
      </div>
    );
  };

  const RiskTrendChart = () => {
    const riskLevels = ['Low', 'Medium', 'High', 'Critical'];
    const colors = {
      Low: '#10b981',
      Medium: '#f59e0b',
      High: '#ef4444',
      Critical: '#dc2626'
    };

    const distribution = riskLevels.map(level => ({
      level,
      count: transactions.filter(tx => tx.risk_level === level).length
    }));

    const total = distribution.reduce((sum, d) => sum + d.count, 0);
    const maxCount = Math.max(...distribution.map(d => d.count));

    return (
      <div className="chart-container">
        <h3 className="chart-title">
          <TrendingUp size={20} />
          Risk Level Distribution
        </h3>
        <div className="horizontal-bar-chart">
          {distribution.map(({ level, count }) => {
            const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

            return (
              <div key={level} className="h-bar-item">
                <div className="h-bar-label">{level}</div>
                <div className="h-bar-track">
                  <div
                    className="h-bar"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: colors[level]
                    }}
                  />
                </div>
                <div className="h-bar-value">
                  {count} ({percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const UserRiskTable = () => {
    return (
      <div className="chart-container">
        <h3 className="chart-title">
          <Users size={20} />
          Top Risk Users
        </h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Transactions</th>
              <th>Total Amount</th>
              <th>Avg Risk</th>
              <th>High Risk</th>
            </tr>
          </thead>
          <tbody>
            {userAnalytics.map(user => (
              <tr key={user.userId}>
                <td><code>{user.userId}</code></td>
                <td>{user.txCount}</td>
                <td>${user.totalAmount.toLocaleString()}</td>
                <td>
                  <span
                    className="risk-pill"
                    style={{
                      backgroundColor: user.avgRisk < 30 ? '#10b98115' : user.avgRisk < 60 ? '#f59e0b15' : '#ef444415',
                      color: user.avgRisk < 30 ? '#10b981' : user.avgRisk < 60 ? '#f59e0b' : '#ef4444'
                    }}
                  >
                    {user.avgRisk.toFixed(1)}
                  </span>
                </td>
                <td>
                  <span className="count-badge">{user.highRiskCount}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!stats || transactions.length === 0) {
    return (
      <div className="empty-state">
        <BarChart3 size={64} className="empty-icon" />
        <h2>No Analytics Available</h2>
        <p>Analyze transactions to view detailed analytics</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="section-header">
        <h2 className="page-title">Analytics</h2>
        <p className="page-subtitle">Deep insights into transaction patterns</p>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="summary-label">Anomaly Rate</p>
            <h3 className="summary-value">
              {stats.total_transactions > 0
                ? ((stats.risk_summary.High + stats.risk_summary.Critical) / stats.total_transactions * 100).toFixed(2)
                : 0}%
            </h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#10b98115', color: '#10b981' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="summary-label">Avg Amount</p>
            <h3 className="summary-value">
              ${stats.amount_stats.mean.toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}>
            <Users size={24} />
          </div>
          <div>
            <p className="summary-label">Active Users</p>
            <h3 className="summary-value">
              {stats.unique_users}
            </h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <HourlyChart />
        <RiskTrendChart />
      </div>

      <div className="full-width-chart">
        <UserRiskTable />
      </div>
    </div>
  );
};

export default Analytics;
