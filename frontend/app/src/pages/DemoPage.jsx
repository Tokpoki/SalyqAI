import React, { useEffect, useMemo, useState } from 'react';
import scenarios from '../mocks/scenarios';
import ProfileMock from '../components/ProfileMock';
import ChatMock from '../components/ChatMock';
import ObligationsMock from '../components/ObligationsMock';
import { login, getMe } from '../api/auth';
import { createSession, getSession, sendMessage } from '../api/chat';
import { getProfile } from '../api/profile';
import { clearTokens, hasTokens } from '../lib/auth';

const scenarioKeys = Object.keys(scenarios);
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEMO_EMAIL = 'test@mail.com';
const DEMO_PASSWORD = '123';

export default function DemoPage() {
  const [active, setActive] = useState(scenarioKeys[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('profile');
  const [isNarrowScreen, setIsNarrowScreen] = useState(() => window.innerWidth < 1100);
  const data = scenarios[active];
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [obligations, setObligations] = useState([]);
  const [citations, setCitations] = useState([]);
  const [profile, setProfile] = useState(data.profile);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [useContractAuth, setUseContractAuth] = useState(false);

  function mapApiMessages(apiMessages) {
    return Array.isArray(apiMessages)
      ? apiMessages.map((message, index) => ({
          id: message.id || `message-${index}`,
          role: message.role,
          content: message.content || '',
        }))
      : [];
  }

  async function resolveAuthMode() {
    if (hasTokens()) {
      return true;
    }

    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      return true;
    } catch (authError) {
      if ([404, 405, 501].includes(authError?.status)) {
        return false;
      }

      if (authError?.status === 401) {
        clearTokens();
        throw new Error(`Тестовый аккаунт ${DEMO_EMAIL} / ${DEMO_PASSWORD} не прошёл авторизацию.`);
      }

      return false;
    }
  }

  async function loadProfileSnapshot(contractAuthEnabled) {
    if (!contractAuthEnabled) {
      return data.profile;
    }

    try {
      const me = await getMe();

      if (me?.profile || me?.name || me?.email) {
        return {
          ...(me?.profile || {}),
          name: me?.name,
          email: me?.email,
        };
      }
    } catch (profileError) {
      if (![404, 405, 501].includes(profileError?.status)) {
        throw profileError;
      }
    }

    try {
      return await getProfile({ auth: true });
    } catch (profileError) {
      if ([404, 405, 501].includes(profileError?.status)) {
        return data.profile;
      }

      throw profileError;
    }
  }

  useEffect(() => {
    function handleResize() {
      setIsNarrowScreen(window.innerWidth < 1100);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      setSessionId('');
      setMessages([]);
      setObligations([]);
      setCitations([]);
      setProfile(data.profile);
      setInput('');
      setIsCreatingSession(true);
      setError('');

      try {
        const contractAuthEnabled = await resolveAuthMode();
        const profileSnapshot = await loadProfileSnapshot(contractAuthEnabled);
        const session = await createSession(
          contractAuthEnabled ? { channel: 'web', locale: 'ru-KZ' } : undefined,
          { auth: contractAuthEnabled }
        );

        if (!session || !session.id) {
          throw new Error('Missing session id');
        }

        const sessionDetail = await getSession(session.id, { auth: contractAuthEnabled });

        if (!cancelled) {
          setUseContractAuth(contractAuthEnabled);
          setSessionId(session.id);
          setProfile(profileSnapshot || data.profile);
          setMessages(mapApiMessages(sessionDetail?.messages));
        }
      } catch (sessionError) {
        if (!cancelled) {
          setError(sessionError?.message || `Не удалось подключиться к backend API: ${apiUrl}.`);
        }
      } finally {
        if (!cancelled) {
          setIsCreatingSession(false);
        }
      }
    }

    initSession();

    return () => {
      cancelled = true;
    };
  }, [active]);

  const isSessionReady = useMemo(() => Boolean(sessionId) && !isCreatingSession, [sessionId, isCreatingSession]);

  async function handleSendMessage() {
    const text = input.trim();

    if (!text || !sessionId || isSending) {
      return;
    }

    const userMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput('');
    setIsSending(true);
    setError('');

    try {
      const response = await sendMessage(sessionId, text, { auth: useContractAuth });
      const sessionDetail = await getSession(sessionId, { auth: useContractAuth });

      setMessages((currentMessages) => {
        const syncedMessages = mapApiMessages(sessionDetail?.messages);

        if (!syncedMessages.length) {
          return [
            ...currentMessages,
            {
              id: response.message_id || `assistant-${Date.now()}`,
              role: 'assistant',
              content: response.answer_text || 'Ответ получен, но текст ответа отсутствует.',
              actionPlan: Array.isArray(response.action_plan) ? response.action_plan : [],
              clarifyingQuestions: Array.isArray(response.clarifying_questions) ? response.clarifying_questions : [],
              confidence: typeof response.confidence === 'number' ? response.confidence : null,
              disclaimer: response.disclaimer || '',
            },
          ];
        }

        const nextMessages = [...syncedMessages];
        const lastMessage = nextMessages[nextMessages.length - 1];

        if (lastMessage?.role === 'assistant') {
          lastMessage.actionPlan = Array.isArray(response.action_plan) ? response.action_plan : [];
          lastMessage.clarifyingQuestions = Array.isArray(response.clarifying_questions) ? response.clarifying_questions : [];
          lastMessage.confidence = typeof response.confidence === 'number' ? response.confidence : null;
          lastMessage.disclaimer = response.disclaimer || '';
        }

        return nextMessages;
      });
      setObligations(Array.isArray(response.obligations) ? response.obligations : []);
      setCitations(Array.isArray(response.citations) ? response.citations : []);
    } catch (messageError) {
      setError(messageError?.message || `Не удалось получить ответ от API. Проверь, что backend запущен по адресу ${apiUrl}.`);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div style={styles.page}>
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
              type="button"
            >
              {scenarios[key].label}
            </button>
          ))}
        </div>
      </header>

      <div style={styles.body}>
        <main
          style={{
            ...styles.center,
            ...(isSidebarOpen && !isNarrowScreen ? styles.centerWithSidebar : {}),
          }}
        >
          <ChatMock
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSendMessage}
            isConnecting={isCreatingSession}
            isSending={isSending}
            isSessionReady={isSessionReady}
            error={error}
          />
        </main>
      </div>

      <aside
        style={{
          ...styles.sidebar,
          ...(isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed),
          ...(isNarrowScreen ? styles.sidebarNarrow : {}),
        }}
      >
        <button
          onClick={() => setIsSidebarOpen((current) => !current)}
          style={{
            ...styles.sidebarArrow,
            ...(isSidebarOpen ? styles.sidebarArrowOpen : styles.sidebarArrowClosed),
          }}
          type="button"
          aria-label={isSidebarOpen ? 'Закрыть боковую панель' : 'Открыть боковую панель'}
          title={isSidebarOpen ? 'Закрыть боковую панель' : 'Открыть боковую панель'}
        >
          {isSidebarOpen ? '→' : '←'}
        </button>

        {isSidebarOpen ? (
          <div style={styles.sidebarSurface}>
            <div style={styles.sidebarTabs}>
              <button
                onClick={() => setSidebarTab('profile')}
                style={{
                  ...styles.sidebarTab,
                  ...(sidebarTab === 'profile' ? styles.sidebarTabActive : {}),
                }}
                type="button"
              >
                Профиль
              </button>
              <button
                onClick={() => setSidebarTab('summary')}
                style={{
                  ...styles.sidebarTab,
                  ...(sidebarTab === 'summary' ? styles.sidebarTabActive : {}),
                }}
                type="button"
              >
                Сводка
              </button>
            </div>

            <div style={styles.sidebarContent}>
              {sidebarTab === 'profile' ? (
                <ProfileMock profile={profile} />
              ) : (
                <ObligationsMock obligations={obligations} citations={citations} />
              )}
            </div>
          </div>
        ) : null}
      </aside>
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
    position: 'relative',
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
    flexWrap: 'wrap',
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
    flex: 1,
    padding: 20,
    width: '100%',
    boxSizing: 'border-box',
  },
  center: {
    width: '100%',
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'calc(100vh - 128px)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  centerWithSidebar: {
    marginRight: 388,
  },
  sidebar: {
    position: 'fixed',
    top: 106,
    right: 0,
    bottom: 20,
    zIndex: 20,
    display: 'flex',
    alignItems: 'flex-start',
    pointerEvents: 'none',
  },
  sidebarOpen: {
    width: 372,
  },
  sidebarClosed: {
    width: 44,
  },
  sidebarNarrow: {
    top: 126,
    bottom: 12,
    width: 'min(100vw, 360px)',
  },
  sidebarArrow: {
    pointerEvents: 'auto',
    width: 44,
    minWidth: 44,
    height: 44,
    borderRadius: 12,
    border: '1px solid #d9dce3',
    background: '#ffffff',
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  sidebarArrowOpen: {
    marginRight: 12,
  },
  sidebarArrowClosed: {
    marginRight: 0,
  },
  sidebarSurface: {
    pointerEvents: 'auto',
    flex: 1,
    height: '100%',
    borderRadius: '16px 0 0 16px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#ffffff',
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.16)',
    border: '1px solid #e5e7eb',
    borderRight: 'none',
  },
  sidebarTabs: {
    display: 'flex',
    gap: 8,
    padding: 14,
    borderBottom: '1px solid #eceff4',
    background: '#f8fafc',
  },
  sidebarTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    border: '1px solid #d9dce3',
    background: '#ffffff',
    color: '#344054',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  sidebarTabActive: {
    background: '#1a1a2e',
    color: '#ffffff',
    border: '1px solid #1a1a2e',
  },
  sidebarContent: {
    flex: 1,
    overflowY: 'auto',
    padding: 14,
    background: '#f5f7fb',
  },
};
