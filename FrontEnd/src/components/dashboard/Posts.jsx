import React from 'react'
import '../../styles/components/dashboard/posts.css'
import { ICONS } from '../../assets/icons'
import { PROFILES } from '../../assets/profiles'
import postsdata from './postsdata'

function Posts() {
  const [userId, setUserId] = React.useState()
  const [posts, setPosts] = React.useState(postsdata)

  React.useEffect(() => {
    setUserId('user_' + Math.random().toString(36).substring(2, 9))
  }, [])

  function toggleLike(id) {
    if (!userId) return
    setPosts(posts.map(post => {
      if (post.id !== id) return post

      const hasliked = post.likers.includes(userId)

      return { ...post, likers: hasliked ? post.likers.filter(id => id !== userId) : [...post.likers, userId], engagements: { ...post.engagements, likes: hasliked ? post.engagements.likes - 1 : post.engagements.likes + 1 } }
    }))
  }


  return (
    <div className="post-container">
      {posts.map((post) => {

        const isLikedByMe = post.likers.includes(userId)
        return (
          <div key={post.id} className='post-wrapper'>
            <div className="left-items">

              <div className="post-header">

                <div className="header-left-items">
                  <div className="creator-avata">
                    <img className='creator-icon' src={post.avata} alt="" />
                  </div>
                  <div className="creator-details">
                    <h2>{post.creator}</h2>
                    <p className='time-ago'>{post.timago}</p>
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
                  <img src={isLikedByMe ? ICONS.liked : ICONS.like} alt="" />
                </div>
                <p className='engage-count'>{post.engagements.likes}</p>
              </div>
              <div className="engage-folder comments">
                <div className="engage-background">
                  <img src={ICONS.comment} alt="" />
                </div>
                <p className='engage-count'>{post.engagements.comments}K</p>
              </div>
              <div className="engage-folder shares">
                <div className="engage-background">
                  <img src={ICONS.share} alt="" />
                </div>
                <p className='engage-count'>{post.engagements.shares}</p>
              </div>
              <div className="engage-folder saves">
                <div className="engage-background">
                  <img src={ICONS.save} alt="" />
                </div>
                <p className='engage-count'>{post.engagements.saves}</p>
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
  )
}

export default Posts