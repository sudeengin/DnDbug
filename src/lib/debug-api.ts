// API wrapper with automatic debug logging
import { debug } from '../utils/debug-collector';

interface ApiCallOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = '', defaultTimeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: string,
    options: ApiCallOptions = {}
  ): Promise<T> {
    const { timeout = this.defaultTimeout, retries = 0, ...fetchOptions } = options;
    
    const url = `${this.baseUrl}${endpoint}`;
    const requestData = {
      method,
      ...fetchOptions,
      body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
    };

    debug.apiCall(endpoint, method, requestData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...requestData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      debug.apiCall(endpoint, method, requestData, responseData);
      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      debug.apiCall(endpoint, method, requestData, undefined, error);
      
      // Retry logic
      if (retries > 0 && this.shouldRetry(error)) {
        debug.info('api-client', `Retrying ${method} ${endpoint} (${retries} retries left)`, { error });
        return this.makeRequest<T>(endpoint, method, { ...options, retries: retries - 1 });
      }
      
      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or 5xx status codes
    return (
      error.name === 'AbortError' ||
      (error.message && error.message.includes('HTTP 5'))
    );
  }

  async get<T>(endpoint: string, options: ApiCallOptions = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, 'GET', options);
  }

  async post<T>(endpoint: string, data?: any, options: ApiCallOptions = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, 'POST', {
      ...options,
      body: data,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  async put<T>(endpoint: string, data?: any, options: ApiCallOptions = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, 'PUT', {
      ...options,
      body: data,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  async patch<T>(endpoint: string, data?: any, options: ApiCallOptions = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, 'PATCH', {
      ...options,
      body: data,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  async delete<T>(endpoint: string, options: ApiCallOptions = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, 'DELETE', options);
  }
}

// Create default instance
export const apiClient = new ApiClient();

// Convenience functions
export const api = {
  get: <T>(endpoint: string, options?: ApiCallOptions) => apiClient.get<T>(endpoint, options),
  post: <T>(endpoint: string, data?: any, options?: ApiCallOptions) => apiClient.post<T>(endpoint, data, options),
  put: <T>(endpoint: string, data?: any, options?: ApiCallOptions) => apiClient.put<T>(endpoint, data, options),
  patch: <T>(endpoint: string, data?: any, options?: ApiCallOptions) => apiClient.patch<T>(endpoint, data, options),
  delete: <T>(endpoint: string, options?: ApiCallOptions) => apiClient.delete<T>(endpoint, options),
};

export default apiClient;
