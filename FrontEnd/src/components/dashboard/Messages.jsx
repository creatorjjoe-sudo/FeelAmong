import React from 'react'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/message.css'

function Messages() {

  const handleSend = (e) => {
    e.preventDefault()
  }
  return (
    <div className='chat-cover'>
      <div className="padder"></div>
      <div className="main-screen">
        <div className="left-section">
          <h1>Chats</h1>
          <div className="user-cover">
            <div className="user-container">
              <div className="user-avata-msg"></div>
              <div className="user-username">
                <h2 className='username'>Precious Philip</h2>
                <p className='msg-body'>Where are you?</p>
              </div>
              <p className="msg-unread">1</p>
            </div>
          </div>
        </div>

        <div className="middle-section">
          <div className="msg-container">No user is selected</div>
          <form action="" className="msg-composer" onSubmit={handleSend}>
            <img className='attach-icon plus' src={ICONS.pluscircle} alt="" />
            <img className='attach-icon mic' src={ICONS.micGreen} alt="" />
            <div className="input-container">
              <textarea type="text" placeholder='Write message...' ></textarea>
              <button className='send-btn'>Send</button>
            </div>
          </form>
        </div>

        <div className="right-section">
          <div className="chat-user-avata"></div>
          <div className="username-egts">
            <h1>Precious Philip</h1>
            <button>Add friend</button>
            <p>1.8K</p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Messages