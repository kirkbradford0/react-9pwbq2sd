import React, { useState } from 'react';
import './style.css';

function LoginScreen({ onGuestLogin }) {
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🍈</span>
          <h1>Felons Melon</h1>
          <p className="login-subtitle">Your accountability companion</p>
        </div>

        <div className="login-options">
          <button className="btn-guest" onClick={onGuestLogin}>
            Continue as Guest
          </button>

          <div className="login-divider">
            <span>or</span>
          </div>

          <div className="login-coming-soon">
            <div className="coming-soon-label">Pin & Username Login</div>
            <p className="coming-soon-text">Coming soon</p>
            <input
              className="input-disabled"
              type="text"
              placeholder="Username"
              disabled
            />
            <input
              className="input-disabled"
              type="password"
              placeholder="PIN"
              disabled
            />
            <button className="btn-login-disabled" disabled>
              Log In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainApp({ onLogout }) {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">🍈</span>
          <h2>Felons Melon</h2>
        </div>
        <div className="header-right">
          <span className="guest-badge">Guest</span>
          <button className="btn-logout" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'home' && (
          <div className="tab-content">
            <h2>Welcome</h2>
            <p className="welcome-text">You're logged in as a guest.</p>
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
      </nav>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return isLoggedIn ? (
    <MainApp onLogout={() => setIsLoggedIn(false)} />
  ) : (
    <LoginScreen onGuestLogin={() => setIsLoggedIn(true)} />
  );
}
