import { apiClient } from './api-client';

// Client Supabase sécurisé via notre API proxy
class SecureSupabaseClient {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // Sélectionner des données
  async select(columns = '*'): Promise<any[]> {
    try {
      const result = await apiClient.callSupabaseGet(this.tableName);
      return result;
    } catch (error) {
      console.error(`Error selecting from ${this.tableName}:`, error);
      throw error;
    }
  }

  // Insérer des données
  async insert(data: any): Promise<any[]> {
    try {
      const result = await apiClient.callSupabase({
        method: 'POST',
        path: this.tableName,
        data: Array.isArray(data) ? data : [data],
      });
      return result;
    } catch (error) {
      console.error(`Error inserting into ${this.tableName}:`, error);
      throw error;
    }
  }

  // Mettre à jour des données
  async update(data: any, id: string): Promise<any[]> {
    try {
      const result = await apiClient.callSupabase({
        method: 'PATCH',
        path: this.tableName,
        data,
        options: {
          params: { id: `eq.${id}` },
        },
      });
      return result;
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  // Supprimer des données
  async delete(id: string): Promise<void> {
    try {
      await apiClient.callSupabase({
        method: 'DELETE',
        path: this.tableName,
        options: {
          params: { id: `eq.${id}` },
        },
      });
    } catch (error) {
      console.error(`Error deleting from ${this.tableName}:`, error);
      throw error;
    }
  }
}

// Fonction pour créer une instance de table
export function createTable(tableName: string): SecureSupabaseClient {
  return new SecureSupabaseClient(tableName);
}

// Exemple d'utilisation pour les tables courantes
export const usersTable = createTable('users');
export const profilesTable = createTable('profiles');
export const transactionsTable = createTable('transactions');

// Exporter une instance par défaut pour la compatibilité
export const supabase = {
  from: (tableName: string) => createTable(tableName),
  // Ajouter d'autres méthodes si nécessaire
  auth: {
    // Pour l'authentification, vous pouvez créer des routes API dédiées
    signUp: async (email: string, password: string) => {
      // Implémenter via API route
      throw new Error('Auth not implemented - create dedicated API routes');
    },
    signIn: async (email: string, password: string) => {
      // Implémenter via API route
      throw new Error('Auth not implemented - create dedicated API routes');
    },
  },
};