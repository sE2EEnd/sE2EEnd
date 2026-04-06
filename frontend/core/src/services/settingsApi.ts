import api from './http';

export const settingsApi = {
  getAll: async (): Promise<Record<string, string>> => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  update: async (key: string, value: string): Promise<void> => {
    await api.patch(`/admin/settings/${key}`, { value });
  },
};
