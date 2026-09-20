import React from 'react'
import CreatePostHeader from '../components/createpost/CreatePostHeader'
import FormBody from '../components/createpost/FormBody'
import '../styles/pages/createpost.css'

function CreatePost() {
  return (
    <div className='post-create-container'>
      <CreatePostHeader />
      <FormBody />
    </div>
  )
}

export default CreatePost