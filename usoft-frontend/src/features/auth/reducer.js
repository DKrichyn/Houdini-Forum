import {
  AUTH_START,
  AUTH_SUCCESS,
  AUTH_ERROR,
  AUTH_LOGOUT,
  AUTH_SET_USER,
} from "./actions";

const initial = { user: null, token: "", loading: false, error: null };

export default function authReducer(state = initial, action) {
  switch (action.type) {
    case AUTH_START:
      return { ...state, loading: true, error: null };

    case AUTH_SUCCESS:
      return {
        ...state,
        loading: false,
        user:
          action.payload.user !== undefined ? action.payload.user : state.user,
        token:
          action.payload.token !== undefined
            ? action.payload.token
            : state.token,
      };

    case AUTH_ERROR:
      return { ...state, loading: false, error: action.error || "Error" };

    case AUTH_LOGOUT:
      return { user: null, token: "", loading: false, error: null };

    case AUTH_SET_USER:
      return { ...state, user: action.payload || null };

    default:
      return state;
  }
}
