import api from './api';

export const notificationPreferencesAPI = {
  // Get user's notification preferences
  getPreferences: async () => {
    const response = await api.get('/notifications/preferences');
    return response;
  },

  // Update all preferences
  updatePreferences: async (preferences: any) => {
    const response = await api.put('/notifications/preferences', preferences);
    return response;
  },

  // Update specific category
  updateCategory: async (category: string, data: any) => {
    const response = await api.patch(`/notifications/preferences/${category}`, data);
    return response;
  },

  // Reset to defaults
  resetPreferences: async () => {
    const response = await api.post('/notifications/preferences/reset');
    return response;
  },

  // Test notification
  testNotification: async (type?: string, channel?: string) => {
    const response = await api.post('/notifications/test', { type, channel });
    return response;
  }
};
