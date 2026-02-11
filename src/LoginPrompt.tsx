import "./LoginPrompt.css";

export type ClientPrincipal = {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
};

type LoginPromptProps = {
  clientPrincipal?: ClientPrincipal | null;
  onClose?: () => void;
};

const LoginPrompt = ({ clientPrincipal, onClose }: LoginPromptProps) => {
  if (clientPrincipal) {
    return <p className="login-prompt__status">Game Saved to Cloud</p>;
  }

  return (
    <div className="login-prompt">
      <div className="login-prompt__panel">
        <div className="login-prompt__message">
          <p className="login-prompt__status">Please login to save progress</p>
          {onClose ? (
            <button className="login-prompt__close" type="button" onClick={onClose} aria-label="Close">
              <svg className="login-prompt__close-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4Z" />
              </svg>
            </button>
          ) : null}
        </div>
        <a className="login-prompt__button" href="/.auth/login/google">
          Login with Google
        </a>
      </div>
    </div>
  );
};

export default LoginPrompt;
