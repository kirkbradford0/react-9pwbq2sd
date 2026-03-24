import React, { useState } from 'react';
import './style.css';
import LoopSimulation from './LoopSimulation';

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

function PhoneKeypad({ onClose, onLogin }) {
  const [digits, setDigits] = useState('');

  function formatDisplay(d) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }

  function handleKey(key) {
    if (key === '⌫') {
      setDigits(d => d.slice(0, -1));
    } else if (key === '') {
      // no-op
    } else if (digits.length < 10) {
      setDigits(d => d + key);
    }
  }

  function handleSubmit() {
    if (digits.length === 10) {
      onLogin(digits);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="keypad-modal" onClick={e => e.stopPropagation()}>
        <div className="keypad-header">
          <span className="keypad-title">FM 4 Life</span>
          <button className="keypad-close" onClick={onClose}>✕</button>
        </div>

        <p className="keypad-prompt">Enter your phone number</p>

        <div className="phone-display">
          {digits.length === 0
            ? <span className="phone-placeholder">(___) ___-____</span>
            : <span className="phone-value">{formatDisplay(digits)}</span>
          }
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

        <button
          className={`btn-enter ${digits.length === 10 ? 'active' : ''}`}
          onClick={handleSubmit}
          disabled={digits.length !== 10}
        >
          Let's Go
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onGuestLogin, onPhoneLogin }) {
  const [showKeypad, setShowKeypad] = useState(false);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🍈</span>
          <h1>Felons Melon</h1>
          <p className="login-subtitle">Your accountability companion</p>
        </div>

        <div className="login-options">
          <button className="btn-fm4life" onClick={() => setShowKeypad(true)}>
            FM 4 Life
          </button>
          <button className="btn-guest" onClick={onGuestLogin}>
            Guest Mode
          </button>
        </div>
      </div>

      {showKeypad && (
        <PhoneKeypad
          onClose={() => setShowKeypad(false)}
          onLogin={(phone) => {
            setShowKeypad(false);
            onPhoneLogin(phone);
          }}
        />
      )}
    </div>
  );
}

function MainApp({ onLogout, userMode }) {
  const [activeTab, setActiveTab] = useState('home');
  const TABS = ['home', 'activities', 'reports', 'simulate'];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">🍈</span>
          <h2>Felons Melon</h2>
        </div>
        <div className="header-right">
          <span className="user-badge">
            {userMode === 'guest' ? 'Guest' : 'FM 4 Life'}
          </span>
          <button className="btn-logout" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'home' && (
          <div className="tab-content">
            <h2>Welcome{userMode === 'guest' ? '' : ' back'}</h2>
            <p className="welcome-text">
              {userMode === 'guest'
                ? "You're browsing as a guest."
                : "You're logged in."}
            </p>
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
        {activeTab === 'simulate' && (
          <div className="tab-content tab-content--sim">
            <LoopSimulation />
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span>🏠</span>
          <span>Home</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          <span>📋</span>
          <span>Activities</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span>📊</span>
          <span>Reports</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'simulate' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulate')}
        >
          <span>⚛</span>
          <span>Simulate</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  if (session) {
    return (
      <MainApp
        userMode={session.mode}
        onLogout={() => setSession(null)}
      />
    );
  }

  return (
    <LoginScreen
      onGuestLogin={() => setSession({ mode: 'guest' })}
      onPhoneLogin={(phone) => setSession({ mode: 'phone', phone })}
    />
  );
}
