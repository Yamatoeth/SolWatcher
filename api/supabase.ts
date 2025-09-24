// Configuration Supabase côté serveur
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req: any, res: any) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Supabase configuration not found' });
    }

    if (req.method === 'POST') {
      const body = req.body;
      const { method, path, data = {}, options = {} } = body;

      // Construire l'URL complète pour l'API Supabase
      const url = `${SUPABASE_URL}/rest/v1/${path}`;

      // Préparer les headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      };

      // Ajouter des headers supplémentaires si spécifiés
      if (options.headers) {
        Object.assign(headers, options.headers);
      }

      // Préparer les options de fetch
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers,
      };

      // Ajouter le body pour les méthodes qui le nécessitent
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && Object.keys(data).length > 0) {
        fetchOptions.body = JSON.stringify(data);
      }

      // Construire l'URL avec les paramètres de requête
      const finalUrl = new URL(url);
      
      // Ajouter les paramètres de requête si spécifiés
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            finalUrl.searchParams.append(key, String(value));
          }
        });
      }

      // Faire l'appel à Supabase
      const response = await fetch(finalUrl.toString(), fetchOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Gérer différentes réponses
      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return res.status(200).json(responseData);
    } else if (req.method === 'GET') {
      const { query } = req;
      const path = query.path as string;
      
      if (!path) {
        return res.status(400).json({ error: 'Path parameter is required' });
      }

      // Construire l'URL complète pour l'API Supabase
      const url = `${SUPABASE_URL}/rest/v1/${path}`;

      // Préparer les headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      };

      // Ajouter les préférences si spécifiées
      const prefer = query.prefer as string;
      if (prefer) {
        headers['Prefer'] = prefer;
      }

      // Construire l'URL avec les paramètres de requête
      const finalUrl = new URL(url);
      
      // Ajouter les paramètres de requête (sauf 'path' et 'prefer')
      Object.entries(query).forEach(([key, value]) => {
        if (key !== 'path' && key !== 'prefer' && value !== undefined) {
          finalUrl.searchParams.append(key, value as string);
        }
      });

      // Faire l'appel à Supabase
      const response = await fetch(finalUrl.toString(), {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Gérer différentes réponses
      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return res.status(200).json(responseData);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Supabase proxy error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
