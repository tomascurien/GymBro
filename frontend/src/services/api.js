
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/users/register', data),
  login: (data) => api.post('/users/login', data),

};

// Posts endpoints
export const postsAPI = {
  getFeed: () => api.get(`/posts/feed`),
  getFollowingFeed: () => api.get(`/posts/following`),
  getUserPosts: (username) => api.get(`/posts/user/${username}`),
  createPost: (data) => api.post('/posts', data),
  deletePost: (postId) => api.delete(`/posts/${postId}`),
  // No hay like por ahora
};

//Ejercicios endpoints
export const exercisesAPI = {
  getAllExercises: () => api.get('/exercises'),
};

//Rutinas endpoints
export const routinesAPI = {
  getUserRoutines: (username) => api.get(`/routines/user/${username}`),
  createRoutine: (routineData) => api.post('/routines', routineData),
  deleteRoutine: (routineId) => api.delete(`/routines/${routineId}`),
  getFavorites: (username) => api.get(`/routines/user/${username}/favorites`),
  addFavorite: (routineId) => api.post(`/routines/${routineId}/favorite`),
  removeFavorite: (routineId) => api.delete(`/routines/${routineId}/favorite`),
};

// Users endpoints
export const usersAPI = {
  getProfile: (username) => {
  const token = localStorage.getItem('token');
  return api.get(`/users/profile/${username}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
},
  followUser: async (userId) => {
    try {
      const res = await api.post(`/users/${userId}/follow`);
      return res; // → Devuelve { message, isFollowing: true }
    } catch (err) {
      console.error("Error al seguir al usuario:", err);
      throw err;
    }
  },
  unfollowUser: async (userId) => {
    try {
      const res = await api.delete(`/users/${userId}/follow`);
      return res; // → Devuelve { message, isFollowing: false }
    } catch (err) {
      console.error("Error al dejar de seguir:", err);
      throw err;
    }
  },
  updateProfile: (profileData) => api.put(`/users/profile`, profileData),
  // No hay search por ahora
};

export default api;