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
      <div className="login-prompt__message">
        <p className="login-prompt__status">Please login to save progress</p>
        {onClose ? (
          <button className="login-prompt__close" type="button" onClick={onClose}>
            X
          </button>
        ) : null}
      </div>
      <a className="login-prompt__button" href="/.auth/login/github">
        Login to Save
      </a>
    </div>
  );
};

export default LoginPrompt;
