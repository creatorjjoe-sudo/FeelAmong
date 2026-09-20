import React from 'react'
import { ICONS } from '../../assets/icons'
import '../../styles/components/createpost/formbody.css'

function FormBody() {

  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')

  const handleShare = event => {
    event.preventDefault()
  }

  return <div className="create-container">
    <div className="left-els"></div>

    <div className="right-els">
      <div className="form-container">
        <form action="" className="post-form">
          <h2>Enter details</h2>

          <div className="title-container">
            <p className="option-text">Title</p>
            <input onChange={(e) => setTitle(e.target.value)} type="text" name="" id="" placeholder='Add title here...' />
            <p className="value-length">{title.length} / 100</p>
          </div>

          <div className="description-container">
            <p className="option-text">Description</p>
            <textarea cols={'30'} rows={'4'} onChange={(event) => setDescription(event.target.value)} name="" id="" placeholder='Tell more details about this post...' style={{ resize: 'none' }}></textarea>
            <p className="value-length">{description.length} / 1000</p>
          </div>

          <input type="file" accept='image' id='upload-button' />
          <div className="upload-button-area">
            <label htmlFor="upload-button">Add photo</label>
              <img src={ICONS.addPhoto} alt="" />
          </div>

          <div className="visibility">
            <div className="upper">
              <p className='option-text'>Visibility</p>
              <img src={ICONS.arrowDown} alt="" />
            </div>
            <div className="lower">
              <p className="option-value">Public</p>
              <img src={ICONS.publicIcon} alt="" />
            </div>
          </div>

          <div className="tag-people">
            <p className="option-text">People</p>
            <p className="option-value">You have not tagged anyone yet!</p>
          </div>

          <div className="settings">
            <img src={ICONS.more} alt="" />
            <p className="option-text">More settings</p>
          </div>

          <button onClick={handleShare} className="share-btn">
            Share
          </button>
        </form>

      </div>
    </div>
  </div>
}

export default FormBody