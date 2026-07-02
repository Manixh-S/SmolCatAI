import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react";
import "./TamagotchiContainer.css";
import ChatBubble from "./ChatBubble";
import getCatResponse from "./getCatResponse";
import LoginPrompt from "./LoginPrompt";
import PixelCat from "./PixelCat";
import RateLimitNotice from "./RateLimitNotice";
import { sessionId } from "./SessionManager";
import { useAuth } from "./useAuth";
import { useCatState } from "./useCatState";

const TamagotchiContainer = () => {
  const normalizeCatName = (value: string) => {
    const trimmed = value.trim().slice(0, 15);
    return trimmed.length > 0 ? trimmed : "SmolCat";
  };

  const { clientPrincipal, isAuthenticated, authChecked } = useAuth();
  const { stats, feed, pet, sleep } = useCatState(isAuthenticated);
  const [catName, setCatName] = useState(() => {
    if (typeof window === "undefined") {
      return "SmolCat";
    }

    const storedName = window.localStorage.getItem("smolcat-name");
    return storedName ? normalizeCatName(storedName) : "SmolCat";
  });
  const [nameDraft, setNameDraft] = useState(catName);
  const [nameEditing, setNameEditing] = useState(false);
  const [skinIndex, setSkinIndex] = useState(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    const storedSkin = window.localStorage.getItem("smolcat-skin");
    const parsed = storedSkin ? Number.parseInt(storedSkin, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [message, setMessage] = useState("Ready to play");
  const [chatInput, setChatInput] = useState("");
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [loginPromptOpen, setLoginPromptOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [rateNoticeDismissed, setRateNoticeDismissed] = useState(false);

  // Shown right after load, but only once the auth check has resolved as
  // anonymous — signed-in users have no message limit, so they never see it.
  const showRateNotice = authChecked && !isAuthenticated && !rateNoticeDismissed;

  useEffect(() => {
    setBubbleOpen(true);
  }, [message, chatError]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("smolcat-name", catName);
    }
  }, [catName]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("smolcat-skin", String(skinIndex));
    }
  }, [skinIndex]);

  useEffect(() => {
    if (!nameEditing) {
      setNameDraft(catName);
    }
  }, [catName, nameEditing]);

  const mood = useMemo(() => {
    if (stats.energy <= 20) {
      return "sleeping" as const;
    }

    if (stats.happiness <= 30 || stats.fullness <= 25) {
      return "sad" as const;
    }

    return "happy" as const;
  }, [stats.energy, stats.happiness, stats.fullness]);

  const handleFeed = () => {
    feed();
    setChatError(null);
    setMessage(getCatResponse("feed", stats));
  };

  const handlePet = () => {
    pet();
    setChatError(null);
    setMessage(getCatResponse("pet", stats));
  };

  const handleSleep = () => {
    sleep();
    setChatError(null);
    setMessage(getCatResponse("sleep", stats));
  };

  const skinCount = 3;

  const handlePrevSkin = () => {
    setSkinIndex((prev) => (prev + skinCount - 1) % skinCount);
  };

  const handleNextSkin = () => {
    setSkinIndex((prev) => (prev + 1) % skinCount);
  };

  const handleChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = chatInput.trim();
    if (!trimmedMessage || chatPending) {
      return;
    }

    setChatPending(true);
    setChatError(null);

    try {
      const outgoingName = normalizeCatName(nameEditing ? nameDraft : catName);
      const response = await fetch("/api/chatWithCat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          catName: outgoingName,
          stats,
          userMessage: trimmedMessage,
        }),
      });

      if (response.status === 429) {
        setChatError("The cat needs a break. Try again in a minute, or sign in.");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to chat");
      }

      const data = (await response.json()) as { text?: string; sessionId?: string };
      setMessage(data.text?.trim() || "...mrow?");
      setChatInput("");
    } catch {
      setChatError("Cat is napping. Try again.");
    } finally {
      setChatPending(false);
    }
  };

  const startEditingName = () => {
    setNameDraft(catName);
    setNameEditing(true);
  };

  const handleEditClick = () => {
    if (nameEditing) {
      saveName();
      return;
    }

    startEditingName();
  };

  const saveName = () => {
    const nextName = normalizeCatName(nameDraft);
    setCatName(nextName);
    setNameDraft(nextName);
    setNameEditing(false);
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveName();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setNameEditing(false);
      setNameDraft(catName);
    }
  };

  return (
    <div className="tama-layout">
      <div className="tama-topbar">
        <div className="tama-account">
          <button
            className="tama-account__button"
            type="button"
            aria-label="Account"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((open) => !open)}
          >
            <svg className="tama-account__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.41 0-8 2.24-8 5v1h16v-1c0-2.76-3.59-5-8-5Z" />
            </svg>
          </button>
          {accountOpen ? (
            <div className="tama-account__panel">
              {clientPrincipal ? (
                <>
                  <p className="tama-account__name">{clientPrincipal.userDetails}</p>
                  <p className="tama-account__meta">Provider: {clientPrincipal.identityProvider}</p>
                  <p className="tama-account__meta">Roles: {clientPrincipal.userRoles.join(", ")}</p>
                </>
              ) : (
                <>
                  <p className="tama-account__meta">Sign in to view account details.</p>
                  <a className="tama-account__signin" href="/.auth/login/google">
                    Sign in
                  </a>
                </>
              )}
            </div>
          ) : null}
          {loginPromptOpen || showRateNotice ? (
            <div className="tama-account__login">
              {loginPromptOpen ? (
                <LoginPrompt
                  clientPrincipal={clientPrincipal}
                  onClose={clientPrincipal ? undefined : () => setLoginPromptOpen(false)}
                />
              ) : null}
              {showRateNotice ? (
                <RateLimitNotice onClose={() => setRateNoticeDismissed(true)} />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="tama-shell">
        <div className="tama-bezel">
          <div className="tama-screen">
            <div className="tama-screen__scanline" />
            <div className="tama-screen__content">
              <div className="tama-screen__header">
                <div className="tama-title">
                  {nameEditing ? (
                    <input
                      className="tama-title__input"
                      type="text"
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      onBlur={saveName}
                      onKeyDown={handleNameKeyDown}
                      maxLength={15}
                      autoFocus
                      aria-label="Cat name"
                    />
                  ) : (
                    <p className="tama-screen__title">{catName}</p>
                  )}
                  <button
                    className="tama-title__edit"
                    type="button"
                    onClick={handleEditClick}
                    aria-label="Edit cat name"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm14.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.88 1.88 3.75 3.75 1.04-1.04Z" />
                    </svg>
                  </button>
                </div>
                <div className="tama-stats">
                  <div className="tama-stat">
                    <span className="tama-stat__label">Food</span>
                    <div className="tama-stat__bar">
                      <span className="tama-stat__fill" style={{ width: `${stats.fullness}%` }} />
                    </div>
                  </div>
                  <div className="tama-stat">
                    <span className="tama-stat__label">Happy</span>
                    <div className="tama-stat__bar">
                      <span className="tama-stat__fill" style={{ width: `${stats.happiness}%` }} />
                    </div>
                  </div>
                  <div className="tama-stat">
                    <span className="tama-stat__label">Energy</span>
                    <div className="tama-stat__bar">
                      <span className="tama-stat__fill" style={{ width: `${stats.energy}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="tama-screen__playfield">
                <div className="tama-bubble">
                  {bubbleOpen ? (
                    <ChatBubble
                      key={chatError ?? message}
                      text={chatError ?? message}
                      onClose={() => setBubbleOpen(false)}
                    />
                  ) : null}
                </div>
                <div className="tama-skin-wrap">
                  <button
                    className="tama-skin tama-skin--prev"
                    type="button"
                    onClick={handlePrevSkin}
                    aria-label="Previous cat skin"
                  >
                    <span aria-hidden="true">&lt;</span>
                  </button>
                  <PixelCat mood={mood} skin={skinIndex} />
                  <button
                    className="tama-skin tama-skin--next"
                    type="button"
                    onClick={handleNextSkin}
                    aria-label="Next cat skin"
                  >
                    <span aria-hidden="true">&gt;</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="tama-controls">
          <button className="tama-button" type="button" onClick={handleFeed}>
            Feed
          </button>
          <button className="tama-button" type="button" onClick={handlePet}>
            Pet
          </button>
          <button className="tama-button" type="button" onClick={handleSleep}>
            Sleep
          </button>
        </div>
        <form className="tama-chat" onSubmit={handleChatSubmit}>
          <input
            className="tama-chat__input"
            type="text"
            placeholder="Ask the cat..."
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            maxLength={120}
            disabled={chatPending}
            aria-label="Chat with the cat"
          />
          <button className="tama-chat__send" type="submit" disabled={chatPending || !chatInput.trim()}>
            {chatPending ? "Sending" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TamagotchiContainer;
