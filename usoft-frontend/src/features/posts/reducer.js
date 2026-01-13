// src/features/posts/reducer.js
import {
  POSTS_FETCH_START,
  POSTS_FETCH_SUCCESS,
  POSTS_FETCH_ERROR,
} from "./actions";

const initial = {
  items: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
};

export default function postsReducer(state = initial, action) {
  switch (action.type) {
    case POSTS_FETCH_START:
      return { ...state, loading: true, error: null };
    case POSTS_FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        items: action.payload?.items || [],
        total: action.payload?.total ?? 0,
        page: action.payload?.page ?? 1,
        limit: action.payload?.limit ?? state.limit,
      };
    case POSTS_FETCH_ERROR:
      return { ...state, loading: false, error: action.error || "Error" };
    default:
      return state;
  }
}
