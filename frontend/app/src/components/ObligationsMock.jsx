import React from 'react';

export default function ObligationsMock({ obligations, citations }) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Что нужно сдать</h3>
      {obligations.length === 0 ? <div style={styles.empty}>Пока нет обязательств по текущему ответу.</div> : null}
      {obligations.map((ob, i) => (
        <div key={ob.code || i} style={styles.card}>
          <div style={styles.name}>{ob.title || 'Обязательство без названия'}</div>
          <div style={styles.meta}>Код: {ob.code || 'Не указан'}</div>
          <div style={styles.deadline}>Срок: {ob.due_date_rule || 'Не указан'}</div>
          {typeof ob.amount_kzt === 'number' ? <div style={styles.meta}>Сумма: {formatCurrency(ob.amount_kzt)}</div> : null}
          {ob.basis ? <div style={styles.basis}>Основание: {ob.basis}</div> : null}
        </div>
      ))}

      <h3 style={{ ...styles.title, marginTop: 24 }}>Ссылки на НК РК</h3>
      {citations.length === 0 ? <div style={styles.empty}>Пока нет цитат по текущему ответу.</div> : null}
      {citations.map((c, i) => (
        <div key={`${c.article_number || 'citation'}-${i}`} style={styles.citation}>
          <strong>{formatCitationTitle(c)}</strong>
          <div style={styles.citationText}>{c.snippet}</div>
        </div>
      ))}
    </div>
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₸';
}

function formatCitationTitle(citation) {
  if (!citation.article_number && !citation.article_title) {
    return 'Налоговый кодекс РК';
  }

  if (citation.article_title) {
    return `Ст. ${citation.article_number || '—'} — ${citation.article_title}`;
  }

  return `Ст. ${citation.article_number}`;
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
  meta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  basis: {
    fontSize: 12,
    color: '#1a1a2e',
    lineHeight: 1.5,
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
  empty: {
    fontSize: 13,
    color: '#666',
    lineHeight: 1.5,
  },
};
