import React from 'react';

export default function ObligationsMock({ obligations, citations }) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Что нужно сдать</h3>
      {obligations.map((ob, i) => (
        <div key={i} style={styles.card}>
          <div style={styles.name}>{ob.name}</div>
          <div style={styles.deadline}>Срок: {ob.deadline}</div>
          <span style={{
            ...styles.badge,
            background: ob.status === 'recurring' ? '#ffc107' : '#4361ee',
          }}>
            {ob.status === 'recurring' ? 'Регулярно' : 'Предстоит'}
          </span>
        </div>
      ))}

      <h3 style={{ ...styles.title, marginTop: 24 }}>Ссылки на НК РК</h3>
      {citations.map((c, i) => (
        <div key={i} style={styles.citation}>
          <strong>{c.article}</strong>
          <div style={styles.citationText}>{c.text}</div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    background: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    margin: '0 0 12px',
    fontSize: 16,
    color: '#1a1a2e',
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  name: {
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 4,
  },
  deadline: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 12,
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
  },
  citation: {
    background: '#fff8e1',
    borderLeft: '3px solid #ffc107',
    borderRadius: 6,
    padding: '10px 14px',
    marginBottom: 8,
  },
  citationText: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
};
