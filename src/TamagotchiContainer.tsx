import { useEffect, useMemo, useState } from "react";
import "./TamagotchiContainer.css";
import ChatBubble from "./ChatBubble";
import getCatResponse from "./getCatResponse";
import LoginPrompt from "./LoginPrompt";
import type { ClientPrincipal } from "./LoginPrompt";
import PixelCat from "./PixelCat";
import { useCatState } from "./useCatState";

const TamagotchiContainer = () => {
  const { stats, feed, pet, sleep } = useCatState();
  const [message, setMessage] = useState("Ready to play");
  const [clientPrincipal, setClientPrincipal] = useState<ClientPrincipal | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(true);

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

  const mood = useMemo(() => {
    if (stats.energy <= 20) {
      return "sleeping" as const;
    }

    if (stats.happiness <= 30 || stats.hunger <= 25) {
      return "sad" as const;
    }

    return "happy" as const;
  }, [stats.energy, stats.happiness, stats.hunger]);

  const handleFeed = () => {
    feed();
    setMessage(getCatResponse("feed", stats));
  };

  const handlePet = () => {
    pet();
    setMessage(getCatResponse("pet", stats));
  };

  const handleSleep = () => {
    sleep();
    setMessage(getCatResponse("sleep", stats));
  };

  return (
    <div className="tama-shell">
      <div className="tama-bezel">
        <div className="tama-screen">
          <div className="tama-screen__scanline" />
          <div className="tama-screen__content">
            <div className="tama-screen__header">
              <p className="tama-screen__title">SmolCat</p>
              {loginPromptOpen ? (
                <LoginPrompt
                  clientPrincipal={clientPrincipal}
                  onClose={clientPrincipal ? undefined : () => setLoginPromptOpen(false)}
                />
              ) : null}
              <div className="tama-stats">
                <div className="tama-stat">
                  <span className="tama-stat__label">Hunger</span>
                  <div className="tama-stat__bar">
                    <span className="tama-stat__fill" style={{ width: `${stats.hunger}%` }} />
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
                <ChatBubble text={message} />
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
    </div>
  );
};

export default TamagotchiContainer;
