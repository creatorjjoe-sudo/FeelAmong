import React from 'react'
import '../../styles/components/dashboard/posts.css'
import { ICONS } from '../../assets/icons'
import { PROFILES } from '../../assets/profiles'

function Posts() {
   const baseURL = 'http://localhost:5000/api/posts'

  const [posts, setPosts] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  const getPosts = async () => {
    try {
      const res = await fetch(baseURL)
      if(!res.ok) throw new Error('Error getting post!', res.status)
      const data = await res.json()
      setPosts(data)
    } catch (error) {
      setError(error.messaage)
    } finally {setIsLoading(false)}
  }

  React.useEffect(() => {
    getPosts()
  }, [])
 
  return (
    <div className="posts-wrapper">
      {isLoading && <div>Loading posts...</div>}
      {error && <div>{error}</div>}
          <div className="post-container">
      {posts.map((post) => {

        return (
          <div key={post._id} className='post-wrapper'>
            <div className="left-items">

              <div className="post-header">

                <div className="header-left-items">
                  <div className="creator-avata">
                    <img className='creator-icon' src={post.user} alt="" />
                  </div>
                  <div className="creator-details">
                    <h2></h2>
                    <p className='time-ago'>{post.timestamps}</p>
                  </div>
                </div>

                <div className="header-right-items">
                  <p className='add-friend'>Add friend</p>
                </div>
              </div>

              <div className="top"></div>
              <div className="middle">
                <p>Title: {post.title}</p>
                <div className="signgle-image" style={{ background: post.color }}></div>
                <p>Description: {post.description}</p>
                <div className='liked-users'>
                  <img className='liked-img' src={ICONS.likedusersicon} alt="" />
                  <img className='liked-users-list-img' src={PROFILES.usersliked} alt="" />
                </div>
              </div>

              <div className="bottom"></div>
            </div>
            <div className="right-items e">

              <div onClick={() => toggleLike(post.id)} className="engage-folder likes">
                <div className="engage-background">
                  <img src={ICONS.like} alt="" />
                </div>
                <p className='engage-count'></p>
              </div>
              <div className="engage-folder comments">
                <div className="engage-background">
                  <img src={ICONS.comment} alt="" />
                </div>
                <p className='engage-count'></p>
              </div>
              <div className="engage-folder shares">
                <div className="engage-background">
                  <img src={ICONS.share} alt="" />
                </div>
                <p className='engage-count'></p>
              </div>
              <div className="engage-folder saves">
                <div className="engage-background">
                  <img src={ICONS.save} alt="" />
                </div>
                <p className='engage-count'>{}</p>
              </div>
              <div className="engage-folder">
                <div className="engage-background">
                  <img src={ICONS.more} alt="" />
                </div>
              </div>

            </div>
          </div>)
      }
      )}
    </div>
    </div>
  )
}

export default Posts