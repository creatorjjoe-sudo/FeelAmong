import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Profile = () => {
 const { user, login } = useContext(AuthContext);
 const navigate = useNavigate();

 // Mode toggling tracks if user is inspecting or editing details text
 const [isEditing, setIsEditing] = useState(false);
 const [username, setUsername] = useState(user?.username || '');
 const [email, setEmail] = useState(user?.email || '');
 const [selectedFile, setSelectedFile] = useState(null);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');

 const handleFileSelectionChange = (e) => {
  setSelectedFile(e.target.files[0]);
 };

 const executeProfileUpdateSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  // Profile updates require multi-part form payloads to transfer binary file data
  const profileFormData = new FormData();
  profileFormData.append('username', username);
  profileFormData.append('email', email);
  if (selectedFile) {
   profileFormData.append('profilePic', selectedFile);
  }

  try {
   const res = await fetch('http://localhost:8000/api/auth/profile', {
    method: 'PUT',
    headers: {
     'Authorization': `Bearer ${user.token}`
     // Note: Leave Content-Type blank so the browser configures multi-part form boundaries automatically!
    },
    body: profileFormData
   });

   const updatedData = await res.json();
   if (!res.ok) throw new Error(updatedData.message || 'Profile modification update rejected');

   // Re-hydrate state context profile data locally inside localStorage records maps
   login({ ...user, ...updatedData });
   setSuccess('Profile modified successfully!');
   setIsEditing(false);
  } catch (err) {
   setError(err.message);
  }
 };

 const imageSrcUrl = user?.profilePic ? `http://localhost:8000${user.profilePic}` : null;

 return (
  <div className="profile-container">
   <button
    style={{ float: 'left', background: 'none', border: 'none', color: '#0078d4', cursor: 'pointer', fontWeight: '500' }}
    onClick={() => navigate('/')}
   >
    ← Back to Chats
   </button>
   <div style={{ clear: 'both' }} />

   <h2 style={{ margin: '15px 0 20px 0' }}>User Profile</h2>
   {error && <div className="auth-error">{error}</div>}
   {success && <div className="status-badge online" style={{ marginBottom: '15px', display: 'block' }}>{success}</div>}

   {/* Profile Image Node Block Layout Element Rendering */}
   {imageSrcUrl ? (
    <img src={imageSrcUrl} alt="Avatar" className="profile-avatar-frame" />
   ) : (
    <div className="profile-fallback-avatar">
     {user?.username?.charAt(0).toUpperCase()}
    </div>
   )}

   {!isEditing ? (
    /* Profile Inspection Template Mode Panel */
    <div>
     <div className="profile-details-block">
      <p><strong>Username:</strong> {user?.username}</p>
      <p><strong>Email Identity:</strong> {user?.email}</p>
     </div>
     <button className="edit-action-btn" onClick={() => setIsEditing(true)}>Edit Profile Details</button>
    </div>
   ) : (
    /* Profile Configuration Input Edit Mode Form Modification Layout Panel Template */
    <form onSubmit={executeProfileUpdateSubmit} encType="multipart/form-data">
     <div className="form-group" style={{ textAlign: 'left' }}>
      <label>Change Profile Image</label>
      <label className="file-upload-label">
       Choose Image File...
       <input type="file" accept="image/*" onChange={handleFileSelectionChange} style={{ display: 'none' }} />
      </label>
      {selectedFile && <p style={{ fontSize: '13px', color: '#555' }}>Selected: {selectedFile.name}</p>}
     </div>

     <div className="form-group" style={{ textAlign: 'left' }}>
      <label>Edit Username</label>
      <input type="text" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
     </div>

     <div className="form-group" style={{ textAlign: 'left' }}>
      <label>Edit Email Address</label>
      <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
     </div>

     <div style={{ marginTop: '20px' }}>
      <button type="submit" className="edit-action-btn">Save Changes</button>
      <button type="button" className="edit-action-btn cancel" onClick={() => setIsEditing(false)}>Cancel</button>
     </div>
    </form>
   )}
  </div>
 );
};

export default Profile;
