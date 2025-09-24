// Configuration Helius côté serveur
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_DAS_URL = process.env.HELIUS_DAS_URL || "https://mainnet.helius-rpc.com/v0/das";

export default async function handler(req: any, res: any) {
  try {
    if (!HELIUS_API_KEY) {
      return res.status(500).json({ error: 'Helius API key not configured' });
    }

    if (req.method === 'POST') {
      const body = req.body;
      const { method, params, id = 1, endpoint = 'rpc' } = body;

      // Déterminer l'URL en fonction de l'endpoint
      const url = endpoint === 'das' ? HELIUS_DAS_URL : HELIUS_RPC_URL;

      // Préparer la requête
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params,
        }),
      };

      // Faire l'appel à Helius
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Gérer les erreurs de l'API Helius
      if (data.error) {
        return res.status(400).json({ error: data.error.message || 'Helius API error' });
      }

      return res.status(200).json(data);
    } else if (req.method === 'GET') {
      const { query } = req;
      const endpoint = query.endpoint as string || 'das';
      
      // Construire l'URL avec les paramètres
      const url = new URL(endpoint === 'das' ? HELIUS_DAS_URL : HELIUS_RPC_URL);
      
      // Ajouter les paramètres de requête
      Object.entries(query).forEach(([key, value]) => {
        if (key !== 'endpoint' && value !== undefined) {
          url.searchParams.append(key, value as string);
        }
      });

      // Pour le DAS, ajouter l'API key
      if (endpoint === 'das') {
        url.searchParams.append('api-key', HELIUS_API_KEY);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Helius proxy error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
