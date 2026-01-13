export const selectAuthUser    = (s) => s.auth.user;
export const selectAuthToken   = (s) => s.auth.token;
export const selectAuthLoading = (s) => s.auth.loading;
export const selectAuthError   = (s) => s.auth.error;
export const selectIsAuthed    = (s) => Boolean(s.auth.token);
