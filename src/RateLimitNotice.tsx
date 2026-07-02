import "./RateLimitNotice.css";

type RateLimitNoticeProps = {
  onClose: () => void;
};

/**
 * Compact notice shown on page load for anonymous visitors, stacked below
 * the login prompt in the top-right corner. Warns that guest chat is
 * limited to 5 messages per minute; dismissed with the X button.
 * The parent only renders this after the auth check resolves as anonymous,
 * so signed-in users never see it.
 */
const RateLimitNotice = ({ onClose }: RateLimitNoticeProps) => {
  return (
    <div className="rate-notice" role="status">
      <div className="rate-notice__panel">
        <p className="rate-notice__message">
          Guest mode: only 5 chat messages per minute. Sign in for unlimited chat.
        </p>
        <button className="rate-notice__close" type="button" onClick={onClose} aria-label="Close">
          <svg className="rate-notice__close-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4Z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default RateLimitNotice;
