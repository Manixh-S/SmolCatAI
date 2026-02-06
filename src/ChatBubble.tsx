import "./ChatBubble.css";

type ChatBubbleProps = {
  text: string;
};

const ChatBubble = ({ text }: ChatBubbleProps) => {
  return (
    <div className="chat-bubble" role="status" aria-live="polite">
      <span className="chat-bubble__text">{text}</span>
      <span className="chat-bubble__tail" aria-hidden="true" />
    </div>
  );
};

export default ChatBubble;
