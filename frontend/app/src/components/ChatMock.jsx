import React, { useState } from 'react';

export default function ChatMock({ messages }) {
  const [input, setInput] = useState('');

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            ...styles.bubble,
            ...(msg.role === 'user' ? styles.user : styles.assistant),
          }}>
            <div style={styles.roleLabel}>{msg.role === 'user' ? 'Вы' : 'Salyq AI'}</div>
            <div>{msg.text}</div>
          </div>
        ))}
      </div>
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Задайте вопрос о налогах..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button style={styles.sendBtn} disabled title="Демо — отправка отключена">
          Отправить
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 4px',
  },
  bubble: {
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: '90%',
  },
  user: {
    background: '#e8f0fe',
    marginLeft: 'auto',
    textAlign: 'right',
  },
  assistant: {
    background: '#f0f0f0',
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#4361ee',
    color: '#fff',
    fontWeight: 600,
    cursor: 'not-allowed',
    opacity: 0.6,
    fontSize: 14,
  },
};
