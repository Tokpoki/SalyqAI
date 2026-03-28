import React from 'react';

export default function ProfileMock({ profile }) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Профиль налогоплательщика</h3>
      <div style={styles.row}><span style={styles.label}>Имя:</span> {profile.name}</div>
      <div style={styles.row}><span style={styles.label}>Тип:</span> {profile.taxpayerType}</div>
      <div style={styles.row}><span style={styles.label}>Режим:</span> {profile.regime}</div>
      <div style={styles.row}><span style={styles.label}>Доход:</span> {profile.income}</div>
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
    margin: '0 0 16px',
    fontSize: 16,
    color: '#1a1a2e',
  },
  row: {
    marginBottom: 8,
    fontSize: 14,
    color: '#333',
    lineHeight: 1.5,
  },
  label: {
    fontWeight: 600,
    color: '#555',
  },
};
