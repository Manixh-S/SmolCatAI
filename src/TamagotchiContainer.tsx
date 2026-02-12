import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react";
import "./TamagotchiContainer.css";
import ChatBubble from "./ChatBubble";
import getCatResponse from "./getCatResponse";
import LoginPrompt from "./LoginPrompt";
import type { ClientPrincipal } from "./LoginPrompt";
import PixelCat from "./PixelCat";
import { sessionId } from "./SessionManager";
import { useCatState } from "./useCatState";

const TamagotchiContainer = () => {
  const normalizeCatName = (value: string) => {
    const trimmed = value.trim().slice(0, 15);
    return trimmed.length > 0 ? trimmed : "SmolCat";
  };

  const { stats, feed, pet, sleep } = useCatState();
  const [catName, setCatName] = useState(() => {
    if (typeof window === "undefined") {
      return "SmolCat";
    }

    const storedName = window.localStorage.getItem("smolcat-name");
    return storedName ? normalizeCatName(storedName) : "SmolCat";
  });
  const [nameDraft, setNameDraft] = useState(catName);
  const [nameEditing, setNameEditing] = useState(false);
  const [message, setMessage] = useState("Ready to play");
  const [chatInput, setChatInput] = useState("");
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [clientPrincipal, setClientPrincipal] = useState<ClientPrincipal | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadClientPrincipal = async () => {
      try {
        const response = await fetch("/.auth/me");
        if (!response.ok) {
          return;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          return;
        }

        const data = (await response.json()) as { clientPrincipal?: ClientPrincipal | null };
        if (isMounted && data.clientPrincipal) {
          setClientPrincipal(data.clientPrincipal);
        }
      } catch {
        // Ignore auth lookup failures in local/dev environments.
      }
    };

    loadClientPrincipal();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setBubbleOpen(true);
  }, [message, chatError]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("smolcat-name", catName);
    }
  }, [catName]);

  useEffect(() => {
    if (!nameEditing) {
      setNameDraft(catName);
    }
  }, [catName, nameEditing]);

  const mood = useMemo(() => {
    if (stats.energy <= 20) {
      return "sleeping" as const;
    }

    if (stats.happiness <= 30 || stats.hunger >= 75) {
      return "sad" as const;
    }

    return "happy" as const;
  }, [stats.energy, stats.happiness, stats.hunger]);

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

  const hungerFill = Math.max(0, 100 - stats.hunger);

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
          {loginPromptOpen ? (
            <div className="tama-account__login">
              <LoginPrompt
                clientPrincipal={clientPrincipal}
                onClose={clientPrincipal ? undefined : () => setLoginPromptOpen(false)}
              />
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
                    onClick={startEditingName}
                    aria-label="Edit cat name"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm14.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.88 1.88 3.75 3.75 1.04-1.04Z" />
                    </svg>
                  </button>
                </div>
                <div className="tama-stats">
                  <div className="tama-stat">
                    <span className="tama-stat__label">Hunger</span>
                    <div className="tama-stat__bar">
                      <span className="tama-stat__fill" style={{ width: `${hungerFill}%` }} />
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
                <PixelCat mood={mood} />
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
