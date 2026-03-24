import React, { useState } from 'react';
import './style.css';

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

function LoginScreen({ onLogin }) {
  const [tab, setTab] = useState('signin'); // 'signin' or 'signup'
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [pinLength, setPinLength] = useState(4);
  const [error, setError] = useState('');

  function handleKey(key) {
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
    } else if (key === '' ) {
      // no-op
    } else if (pin.length < pinLength) {
      const newPin = pin + key;
      setPin(newPin);
      setError('');
      if (newPin.length === pinLength) {
        handleSubmit(newPin);
      }
    }
  }

  function handleSubmit(currentPin) {
    const p = currentPin !== undefined ? currentPin : pin;
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (p.length !== pinLength) {
      setError('Please enter your full PIN.');
      return;
    }
    // Accept any username and PIN — no pattern restriction
    onLogin({ username: username.trim(), pin: p, mode: tab });
  }

  function handlePinLengthChange(len) {
    setPinLength(len);
    setPin('');
    setError('');
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🍈</span>
          <h1>Felon's Melon</h1>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'signin' ? '' : 'active'}`}
            onClick={() => { setTab('signin'); setPin(''); setError(''); }}
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => { setTab('signup'); setPin(''); setError(''); }}
          >
            Sign up
          </button>
        </div>

        {tab === 'signup' && (
          <p className="create-account-label">CREATE ACCOUNT</p>
        )}

        <input
          className="username-input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => { setUsername(e.target.value); setError(''); }}
        />

        <div className="pin-length-row">
          <span className="pin-length-label">PIN length:</span>
          <button
            className={`pin-length-btn ${pinLength === 4 ? 'selected' : ''}`}
            onClick={() => handlePinLengthChange(4)}
          >
            4
          </button>
          <button
            className={`pin-length-btn ${pinLength === 6 ? 'selected' : ''}`}
            onClick={() => handlePinLengthChange(6)}
          >
            6
          </button>
        </div>

        <div className="pin-dots">
          {Array.from({ length: pinLength }).map((_, i) => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="keypad-grid">
          {KEYPAD.map((row, i) =>
            row.map((key, j) => (
              <button
                key={`${i}-${j}`}
                className={`keypad-btn${key === '' ? ' keypad-btn-empty' : ''}${key === '⌫' ? ' keypad-btn-back' : ''}`}
                onClick={() => handleKey(key)}
                disabled={key === ''}
              >
                {key}
              </button>
            ))
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}
      </div>
    </div>
  );
}

function MainApp({ onLogout, user }) {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">🍈</span>
          <h2>Felon's Melon</h2>
        </div>
        <div className="header-right">
          <span className="user-badge">{user.username}</span>
          <button className="btn-logout" onClick={onLogout}>Sign Out</button>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'home' && (
          <div className="tab-content">
            <h2>Welcome back, {user.username}</h2>
            <p className="welcome-text">You're logged in to Felon's Melon.</p>
            <div className="card-grid">
              <div className="info-card">
                <span className="card-icon">📋</span>
                <h3>Activities</h3>
                <p>Log your daily activities and check-ins</p>
              </div>
              <div className="info-card">
                <span className="card-icon">📊</span>
                <h3>Reports</h3>
                <p>View your monthly progress reports</p>
              </div>
              <div className="info-card">
                <span className="card-icon">📎</span>
                <h3>Evidence</h3>
                <p>Upload and manage your documentation</p>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'activities' && (
          <div className="tab-content">
            <h2>Activities</h2>
            <p>Activity log coming soon.</p>
          </div>
        )}
        {activeTab === 'reports' && (
          <div className="tab-content">
            <h2>Reports</h2>
            <p>Monthly reports coming soon.</p>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span>🏠</span><span>Home</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          <span>📋</span><span>Activities</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span>📊</span><span>Reports</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  if (session) {
    return <MainApp user={session} onLogout={() => setSession(null)} />;
  }

  return <LoginScreen onLogin={info => setSession(info)} />;
}
