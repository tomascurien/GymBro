import React from 'react';
import PostCard from './PostCard';

const ProfilePosts = ({ posts, loading, onPostDeleted, onLikeUpdate }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No hay posts todavía
        </h3>
        <p className="text-gray-500">
          Los posts aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={onPostDeleted}
          onLikeUpdate={onLikeUpdate}
        />
      ))}
    </div>
  );
};

export default ProfilePosts;