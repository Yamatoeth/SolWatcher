// Client API pour communiquer avec nos serverless functions
// Remplace les appels directs à Helius et Supabase

export interface ApiRequest {
  method: string;
  params?: any[];
  id?: number;
  endpoint?: 'rpc' | 'das';
}

export interface SupabaseRequest {
  method: string;
  path: string;
  data?: any;
  options?: {
    headers?: Record<string, string>;
    params?: Record<string, any>;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // En développement, utiliser l'URL du serveur de développement
    // En production, Vercel gère automatiquement les routes /api
    this.baseUrl = import.meta.env.DEV ? 'http://localhost:8080/api' : '/api';
  }

  // Méthode pour appeler Helius via notre proxy
  async callHelius(request: ApiRequest): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/helius`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.result || data;
    } catch (error) {
      console.error('Error calling Helius API:', error);
      throw error;
    }
  }

  // Méthode pour appeler Helius DAS via notre proxy (GET)
  async callHeliusDas(params: Record<string, string>): Promise<any> {
    try {
      const searchParams = new URLSearchParams(params);
      const response = await fetch(`${this.baseUrl}/helius?endpoint=das&${searchParams}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Helius DAS API:', error);
      throw error;
    }
  }

  // Méthode pour appeler Supabase via notre proxy
  async callSupabase(request: SupabaseRequest): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/supabase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Supabase API:', error);
      throw error;
    }
  }

  // Méthode pour appeler Supabase via notre proxy (GET)
  async callSupabaseGet(path: string, params?: Record<string, any>): Promise<any> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('path', path);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(`${this.baseUrl}/supabase?${searchParams.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Supabase API:', error);
      throw error;
    }
  }
}

// Exporter une instance unique du client
export const apiClient = new ApiClient();

// Fonctions utilitaires pour les appels courants
export const heliusRpc = {
  getBalance: (address: string) => 
    apiClient.callHelius({
      method: 'getBalance',
      params: [address, { commitment: 'confirmed' }],
    }),

  getAccountInfo: (address: string) =>
    apiClient.callHelius({
      method: 'getAccountInfo',
      params: [address, { commitment: 'confirmed' }],
    }),

  getSignaturesForAddress: (address: string, limit: number = 20) =>
    apiClient.callHelius({
      method: 'getSignaturesForAddress',
      params: [address, { limit, commitment: 'confirmed' }],
    }),

  getTransaction: (signature: string) =>
    apiClient.callHelius({
      method: 'getTransaction',
      params: [signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }],
    }),
};

export const heliusDas = {
  getAssetsByOwner: (ownerAddress: string, limit: number = 100, page: number = 1) =>
    apiClient.callHeliusDas({
      ownerAddress,
      limit: limit.toString(),
      page: page.toString(),
    }),

  getAsset: (id: string) =>
    apiClient.callHeliusDas({ id }),
};

export const supabaseApi = {
  // Exemple pour une table 'users'
  getUsers: () =>
    apiClient.callSupabaseGet('users'),

  getUser: (id: string) =>
    apiClient.callSupabaseGet('users', { id: `eq.${id}` }),

  createUser: (data: any) =>
    apiClient.callSupabase({
      method: 'POST',
      path: 'users',
      data,
    }),

  updateUser: (id: string, data: any) =>
    apiClient.callSupabase({
      method: 'PATCH',
      path: 'users',
      data,
      options: {
        params: { id: `eq.${id}` },
      },
    }),

  deleteUser: (id: string) =>
    apiClient.callSupabase({
      method: 'DELETE',
      path: 'users',
      options: {
        params: { id: `eq.${id}` },
      },
    }),
};
