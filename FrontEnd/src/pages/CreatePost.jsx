import React from 'react'
import { useSearchParams } from 'react-router-dom'
import CreatePostHeader from '../components/createpost/CreatePostHeader'
import FormBody from '../components/createpost/FormBody'
import '../styles/pages/createpost.css'

function CreatePost() {
  const [searchParams] = useSearchParams()
  const postType = searchParams.get('type') === 'text' ? 'text' : 'image'

  return (
    <div className='post-create-container'>
      <CreatePostHeader />
      <FormBody postType={postType} />
    </div>
  )
}

export default CreatePost