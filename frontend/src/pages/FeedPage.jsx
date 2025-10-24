import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import api from '../services/api';

function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get('/content/feed')
      .then(res => setPosts(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="feed-container">
      <Navbar onNewPost={() => setShowModal(true)} />
      <div className="feed-content">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {showModal && <CreatePostModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

export default FeedPage;