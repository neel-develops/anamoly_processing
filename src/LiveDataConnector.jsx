import React, { useState } from 'react';

import { Link, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const LiveDataConnector = ({ apiBaseUrl, onSuccess }) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [worksheetName, setWorksheetName] = useState('Sheet1');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const handleConnect = async () => {
    if (!sheetUrl) {
      setError('Please enter a Google Sheets URL');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/google-sheets/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheet_url: sheetUrl,
          worksheet_name: worksheetName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Connection failed');
      }

      const data = await response.json();
      setConnected(true);
      setStatus(data);
      
      if (onSuccess) {
        onSuccess({ row_count: data.row_count });
      }
    } catch (err) {
      setError(err.message);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="live-data-section">
      <div className="section-header">
        <h2 className="page-title">Live Data Connection</h2>
        <p className="page-subtitle">Connect to Google Sheets for real-time transaction monitoring</p>
      </div>

      <div className="connection-container">
        {/* Setup Card */}
        <div className="setup-card">
          <div className="setup-header">
            <Link size={32} className="setup-icon" />
            <h3>Connect Google Sheets</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Google Sheets URL</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              disabled={connected}
            />
            <p className="form-hint">
              Paste the full URL of your Google Sheets document
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Worksheet Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Sheet1"
              value={worksheetName}
              onChange={(e) => setWorksheetName(e.target.value)}
              disabled={connected}
            />
            <p className="form-hint">
              Name of the sheet tab containing transaction data
            </p>
          </div>

          <button
            className="btn btn-primary btn-large"
            onClick={handleConnect}
            disabled={connecting || connected}
          >
            {connecting ? (
              <>
                <div className="spinner"></div>
                Connecting...
              </>
            ) : connected ? (
              <>
                <CheckCircle size={20} />
                Connected
              </>
            ) : (
              <>
                <Link size={20} />
                Connect
              </>
            )}
          </button>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {connected && status && (
            <div className="alert alert-success">
              <CheckCircle size={20} />
              <div>
                <strong>Successfully connected!</strong>
                <p>Loaded {status.row_count} transactions from {status.worksheet}</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="instructions-card">
          <h4>Setup Instructions</h4>
          
          <div className="instruction-section">
            <h5>1. Prepare Your Google Sheet</h5>
            <p>Your sheet must have the following columns:</p>
            <ul>
              <li><code>amount</code> - Transaction amount (numeric)</li>
              <li><code>timestamp</code> - Transaction date/time</li>
              <li><code>user_id</code> - User identifier (optional)</li>
              <li><code>merchant_category</code> - Category (optional)</li>
              <li><code>location</code> - Location (optional)</li>
              <li><code>device_type</code> - Device type (optional)</li>
            </ul>
          </div>

          <div className="instruction-section">
            <h5>2. Share Your Sheet</h5>
            <p>Make your Google Sheet accessible:</p>
            <ol>
              <li>Click "Share" in the top right of Google Sheets</li>
              <li>Change access to "Anyone with the link can view"</li>
              <li>Or share with the service account email (if configured)</li>
            </ol>
          </div>

          <div className="instruction-section">
            <h5>3. Configure Service Account (Advanced)</h5>
            <p>For production use with private sheets:</p>
            <ol>
              <li>Create a Google Cloud Project</li>
              <li>Enable Google Sheets API</li>
              <li>Create a service account and download credentials JSON</li>
              <li>Share your sheet with the service account email</li>
              <li>Place credentials at: <code>backend/credentials.json</code></li>
            </ol>
          </div>

          <div className="instruction-section">
            <h5>4. Real-Time Updates</h5>
            <p>How live monitoring works:</p>
            <ul>
              <li>New rows added to your sheet are detected automatically</li>
              <li>Data is fetched every 30 seconds (configurable)</li>
              <li>Anomaly detection runs on new transactions</li>
              <li>Dashboard updates in real-time</li>
            </ul>
          </div>
        </div>

        {/* Sample Sheet */}
        <div className="sample-sheet-card">
          <h4>Example Sheet Format</h4>
          <div className="sheet-preview">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>amount</th>
                  <th>timestamp</th>
                  <th>user_id</th>
                  <th>merchant_category</th>
                  <th>location</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>250.00</td>
                  <td>2024-01-15 14:30:00</td>
                  <td>user_001</td>
                  <td>retail</td>
                  <td>new_york</td>
                </tr>
                <tr>
                  <td>1500.00</td>
                  <td>2024-01-15 15:45:00</td>
                  <td>user_002</td>
                  <td>electronics</td>
                  <td>los_angeles</td>
                </tr>
                <tr>
                  <td>75.50</td>
                  <td>2024-01-15 16:20:00</td>
                  <td>user_001</td>
                  <td>food</td>
                  <td>new_york</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="preview-caption">
            Copy this format to your Google Sheet. First row must be headers.
          </p>
        </div>

        {/* Connection Status */}
        {connected && (
          <div className="status-card">
            <div className="status-header">
              <div className="status-indicator status-active">
                <div className="status-pulse"></div>
              </div>
              <h4>Live Connection Active</h4>
            </div>
            
            <div className="status-details">
              <div className="status-item">
                <span className="status-label">Source</span>
                <span className="status-value">Google Sheets</span>
              </div>
              <div className="status-item">
                <span className="status-label">Worksheet</span>
                <span className="status-value">{status.worksheet}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Transactions</span>
                <span className="status-value">{status.row_count}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Update Interval</span>
                <span className="status-value">30 seconds</span>
              </div>
            </div>

            <button className="btn btn-secondary">
              <RefreshCw size={18} />
              Refresh Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveDataConnector;
