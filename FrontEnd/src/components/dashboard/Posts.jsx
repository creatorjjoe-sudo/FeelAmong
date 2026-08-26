import React from 'react'
import '../../styles/components/dashboard/posts.css'
import { ICONS } from '../../assets/icons'

const postsdata = [
 { 
  creator: 'Alice James', timago: '2h', id: 1, title: 'My Life is Important', description: 'I was almost killed on my way to the village!', color: '#515151', engagements: {likes: 20.2, comments: 1.1, shares: 233, saves: 712} 
 },

 { 
  creator: 'Joseph Peter', timago: '16h', id: 2, title: 'Understanding Relationship', description: 'This is the only way to protect your relationship', color: '#f58787', 
  engagements: {likes: 323, comments: 11, shares: 14, saves: 3}
  },
 
 { 
  creator: 'Albert Tom', timago: '2d', id: 3, title: 'Confront Your Enemies', description: 'The reason why you are still under your enemy is because you dont want to die', color: '#87c0f5',
   engagements: {likes: 655, comments: 433, shares: 34, saves: 12}
  },
]

function Posts() {
 return (
  <div className="post-container">
   {postsdata.map((post) =>

    <div className='post-wrapper'>
     <div className="left-items">
      <div className="post-header">
       <div className="creator-avata"><img className='creator-icon' src={ICONS.userIcon} alt="" /></div>

       <div className="right-items">
        <div className="creator-details"><h2>{post.creator}</h2> <p>Add friend</p></div>
        <div className="post-createdat">
         <p>{post.timago}</p>
        </div>
       </div>


      </div>
      <div className="top"></div>
      <div className="middle">
       <p>Title: {post.title}</p>
       <div className="signgle-image" style={{ background: post.color }}></div>
       <p>Description: {post.description}</p>
      </div>
      <div className="bottom"></div>
     </div>
     <div className="right-items e">

      <div className="engage-folder">
       <img src={ICONS.like} alt="" />
       <p className='engage-count'>{post.engagements.likes}K</p>
      </div>
      <div className="engage-folder">
       <img src={ICONS.comment} alt="" />
       <p className='engage-count'>{post.engagements.comments}K</p>
      </div>
      <div className="engage-folder">
       <img src={ICONS.share} alt="" />
       <p className='engage-count'>{post.engagements.shares}</p>
      </div>
      <div className="engage-folder">
       <img src={ICONS.save} alt="" />
       <p className='engage-count'>{post.engagements.saves}</p>
      </div>
      <div className="engage-folder">
       <img src={ICONS.more} alt="" />
      </div>

     </div>
    </div>
   )}
  </div>
 )
}

export default Posts