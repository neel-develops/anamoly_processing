import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Users, DollarSign, Clock, Shield, Zap, Database } from 'lucide-react';

const TransactionList = ({ apiBaseUrl, modelTrained }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    riskLevel: '',
    searchTerm: '',
    limit: 100
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [explanation, setExplanation] = useState(null);

  useEffect(() => {
    if (modelTrained) {
      fetchTransactions();
    }
  }, [modelTrained, filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: filters.limit.toString()
      });
      
      if (filters.riskLevel) {
        params.append('risk_level', filters.riskLevel);
      }

      const response = await fetch(`${apiBaseUrl}/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async (transactionId) => {
    try {
      const response = await fetch(`${apiBaseUrl}/transactions/${transactionId}/explain`);
      if (response.ok) {
        const data = await response.json();
        setExplanation(data);
      }
    } catch (error) {
      console.error('Failed to fetch explanation:', error);
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    fetchExplanation(transaction.transaction_id);
  };

  const closeModal = () => {
    setSelectedTransaction(null);
    setExplanation(null);
  };

  const getRiskColor = (level) => {
    const colors = {
      Low: '#10b981',
      Medium: '#f59e0b',
      High: '#ef4444',
      Critical: '#dc2626'
    };
    return colors[level] || '#6b7280';
  };

  const getRiskIcon = (level) => {
    if (level === 'Low') return <CheckCircle size={16} />;
    if (level === 'Critical' || level === 'High') return <AlertTriangle size={16} />;
    return <Info size={16} />;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      return (
        tx.transaction_id.toLowerCase().includes(search) ||
        tx.user_id?.toLowerCase().includes(search) ||
        tx.amount.toString().includes(search)
      );
    }
    return true;
  });

  if (!modelTrained) {
    return (
      <div className="empty-state">
        <AlertTriangle size={64} className="empty-icon" />
        <h2>Model Not Trained</h2>
        <p>Please train the model first to view transaction analysis</p>
      </div>
    );
  }

  return (
    <div className="transaction-list">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="page-title">Transactions</h2>
          <p className="page-subtitle">
            {filteredTransactions.length} transactions analyzed
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by ID, user, or amount..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <Filter size={20} />
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
            className="filter-select"
          >
            <option value="">All Risk Levels</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
            className="filter-select"
          >
            <option value="50">50 results</option>
            <option value="100">100 results</option>
            <option value="500">500 results</option>
            <option value="1000">1000 results</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading transactions...</p>
          </div>
        ) : (
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Time</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Confidence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.transaction_id} className={tx.is_anomaly ? 'row-anomaly' : ''}>
                  <td>
                    <code className="transaction-id">{tx.transaction_id}</code>
                  </td>
                  <td>{tx.user_id || 'N/A'}</td>
                  <td className="amount">${tx.amount.toLocaleString()}</td>
                  <td className="timestamp">
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div className="risk-score">
                      <div className="risk-score-bar">
                        <div
                          className="risk-score-fill"
                          style={{
                            width: `${tx.risk_score}%`,
                            backgroundColor: getRiskColor(tx.risk_level)
                          }}
                        />
                      </div>
                      <span>{tx.risk_score.toFixed(1)}</span>
                    </div>
                  </td>
                  <td>
                    <div
                      className="risk-badge"
                      style={{
                        backgroundColor: `${getRiskColor(tx.risk_level)}15`,
                        color: getRiskColor(tx.risk_level)
                      }}
                    >
                      {getRiskIcon(tx.risk_level)}
                      <span>{tx.risk_level}</span>
                    </div>
                  </td>
                  <td>{tx.confidence.toFixed(1)}%</td>
                  <td>
                    <button
                      className="btn-icon"
                      onClick={() => handleViewDetails(tx)}
                      title="View details"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button className="btn-icon" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h4>Transaction Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">ID</span>
                    <code>{selectedTransaction.transaction_id}</code>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value">${selectedTransaction.amount.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">User</span>
                    <span className="detail-value">{selectedTransaction.user_id || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Timestamp</span>
                    <span className="detail-value">
                      {new Date(selectedTransaction.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {explanation && (
                <>
                  <div className="detail-section">
                    <h4>Risk Assessment</h4>
                    <div className="risk-assessment">
                      <div className="risk-metric">
                        <span className="metric-label">Risk Score</span>
                        <div className="metric-value-large">
                          {explanation.risk_score.toFixed(1)}
                        </div>
                      </div>
                      <div className="risk-metric">
                        <span className="metric-label">Risk Level</span>
                        <div
                          className="risk-badge-large"
                          style={{
                            backgroundColor: `${getRiskColor(explanation.risk_level)}15`,
                            color: getRiskColor(explanation.risk_level)
                          }}
                        >
                          {explanation.risk_level}
                        </div>
                      </div>
                      <div className="risk-metric">
                        <span className="metric-label">Confidence</span>
                        <div className="metric-value-large">
                          {explanation.confidence.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Why This Was Flagged</h4>
                    <ul className="reason-list">
                      {explanation.top_reasons.map((reason, idx) => (
                        <li key={idx}>
                          <AlertTriangle size={16} />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {Object.keys(explanation.unusual_features).length > 0 && (
                    <div className="detail-section">
                      <h4>Unusual Features Detected</h4>
                      <div className="features-list">
                        {Object.entries(explanation.unusual_features).map(([feature, data]) => (
                          <div key={feature} className="feature-item">
                            <span className="feature-name">
                              {feature.replace(/_/g, ' ')}
                            </span>
                            <span className="feature-value">
                              {data.value.toFixed(2)} ({data.percentile.toFixed(1)}th percentile)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
