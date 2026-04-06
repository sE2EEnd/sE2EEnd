import { isAxiosError } from 'axios';

/**
 * Extracts the API error message from an Axios error response body,
 * or returns the provided fallback string.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data?.message) {
    return String(err.response.data.message);
  }
  return fallback;
}
