// solana-api.ts

// Types
export interface TokenAccount {
  mint: string;
  tokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
  };
  tokenInfo: {
    symbol: string;
    name: string;
    logoURI?: string;
    usdValue?: number;
  };
}

export interface Transaction {
  signature: string;
  type: string;
  token: string;
  amount: number;
  timestamp: number;
  status: 'success' | 'failed';
}

export interface WalletData {
  address: string;
  balance: number; // SOL
  usdValue?: number;
  tokens: TokenAccount[];
  transactions: Transaction[];
}

// Config
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const HELIUS_BASE_URL = 'https://mainnet.helius-rpc.com';

if (!HELIUS_API_KEY) {
  throw new Error("Clé API Helius manquante (.env)");
}

// Helper pour Helius RPC
async function callHeliusApi(method: string, params: any[]): Promise<any> {
  const res = await fetch(`${HELIUS_BASE_URL}?api-key=${HELIUS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "helius-explorer",
      method,
      params
    })
  });

  const data = await res.json();
  if (data.error) {
    console.error('Helius API Error:', data.error);
    throw new Error(data.error.message || "Erreur Helius");
  }
  return data.result;
}

// Récupérer la balance SOL
async function getSolBalance(address: string): Promise<number> {
  const res = await callHeliusApi("getBalance", [address]);
  return res.value / 1_000_000_000;
}

// Récupérer le prix SOL en USD
async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await res.json();
    return data.solana?.usd || 0;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return 0;
  }
}

// Get token metadata from a registry (Jupiter API as fallback)
async function getTokenMetadata(mint: string): Promise<{symbol: string, name: string, logoURI?: string}> {
  try {
    // Try Jupiter token list first
    const res = await fetch('https://token.jup.ag/strict');
    const tokens = await res.json();
    const token = tokens.find((t: any) => t.address === mint);
    
    if (token) {
      return {
        symbol: token.symbol,
        name: token.name,
        logoURI: token.logoURI
      };
    }
  } catch (error) {
    console.error('Error fetching token metadata:', error);
  }
  
  return {
    symbol: "UNKNOWN",
    name: "Unknown Token"
  };
}

// Récupérer les tokens - Version corrigée
async function getTokenAccounts(address: string): Promise<TokenAccount[]> {
  try {
    const res = await callHeliusApi("getTokenAccountsByOwner", [
      address,
      {
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      },
      {
        encoding: "jsonParsed"
      }
    ]);

    if (!res.value || res.value.length === 0) {
      return [];
    }

    // Get token metadata for all tokens
    const tokensWithMetadata = await Promise.all(
      res.value
        .filter((acc: any) => {
          const tokenAmount = acc.account.data.parsed.info.tokenAmount;
          return tokenAmount.uiAmount > 0; // Only include tokens with balance > 0
        })
        .map(async (acc: any) => {
          const tokenAmount = acc.account.data.parsed.info.tokenAmount;
          const mint = acc.account.data.parsed.info.mint;
          
          // Get token metadata
          const tokenInfo = await getTokenMetadata(mint);
          
          return {
            mint,
            tokenAmount,
            tokenInfo: {
              ...tokenInfo,
              usdValue: 0 // We'll calculate this later with proper price data
            }
          };
        })
    );

    // Sort by token amount (you can implement USD value sorting later with price APIs)
    return tokensWithMetadata
      .sort((a: TokenAccount, b: TokenAccount) => b.tokenAmount.uiAmount - a.tokenAmount.uiAmount)
      .slice(0, 10); // Top 10 tokens by amount

  } catch (error) {
    console.error('Error in getTokenAccounts:', error);
    return []; // Return empty array instead of throwing
  }
}

// Récupérer les transactions récentes - Version corrigée
async function getRecentTransactions(address: string, limit = 10): Promise<Transaction[]> {
  try {
    const signatures = await callHeliusApi("getSignaturesForAddress", [
      address,
      { limit }
    ]);

    if (!signatures || signatures.length === 0) {
      return [];
    }

    const transactions = await Promise.all(
      signatures.slice(0, limit).map(async (sig: any) => {
        try {
          const details = await callHeliusApi("getTransaction", [
            sig.signature,
            {
              encoding: "jsonParsed",
              maxSupportedTransactionVersion: 0
            }
          ]);

          let type = "unknown";
          let amount = 0;

          // Try to extract transaction type and amount
          if (details?.transaction?.message?.instructions) {
            const instruction = details.transaction.message.instructions[0];
            if (instruction?.parsed?.type) {
              type = instruction.parsed.type;
            }
            
            // Try to get amount from parsed instruction
            if (instruction?.parsed?.info?.lamports) {
              amount = instruction.parsed.info.lamports / 1_000_000_000;
            }
          }

          return {
            signature: sig.signature,
            type,
            token: "SOL",
            amount,
            timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
            status: sig.err ? "failed" : "success" as const
          };
        } catch (txError) {
          console.error('Error fetching transaction details:', txError);
          return {
            signature: sig.signature,
            type: "unknown",
            token: "SOL", 
            amount: 0,
            timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
            status: sig.err ? "failed" : "success" as const
          };
        }
      })
    );

    return transactions;
  } catch (error) {
    console.error('Error in getRecentTransactions:', error);
    return []; // Return empty array instead of throwing
  }
}

// API principale
export async function fetchWalletData(address: string): Promise<WalletData> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    throw new Error("Adresse Solana invalide");
  }

  try {
    console.log('Fetching wallet data for:', address);
    
    const [balance, tokens, transactions, solPrice] = await Promise.all([
      getSolBalance(address),
      getTokenAccounts(address),
      getRecentTransactions(address, 10),
      getSolPrice()
    ]);

    console.log('Wallet data fetched successfully:', { balance, tokensCount: tokens.length, transactionsCount: transactions.length });

    return {
      address,
      balance,
      usdValue: balance * solPrice,
      tokens,
      transactions
    };
  } catch (err) {
    console.error("Erreur lors de la récupération des données du portefeuille:", err);
    throw new Error("Impossible de récupérer les données du portefeuille");
  }
}