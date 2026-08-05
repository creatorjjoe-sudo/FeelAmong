import React from 'react';

const MessageStream = ({ messages, currentUserId, messageEndRef }) => {
  
  const formatSmartTimestamp = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const past = new Date(dateString);
    const msDifference = now - past;
    
    const minsAgo = Math.floor(msDifference / 60000);

    const formatTimeStr = (d) => {
      let hours = d.getHours();
      let minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutes}${ampm}`;
    };

    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (minsAgo < 1) return 'Just now';
    if (minsAgo === 1) return '1 min';
    if (minsAgo < 60) return `${minsAgo} mins`;

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayMidnight = new Date(todayMidnight.getTime() - 86400000);
    const sevenDaysAgoMidnight = new Date(todayMidnight.getTime() - (7 * 86400000));

    if (past >= todayMidnight) {
      return formatTimeStr(past);
    }
    if (past >= yesterdayMidnight && past < todayMidnight) {
      return `Yesterday-${formatTimeStr(past)}`;
    }
    if (past >= sevenDaysAgoMidnight) {
      return `${daysShort[past.getDay()]}-${formatTimeStr(past)}`;
    }
    return `${daysShort[past.getDay()]} ${monthsShort[past.getMonth()]} ${past.getDate()}, ${past.getFullYear()}-${formatTimeStr(past)}`;
  };

  return (
    <div className="message-stream">
      {messages.map((msg, index) => {
        const currentMsgTime = new Date(msg.createdAt);
        
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const isSameUserAsPrev = prevMsg && prevMsg.sender === msg.sender;
        const isWithinOneMinuteOfPrev = prevMsg && (currentMsgTime - new Date(prevMsg.createdAt)) <= 60000;
        const isConnectedToPrev = isSameUserAsPrev && isWithinOneMinuteOfPrev;

        const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
        const isSameUserAsNext = nextMsg && nextMsg.sender === msg.sender;
        const isWithinOneMinuteOfNext = nextMsg && (new Date(nextMsg.createdAt) - currentMsgTime) <= 60000;
        const isConnectedToNext = isSameUserAsNext && isWithinOneMinuteOfNext;

        let clusterPosition = 'single';
        if (isConnectedToPrev && isConnectedToNext) {
          clusterPosition = 'middle';
        } else if (!isConnectedToPrev && isConnectedToNext) {
          clusterPosition = 'first';
        } else if (isConnectedToPrev && !isConnectedToNext) {
          clusterPosition = 'last';
        }

        const isMe = msg.sender === currentUserId;
        const showTimestamp = clusterPosition === 'last' || clusterPosition === 'single';

        return (
          <div 
            key={msg._id} 
            className={`message-row ${isMe ? 'sent' : 'received'}`}
            style={{ 
              marginTop: isConnectedToPrev ? '-12px' : '0px',
              flexDirection: 'column',
              alignItems: isMe ? 'flex-end' : 'flex-start' /* Forces child elements to stick strictly to their sides */
            }}
          >
            {/* Uniform text bubble bubble alignment */}
            <div 
              className={`msg-bubble ${isMe ? 'sent' : 'received'} ${clusterPosition}`}
              style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
            >
              {msg.text}
            </div>
            
            {showTimestamp && (
              <span style={{
                fontSize: '11px',
                color: '#797775',
                marginTop: '4px',
                marginBottom: '8px',
                fontWeight: '500',
                alignSelf: isMe ? 'flex-end' : 'flex-start', /* Keeps timestamps bound right below their bubble edges */
                padding: isMe ? '0 10px 0 0' : '0 0 0 10px'
              }}>
                {formatSmartTimestamp(msg.createdAt)}
              </span>
            )}
          </div>
        );
      })}
      <div ref={messageEndRef} />
    </div>
  );
};

export default MessageStream;
