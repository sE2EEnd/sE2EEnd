import api from './http';

export interface ThemeConfig {
  appName: string;
  logoUrl: string;
  requireAuthForDownload: boolean;
  colors: {
    primaryFrom: string;
    primaryTo: string;
    primaryAccent: string;
    primaryHex: string;
    primaryDarkHex: string;
    primaryLightHex: string;
  };
}

export interface SendPolicy {
  requireSendPassword: boolean;
}

export const configApi = {
  getThemeConfig: async (): Promise<ThemeConfig> => {
    const response = await api.get('/config/theme');
    return response.data;
  },

  getSendPolicy: async (): Promise<SendPolicy> => {
    const response = await api.get('/config/send-policy');
    return response.data;
  },
};
