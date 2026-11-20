import CreateVideoForm from '../components/createpost/CreateVideoForm'
import '../styles/pages/createpost.css'

function CreateVideo() {
  return (
    <div className="post-create-container text-post-create-container video-post-create-container">
      <title>Create video</title>
      <CreateVideoForm />
    </div>
  )
}

export default CreateVideo
