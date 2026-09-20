import React from 'react'
import { ICONS } from '../../assets/icons'
import {Link} from 'react-router-dom'
import '../../styles/components/createpost/createpostheader.css'

function CreatePostHeader() {
 return (
  <>
   <title>Create post</title>
   <div className='create-post-header-container'>
    <div className="right-icons">
     <Link to={'/dashboard'}><img src={ICONS.backArrowLong} alt="back" title='back'/></Link>
     <img className='feel-logo' src={ICONS.feelLogo} alt="" />
     <h1>Create post</h1>
    </div>
    <div className="left-icons">
     <div className='user-icon'></div>
    </div>
   </div>
  </>

 )
}

export default CreatePostHeader