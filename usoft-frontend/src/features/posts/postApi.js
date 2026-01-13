import {
  apiGet,
  apiPost,
  apiDelete,
  apiPatch,
} from "../../shared/lib/apiClient";

export const getPostById = (id) => apiGet(`/api/posts/${id}`);
export const getPostCategories = (id) => apiGet(`/api/posts/${id}/categories`);
export const listPostComments = (id) => apiGet(`/api/posts/${id}/comments`);

export const updatePostStatus = (postId, status) =>
  apiPatch(`/api/posts/${postId}`, { status });

export const listPostReactions = (postId) =>
  apiGet(`/api/posts/${postId}/like`, { _: Date.now() });

export const likePost = (postId, type) =>
  apiPost(`/api/posts/${postId}/like`, { type });

export const unlikePost = (postId) => apiDelete(`/api/posts/${postId}/like`);

export const addFavoritePost = (postId) =>
  apiPost(`/api/posts/${postId}/favorite`);
export const removeFavoritePost = (postId) =>
  apiDelete(`/api/posts/${postId}/favorite`);
export const listUserFavorites = (userId) =>
  apiGet(`/api/users/${userId}/favorites`, { _: Date.now() });

export const createComment = (postId, content) =>
  apiPost(`/api/comments`, { postId, content });

export const deleteComment = (commentId) =>
  apiDelete(`/api/comments/${commentId}`);

export const listCommentReactions = (commentId) =>
  apiGet(`/api/comments/${commentId}/like`, { _: Date.now() });

export const likeComment = (commentId, type) =>
  apiPost(`/api/comments/${commentId}/like`, { type });

export const unlikeComment = (commentId) =>
  apiDelete(`/api/comments/${commentId}/like`);

export async function countPostComments(postId) {
  const list = await listPostComments(postId);
  return Array.isArray(list) ? list.length : 0;
}

export const adminListCommentsByPost = (postId) =>
  apiGet(`/api/admin/comments`, { postId, _: Date.now() });

export const adminSetCommentStatus = (commentId, status) =>
  apiPatch(`/api/admin/comments/${commentId}/status`, { status });

export const setMyCommentStatus = (commentId, status) =>
  apiPatch(`/api/comments/${commentId}`, { status });
