import React from 'react';
import PostCard from './PostCard';
import { useI18n } from '../i18n/I18nContext';

const ProfilePosts = ({ posts, loading, onPostDeleted, onLikeUpdate }) => {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="bg-surface border border-edge rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-display font-semibold text-ink mb-2">
          {t('profile.noPostsTitle')}
        </h3>
        <p className="text-muted">
          {t('profile.noPostsText')}
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
