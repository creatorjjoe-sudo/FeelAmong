import React from 'react'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/message.css'

function Messages() {

  const [chatActive, setChatActive] = React.useState(false)
  const [windWidth, setWindWidth] = React.useState(window.innerWidth)

  React.useEffect(() => {
    const handleResize = () => {
      setWindWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  },[])

  const middleClassName = windWidth < 800 && chatActive ? 'middle-section-mobile' : windWidth > 800 && chatActive ? 'middle-section-desk' : 'middle-section'

  const leftClassName = windWidth < 800 && chatActive ? 'left-section-active' : 'left-section'

  const handleSend = (e) => {
    e.preventDefault()
  }

  const handleSelect = () => {
    setChatActive(true)
  }
  return (
    <div className='chat-cover'>
      <div className="padder"></div>
      <div className="main-screen">

        <div className={leftClassName}>
          <h1>Chats</h1>
          <div className="user-cover" onClick={handleSelect}>
             <div className="user-avata-msg"></div>
            <div className="user-container">
             
              <div className="user-username">
                <h2 className='username'>Precious Philip</h2>
                <p className='msg-body'>Where are you?</p>
              </div>
              <p className="msg-unread">1</p>
            </div>
          </div>
        </div>

         <div className={middleClassName}>
          <h2 className="msg-container">No user is selected</h2>
          <form action="" className='msg-composer' onSubmit={handleSend}>
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
            {chatActive && 
            <>
            <h1>Precious Philip</h1>
            <button>Add friend</button>
            <p>1.8K</p>
            </>
            }

            {!chatActive && <h1>Last chatted user:</h1>}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Messages