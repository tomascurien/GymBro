import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import ProfileHeader from '../components/ProfileHeader';
import ProfilePosts from '../components/ProfilePosts';
import api from '../services/api';
import { useParams } from 'react-router-dom';

function ProfilePage() {
  const { id } = useParams();
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get(`/users/${id}`).then(res => setUserData(res.data));
    api.get(`/content/user/${id}`).then(res => setPosts(res.data));
  }, [id]);

  if (!userData) return <div>Loading...</div>;

  return (
    <div>
      <Navbar />
      <ProfileHeader user={userData} />
      <ProfilePosts posts={posts} />
    </div>
  );
}

export default ProfilePage;