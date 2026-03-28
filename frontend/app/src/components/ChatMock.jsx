import React from 'react';

export default function ChatMock({
  messages,
  input,
  onInputChange,
  onSubmit,
  isConnecting,
  isSending,
  isSessionReady,
  error,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {messages.length === 0 && !isConnecting ? (
          <div style={styles.emptyState}>
            Напишите вопрос, и ответ, обязательства и цитаты загрузятся из реального API.
          </div>
        ) : null}

        {messages.map((msg, i) => (
          <div key={msg.id || i} style={{
            ...styles.bubble,
            ...(msg.role === 'user' ? styles.user : styles.assistant),
          }}>
            <div style={styles.roleLabel}>{msg.role === 'user' ? 'Вы' : 'Salyq AI'}</div>
            <div style={styles.messageText}>{msg.content}</div>

            {msg.actionPlan && msg.actionPlan.length > 0 ? (
              <div style={styles.metaBlock}>
                <div style={styles.metaTitle}>План действий</div>
                <ol style={styles.planList}>
                  {msg.actionPlan.map((step, index) => (
                    <li key={`${msg.id || i}-step-${index}`}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {msg.clarifyingQuestions && msg.clarifyingQuestions.length > 0 ? (
              <div style={styles.metaBlock}>
                <div style={styles.metaTitle}>Нужно уточнить</div>
                <ul style={styles.questionList}>
                  {msg.clarifyingQuestions.map((question, index) => (
                    <li key={`${msg.id || i}-question-${index}`}>{question}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {typeof msg.confidence === 'number' ? (
              <div style={styles.confidenceRow}>
                <span style={styles.confidenceLabel}>Уверенность ответа</span>
                <span style={styles.confidenceValue}>{Math.round(msg.confidence * 100)}%</span>
              </div>
            ) : null}

            {msg.disclaimer ? (
              <div style={styles.disclaimer}>{msg.disclaimer}</div>
            ) : null}
          </div>
        ))}

        {isSending ? (
          <div style={{ ...styles.bubble, ...styles.assistant }}>
            <div style={styles.roleLabel}>Salyq AI</div>
            <div style={styles.loadingText}>Печатает...</div>
          </div>
        ) : null}
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <form style={styles.inputRow} onSubmit={handleSubmit}>
        <input
          style={styles.input}
          placeholder="Задайте вопрос о налогах..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={!isSessionReady || isSending}
        />
        <button
          style={{
            ...styles.sendBtn,
            ...((!isSessionReady || isSending || !input.trim()) ? styles.sendBtnDisabled : {}),
          }}
          disabled={!isSessionReady || isSending || !input.trim()}
          title={!isSessionReady ? 'Подключение к API...' : undefined}
          type="submit"
        >
          {isConnecting ? 'Подключение...' : isSending ? 'Отправка...' : 'Отправить'}
        </button>
      </form>
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
  emptyState: {
    padding: '16px 18px',
    borderRadius: 12,
    background: '#f7f8fb',
    color: '#5b6475',
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 12,
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
  messageText: {
    whiteSpace: 'pre-wrap',
  },
  metaBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: '1px solid rgba(0,0,0,0.08)',
  },
  metaTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    color: '#495057',
  },
  planList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 13,
    color: '#333',
  },
  questionList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 13,
    color: '#333',
  },
  confidenceRow: {
    marginTop: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#666',
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 1.5,
    color: '#666',
  },
  loadingText: {
    color: '#666',
    fontStyle: 'italic',
  },
  error: {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fff1f0',
    color: '#b42318',
    fontSize: 13,
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
    cursor: 'pointer',
    fontSize: 14,
  },
  sendBtnDisabled: {
    cursor: 'not-allowed',
    opacity: 0.6,
  },
};
