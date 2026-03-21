import React, { useState, useRef } from 'react';
import './style.css';

// ---------------------------------------------------------------------------
// Mock AI engine — swap generateCode() body for a real Claude API call later
// ---------------------------------------------------------------------------
const MOCK_TEMPLATES = {
  budget: `function BudgetTracker() {
  const [items, setItems] = React.useState([]);
  const [desc, setDesc] = React.useState('');
  const [amount, setAmount] = React.useState('');

  const add = () => {
    if (!desc || !amount) return;
    setItems([...items, { desc, amount: parseFloat(amount), id: Date.now() }]);
    setDesc(''); setAmount('');
  };

  const total = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="fm-tool">
      <h2>Budget Tracker</h2>
      <div className="fm-row">
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" />
        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" type="number" />
        <button onClick={add}>Add</button>
      </div>
      <ul>
        {items.map(i => <li key={i.id}>{i.desc} — $\{i.amount.toFixed(2)}</li>)}
      </ul>
      <strong>Total: $\{total.toFixed(2)}</strong>
    </div>
  );
}`,
  resume: `function ResumeBuilder() {
  const [fields, setFields] = React.useState({ name: '', role: '', skills: '', experience: '' });
  const set = k => e => setFields({ ...fields, [k]: e.target.value });

  return (
    <div className="fm-tool">
      <h2>Resume Builder</h2>
      {[['name','Full Name'],['role','Target Role'],['skills','Skills (comma-separated)'],['experience','Work Experience']].map(([k, label]) => (
        <div className="fm-field" key={k}>
          <label>{label}</label>
          {k === 'experience'
            ? <textarea rows={4} value={fields[k]} onChange={set(k)} />
            : <input value={fields[k]} onChange={set(k)} />}
        </div>
      ))}
      {fields.name && (
        <div className="fm-preview">
          <h3>{fields.name}</h3>
          <em>{fields.role}</em>
          {fields.skills && <p><strong>Skills:</strong> {fields.skills}</p>}
          {fields.experience && <p>{fields.experience}</p>}
        </div>
      )}
    </div>
  );
}`,
  checklist: `function GoalChecklist() {
  const [goals, setGoals] = React.useState([]);
  const [input, setInput] = React.useState('');

  const add = () => {
    if (!input.trim()) return;
    setGoals([...goals, { text: input.trim(), done: false, id: Date.now() }]);
    setInput('');
  };

  const toggle = id => setGoals(goals.map(g => g.id === id ? { ...g, done: !g.done } : g));

  return (
    <div className="fm-tool">
      <h2>Goal Checklist</h2>
      <div className="fm-row">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()} placeholder="Add a goal..." />
        <button onClick={add}>Add</button>
      </div>
      <ul className="fm-checklist">
        {goals.map(g => (
          <li key={g.id} onClick={() => toggle(g.id)} className={g.done ? 'done' : ''}>
            <span className="fm-check">{g.done ? '✓' : '○'}</span> {g.text}
          </li>
        ))}
      </ul>
      <p>{goals.filter(g => g.done).length} / {goals.length} complete</p>
    </div>
  );
}`,
};

function detectTemplate(prompt) {
  const p = prompt.toLowerCase();
  if (p.includes('budget') || p.includes('money') || p.includes('expense') || p.includes('spend')) return 'budget';
  if (p.includes('resume') || p.includes('job') || p.includes('career') || p.includes('work history')) return 'resume';
  if (p.includes('goal') || p.includes('checklist') || p.includes('track') || p.includes('habit')) return 'checklist';
  return 'checklist'; // sensible default
}

async function generateCode(prompt) {
  // Replace this function body with a real Claude API call, e.g.:
  //   const response = await anthropic.messages.create({ ... prompt ... });
  //   return response.content[0].text;
  await new Promise(r => setTimeout(r, 1400)); // simulate network latency
  return MOCK_TEMPLATES[detectTemplate(prompt)];
}

async function refactorCode(code) {
  await new Promise(r => setTimeout(r, 1000));
  // In production: send code + "refactor for clarity and performance" to Claude
  return code
    .replace(/React\.useState/g, 'useState')
    .replace(/^/, '// Refactored by FM AI — optimised for readability\nimport React, { useState } from \'react\';\n\n');
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const CLIENTS = [
  { id: 1, name: 'Marcus T.', goal: 'Find stable employment', tag: 'Job Readiness' },
  { id: 2, name: 'Deja R.',   goal: 'Manage reentry finances', tag: 'Financial Literacy' },
  { id: 3, name: 'Calvin W.', goal: 'Build daily structure',   tag: 'Life Skills' },
  { id: 4, name: 'Keisha M.', goal: 'Develop tech skills',     tag: 'Digital Literacy' },
];

function ClientCard({ client, selected, onSelect }) {
  return (
    <button
      className={`client-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(client)}
    >
      <span className="client-avatar">{client.name.charAt(0)}</span>
      <div className="client-info">
        <strong>{client.name}</strong>
        <span className="client-goal">{client.goal}</span>
      </div>
      <span className="client-tag">{client.tag}</span>
    </button>
  );
}

function CodePanel({ code, status, onRefactor, onImplement }) {
  const ref = useRef(null);

  const copy = () => {
    navigator.clipboard?.writeText(code);
    ref.current && (ref.current.select());
  };

  return (
    <div className="code-panel">
      <div className="code-panel-header">
        <span>Generated Code</span>
        <div className="code-actions">
          <button className="btn-ghost" onClick={copy} disabled={!code}>Copy</button>
          <button className="btn-secondary" onClick={onRefactor} disabled={!code || status === 'refactoring'}>
            {status === 'refactoring' ? 'Refactoring…' : 'Refactor'}
          </button>
          <button className="btn-primary" onClick={onImplement} disabled={!code || status === 'implementing'}>
            {status === 'implementing' ? 'Implementing…' : 'Implement'}
          </button>
        </div>
      </div>
      <textarea
        ref={ref}
        className="code-output"
        readOnly
        value={code || '// Your generated code will appear here…'}
        spellCheck={false}
      />
    </div>
  );
}

function LivePreview({ code }) {
  if (!code) return null;

  // Extract a summary of what was built to show as a "live" indicator
  const match = code.match(/function (\w+)\s*\(/);
  const name = match ? match[1] : 'Component';

  return (
    <div className="live-preview">
      <span className="live-dot" />
      <strong>{name}</strong> ready — paste into your client's project to deploy
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [client, setClient]     = useState(null);
  const [prompt, setPrompt]     = useState('');
  const [code, setCode]         = useState('');
  const [status, setStatus]     = useState('idle');
  // idle | generating | done | refactoring | implementing | implemented
  const [log, setLog]           = useState([]);

  const addLog = msg => setLog(l => [`${new Date().toLocaleTimeString()} — ${msg}`, ...l].slice(0, 20));

  const handleGenerate = async () => {
    if (!client || !prompt.trim()) return;
    setStatus('generating');
    setCode('');
    addLog(`Generating app for ${client.name}: "${prompt}"`);
    try {
      const result = await generateCode(prompt);
      setCode(result);
      setStatus('done');
      addLog(`Code generated (${result.split('\n').length} lines)`);
    } catch (e) {
      addLog(`Error: ${e.message}`);
      setStatus('idle');
    }
  };

  const handleRefactor = async () => {
    setStatus('refactoring');
    addLog('Refactoring for clarity and performance…');
    const result = await refactorCode(code);
    setCode(result);
    setStatus('done');
    addLog('Refactor complete');
  };

  const handleImplement = async () => {
    setStatus('implementing');
    addLog(`Implementing for ${client.name}…`);
    await new Promise(r => setTimeout(r, 1200));
    setStatus('implemented');
    addLog(`Implemented and ready for ${client.name}`);
  };

  return (
    <div className="fm-app">
      {/* Header */}
      <header className="fm-header">
        <div className="fm-logo">
          <span className="fm-logo-icon">🍈</span>
          <div>
            <h1>Felons Melon</h1>
            <span className="fm-tagline">Coach App Builder</span>
          </div>
        </div>
        <div className="fm-header-right">
          <span className="fm-badge">AI-Powered</span>
        </div>
      </header>

      <main className="fm-main">
        {/* Left column */}
        <aside className="fm-sidebar">
          <section className="fm-section">
            <h2 className="section-title">Select Client</h2>
            <div className="client-list">
              {CLIENTS.map(c => (
                <ClientCard key={c.id} client={c} selected={client?.id === c.id} onSelect={setClient} />
              ))}
            </div>
          </section>

          {client && (
            <section className="fm-section">
              <h2 className="section-title">Build Request</h2>
              <p className="client-context">
                <strong>{client.name}</strong> — {client.goal}
              </p>
              <textarea
                className="prompt-input"
                rows={5}
                placeholder={`Describe what ${client.name} needs. e.g. "A budget tracker to monitor weekly spending"`}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <button
                className="btn-primary btn-full"
                onClick={handleGenerate}
                disabled={!prompt.trim() || status === 'generating'}
              >
                {status === 'generating' ? 'Generating…' : 'Generate App'}
              </button>
            </section>
          )}

          {log.length > 0 && (
            <section className="fm-section">
              <h2 className="section-title">Activity Log</h2>
              <ul className="activity-log">
                {log.map((entry, i) => <li key={i}>{entry}</li>)}
              </ul>
            </section>
          )}
        </aside>

        {/* Right column */}
        <div className="fm-workspace">
          {!client && (
            <div className="fm-empty">
              <span className="fm-empty-icon">🍈</span>
              <p>Select a client to start building their app</p>
            </div>
          )}

          {client && (
            <>
              <CodePanel
                code={code}
                status={status}
                onRefactor={handleRefactor}
                onImplement={handleImplement}
              />
              {status === 'implemented' && <LivePreview code={code} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
