import React, { useState } from 'react';
import scenarios from '../mocks/scenarios';
import ProfileMock from '../components/ProfileMock';
import ChatMock from '../components/ChatMock';
import ObligationsMock from '../components/ObligationsMock';

const scenarioKeys = Object.keys(scenarios);

export default function DemoPage() {
  const [active, setActive] = useState(scenarioKeys[0]);
  const data = scenarios[active];

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>Salyq AI Demo</h1>
        <div style={styles.scenarioBar}>
          {scenarioKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              style={{
                ...styles.scenarioBtn,
                ...(active === key ? styles.scenarioBtnActive : {}),
              }}
            >
              {scenarios[key].label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div style={styles.body}>
        {/* Left panel — Profile */}
        <aside style={styles.left}>
          <ProfileMock profile={data.profile} />
        </aside>

        {/* Center panel — Chat */}
        <main style={styles.center}>
          <ChatMock messages={data.chat} />
        </main>

        {/* Right panel — Obligations + Citations */}
        <aside style={styles.right}>
          <ObligationsMock obligations={data.obligations} citations={data.citations} />
        </aside>
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    minHeight: '100vh',
    background: '#f0f2f5',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: '#1a1a2e',
    color: '#fff',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  logo: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  scenarioBar: {
    display: 'flex',
    gap: 8,
  },
  scenarioBtn: {
    padding: '8px 16px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  scenarioBtnActive: {
    background: '#4361ee',
    color: '#fff',
    borderColor: '#4361ee',
  },
  body: {
    display: 'flex',
    flex: 1,
    gap: 16,
    padding: 20,
    maxWidth: 1400,
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  left: {
    width: 280,
    flexShrink: 0,
  },
  center: {
    flex: 1,
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 500,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  right: {
    width: 320,
    flexShrink: 0,
  },
};
