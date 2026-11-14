import { useSearchParams } from 'react-router-dom'
import CreatePostHeader from '../components/createpost/CreatePostHeader'
import FormBody from '../components/createpost/FormBody'
import TextPostComposer from '../components/createpost/TextPostComposer'
import '../styles/pages/createpost.css'

function CreatePost() {
  const [searchParams] = useSearchParams()
  const editPostId = searchParams.get('edit')
  const isEditingImagePost = Boolean(editPostId) && searchParams.get('type') === 'image'

  return (
    <div className={`post-create-container${isEditingImagePost ? '' : ' text-post-create-container'}`}>
      {isEditingImagePost
        ? <><CreatePostHeader /><FormBody postType="image" editPostId={editPostId} /></>
        : <TextPostComposer editPostId={editPostId} />}
    </div>
  )
}

export default CreatePost