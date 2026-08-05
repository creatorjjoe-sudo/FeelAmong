import React from 'react';

const MessageInputBar = ({ typedMessage, onChange, onSubmit }) => {
  return (
    <form className="chat-input-bar" onSubmit={onSubmit}>
      <input 
        type="text" 
        placeholder="Type your message here..." 
        value={typedMessage}
        onChange={onChange}
        required
      />
      <button type="submit" className="chat-send-btn">Send</button>
    </form>
  );
};

export default MessageInputBar;
