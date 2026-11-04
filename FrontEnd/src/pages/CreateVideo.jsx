import CreatePostHeader from '../components/createpost/CreatePostHeader'
import CreateVideoForm from '../components/createpost/CreateVideoForm'
import '../styles/pages/createpost.css'

function CreateVideo() {
  return (
    <div className='post-create-container'>
      <CreatePostHeader title="Create video" />
      <CreateVideoForm />
    </div>
  )
}

export default CreateVideo
