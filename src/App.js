import React, { useState } from 'react';
import './style.css';

const melons = [
  { name: 'Crimson Sweet', emoji: '🍉', desc: 'Classic striped rind with deep red flesh and high sugar content.' },
  { name: 'Canary', emoji: '🍈', desc: 'Bright yellow skin with pale green flesh and a sweet, mild flavor.' },
  { name: 'Honeydew', emoji: '🍈', desc: 'Smooth green exterior with juicy, sweet flesh perfect for summer.' },
  { name: 'Casaba', emoji: '🟡', desc: 'Wrinkled golden rind with creamy white flesh and subtle sweetness.' },
  { name: 'Galia', emoji: '🍈', desc: 'Netted skin with aromatic green flesh — a cantaloupe-honeydew hybrid.' },
];

export default function App() {
  const [selected, setSelected] = useState(null);
  const [votes, setVotes] = useState({});

  function vote(name) {
    setVotes(prev => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
  }

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  return (
    <div className="app">
      <header className="header">
        <span className="badge">🔒</span>
        <h1>Felon's Melon</h1>
        <p className="tagline">The juiciest melons this side of the cellblock</p>
      </header>

      <section className="gallery">
        {melons.map(melon => (
          <div
            key={melon.name}
            className={`card ${selected === melon.name ? 'active' : ''}`}
            onClick={() => setSelected(selected === melon.name ? null : melon.name)}
          >
            <div className="card-emoji">{melon.emoji}</div>
            <h2>{melon.name}</h2>
            {selected === melon.name && <p className="desc">{melon.desc}</p>}
            <button
              className="vote-btn"
              onClick={e => { e.stopPropagation(); vote(melon.name); }}
            >
              Vote {votes[melon.name] ? `(${votes[melon.name]})` : ''}
            </button>
          </div>
        ))}
      </section>

      {totalVotes > 0 && (
        <section className="results">
          <h3>Popularity Poll ({totalVotes} vote{totalVotes !== 1 ? 's' : ''})</h3>
          {melons.map(melon => {
            const count = votes[melon.name] || 0;
            const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
            return (
              <div key={melon.name} className="bar-row">
                <span className="bar-label">{melon.emoji} {melon.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="bar-pct">{pct}%</span>
              </div>
            );
          })}
        </section>
      )}

      <footer className="footer">
        <p>© 2026 Felon's Melon Co. — Fresh picks, no parole required.</p>
      </footer>
    </div>
  );
}
