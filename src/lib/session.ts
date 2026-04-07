const TOKEN_KEY = "ai-job-tracker/token";

export const getStoredToken = () => {
  return window.localStorage.getItem(TOKEN_KEY);
};

export const storeToken = (token: string) => {
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = () => {
  window.localStorage.removeItem(TOKEN_KEY);
};
