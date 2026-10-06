import { useSearchParams } from 'react-router-dom'
import CreatePostHeader from '../components/createpost/CreatePostHeader'
import FormBody from '../components/createpost/FormBody'
import '../styles/pages/createpost.css'

function CreatePost() {
  const [searchParams] = useSearchParams()
  const postType = searchParams.get('type') === 'text' ? 'text' : 'image'
  const editPostId = searchParams.get('edit')

  return (
    <div className='post-create-container'>
      <CreatePostHeader />
      <FormBody postType={postType} editPostId={editPostId} />
    </div>
  )
}

export default CreatePost