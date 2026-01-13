import React from "react";
import "./MasonryFeed.css";
import PostCard from "./PostCard";

export default function MasonryFeed({ items = [] }) {
  if (!items.length) {
    return <div className="feed-empty">No posts found.</div>;
  }

  return (
    <div className="feed-list">
      {items.map((post) => (
        <div key={post.id} className="feed-item">
          <PostCard post={post} />
        </div>
      ))}
    </div>
  );
}
