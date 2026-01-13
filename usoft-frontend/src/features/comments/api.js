import { apiGet } from "../../shared/lib/apiClient";

export const getPostComments = async (postId) => {
  if (!postId) throw new Error("postId is required");
  return apiGet(`/api/posts/${postId}/comments`);
};

export const getCommentById = async (id) => apiGet(`/api/comments/${id}`);
