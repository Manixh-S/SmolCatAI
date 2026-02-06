const SESSION_KEY = "smolcat.sessionId";

const getOrCreateSessionId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
};

const sessionId = getOrCreateSessionId();

export { sessionId };
