import "./ChatBubble.css";

type ChatBubbleProps = {
  text: string;
  onClose?: () => void;
};

const ChatBubble = ({ text, onClose }: ChatBubbleProps) => {
  return (
    <div className="chat-bubble" role="status" aria-live="polite">
      {onClose ? (
        <button className="chat-bubble__close" type="button" onClick={onClose} aria-label="Close message">
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
      <span className="chat-bubble__text">{text}</span>
      <span className="chat-bubble__tail" aria-hidden="true" />
    </div>
  );
};

export default ChatBubble;
