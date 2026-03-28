import React from 'react';

export default function ProfileMock({ profile }) {
  const viewModel = normalizeProfile(profile);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Профиль налогоплательщика</h3>
      <div style={styles.row}><span style={styles.label}>Имя:</span> {viewModel.name}</div>
      <div style={styles.row}><span style={styles.label}>Тип:</span> {viewModel.taxpayerType}</div>
      <div style={styles.row}><span style={styles.label}>Режим:</span> {viewModel.regime}</div>
      <div style={styles.row}><span style={styles.label}>Доход:</span> {viewModel.income}</div>
      {viewModel.activityType ? <div style={styles.row}><span style={styles.label}>Деятельность:</span> {viewModel.activityType}</div> : null}
      {viewModel.residencyStatus ? <div style={styles.row}><span style={styles.label}>Резидентство:</span> {viewModel.residencyStatus}</div> : null}
    </div>
  );
}

function normalizeProfile(profile = {}) {
  return {
    name: profile.name || profile.email || 'Не указано',
    taxpayerType: profile.taxpayerType || formatTaxpayerType(profile.taxpayer_type),
    regime: profile.regime || profile.tax_regime || 'Не указан',
    income: profile.income || formatIncome(profile.annual_income_kzt),
    activityType: profile.activityType || profile.activity_type || '',
    residencyStatus: formatResidency(profile.residency_status),
  };
}

function formatTaxpayerType(value) {
  const labels = {
    individual: 'Физическое лицо',
    sole_proprietor: 'ИП',
    legal_entity: 'ТОО / юрлицо',
  };

  return labels[value] || value || 'Не указан';
}

function formatResidency(value) {
  if (value === 'resident') {
    return 'Резидент';
  }

  if (value === 'non_resident') {
    return 'Нерезидент';
  }

  return '';
}

function formatIncome(amount) {
  if (typeof amount !== 'number') {
    return 'Не указан';
  }

  return `${new Intl.NumberFormat('ru-RU').format(amount)} ₸ / год`;
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
