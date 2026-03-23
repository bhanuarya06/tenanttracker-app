let accessToken = null;

const tokenManager = {
  getToken: () => accessToken,
  setToken: (token) => { accessToken = token; },
  clearToken: () => { accessToken = null; },
};

export default tokenManager;
