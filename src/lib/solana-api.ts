// solana-api.ts - Optimized with Helius Best Practices

import { Connection, PublicKey } from '@solana/web3.js';

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
    pricePerToken?: number;
  };
}

export interface Transaction {
  signature: string;
  type: string;
  token: string;
  amount: number;
  timestamp: number;
  status: 'success' | 'failed';
  slot?: number;
  fee?: number;
  // Enhanced fields for better display
  fromToken?: string; // For swaps/transfers
  toToken?: string;   // For swaps
  fromAmount?: number; // For swaps/transfers
  toAmount?: number;   // For swaps
  isSwap?: boolean;    // To identify swap transactions
  protocol?: string;   // Protocol used (Jupiter, Orca, Raydium, etc.)
  description?: string; // Human-readable description
  detailedType?: string; // More specific transaction type (Swap, Transfer, Liquidity, etc.)
}

export interface WalletData {
  address: string;
  balance: number; // SOL
  usdValue?: number;
  tokens: TokenAccount[];
  transactions: Transaction[];
}

// DAS API Types
// Enhanced TypeScript types for DAS API responses
interface DASContent {
  metadata: {
    name: string;
    symbol: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  };
  links: {
    image: string;
    external_url?: string;
  };
}

interface DASPriceInfo {
  price_per_token: number;
  currency: string;
  decimals: number;
}

interface DASTokenInfo {
  symbol: string;
  balance: number;
  decimals: number;
  price_info?: DASPriceInfo;
}

interface DASAsset {
  id: string; // mint address
  content: DASContent;
  token_info?: DASTokenInfo;
  ownership: {
    owner: string;
    delegate?: string;
  };
  authorities?: Array<{
    address: string;
    scopes: string[];
  }>;
  compression?: {
    compressed: boolean;
    eligible: boolean;
    data_hash?: string;
    creator_hash?: string;
    asset_hash?: string;
    tree?: string;
    seq?: number;
    leaf_id?: number;
  };
  grouping?: Array<{
    group_key: string;
    group_value: string;
  }>;
  royalty?: {
    royalty_model: string;
    target: string;
    percent: number;
    basis_points: number;
    primary_sale_happened: boolean;
  };
  supply?: {
    print_max_supply?: number;
    print_current_supply?: number;
    edition_nonce?: number;
  };
  uses?: {
    use_method: string;
    remaining: number;
    total: number;
  };
}

interface DASResponse {
  items: DASAsset[];
  total: number;
  page: number;
  limit: number;
}

// Config
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const HELIUS_BASE_URL = 'https://mainnet.helius-rpc.com';
const HELIUS_RPC_URL = import.meta.env.VITE_HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_DAS_URL = import.meta.env.VITE_HELIUS_DAS_URL || "https://mainnet.helius-rpc.com/v0/das";

// Constants for optimization
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const DEFAULT_LIMIT = 100;
const TOKEN_PAGE_SIZE = 100;
const TX_LIMIT = 20;
const COMMITMENT_LEVEL = "confirmed";

// Cache configuration
const CACHE_TTL = {
  TOKEN_METADATA: 5 * 60 * 1000, // 5 minutes
  TOKEN_PRICE: 1 * 60 * 1000, // 1 minute
  SOL_PRICE: 30 * 1000, // 30 seconds
};

// Rate limiting configuration
const RATE_LIMITS = {
  RPC_REQUESTS_PER_MINUTE: 100,
  DAS_REQUESTS_PER_MINUTE: 60,
  EXTERNAL_API_REQUESTS_PER_MINUTE: 30,
};

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Rate limiter implementation
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;

  constructor(windowMs: number = 60 * 1000) {
    this.windowMs = windowMs;
  }

  async waitForSlot(key: string, maxRequests: number): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    if (requests.length >= maxRequests) {
      const oldestRequest = requests[0];
      const waitTime = oldestRequest + this.windowMs - now;
      
      if (waitTime > 0) {
        console.log(`Rate limit reached for ${key}. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Add current request
    requests.push(now);
    this.requests.set(key, requests);
  }
}

// Initialize rate limiters
const rpcRateLimiter = new RateLimiter();
const dasRateLimiter = new RateLimiter();
const externalApiRateLimiter = new RateLimiter();

const cache = {
  tokenMetadata: new Map<string, CacheEntry<any>>(),
  tokenPrices: new Map<string, CacheEntry<number>>(),
  solPrice: null as CacheEntry<number> | null,
};

// Cache helper functions
function getFromCache<T>(cacheMap: Map<string, CacheEntry<T>>, key: string, ttl: number): T | null {
  const entry = cacheMap.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > ttl) {
    cacheMap.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache<T>(cacheMap: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cacheMap.set(key, {
    data,
    timestamp: Date.now(),
  });
}

function getSolPriceFromCache(): number | null {
  if (!cache.solPrice) return null;
  
  if (Date.now() - cache.solPrice.timestamp > CACHE_TTL.SOL_PRICE) {
    cache.solPrice = null;
    return null;
  }
  
  return cache.solPrice.data;
}

function setSolPriceCache(price: number): void {
  cache.solPrice = {
    data: price,
    timestamp: Date.now(),
  };
}

// Token symbol cache with TTL
const tokenSymbolCache = new Map<string, CacheEntry<string>>();

// Get token symbol with caching
async function getTokenSymbol(mint: string): Promise<string> {
  // Check cache first
  const cachedSymbol = getFromCache(tokenSymbolCache, mint, CACHE_TTL.TOKEN_METADATA);
  if (cachedSymbol !== null) {
    return cachedSymbol;
  }

  try {
    const tokenData = await callDASApi("getAsset", { id: mint });
    const symbol = tokenData?.token_info?.symbol || mint.slice(0, 4) + "..." + mint.slice(-4);
    
    // Cache the symbol
    setCache(tokenSymbolCache, mint, symbol);
    
    return symbol;
  } catch (error) {
    console.error('Error fetching token symbol:', error);
    return mint.slice(0, 4) + "..." + mint.slice(-4);
  }
}

// Common token symbols for quick lookup
const COMMON_TOKENS: Record<string, string> = {
  "So11111111111111111111111111111111111111112": "SOL",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4bdc3spfw": "JUP",
  "J1toso1uCk3RLmjorhTtrVwE9iJdF4CzzpGrBjWa6Djf": "JUP",
};

// Get token symbol with common token lookup
async function getTokenSymbolFast(mint: string): Promise<string> {
  // Check common tokens first
  if (COMMON_TOKENS[mint]) {
    return COMMON_TOKENS[mint];
  }
  
  return await getTokenSymbol(mint);
}

// Helper for Helius RPC with retry logic and rate limiting
async function callHeliusApi(method: string, params: any[], retries = MAX_RETRIES): Promise<any> {
  try {
    // Apply rate limiting
    await rpcRateLimiter.waitForSlot('helius-rpc', RATE_LIMITS.RPC_REQUESTS_PER_MINUTE);
    
    const res = await fetch(`${HELIUS_BASE_URL}?api-key=${HELIUS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "helius-explorer",
        method,
        params,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    return data.result;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying ${method} (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries)));
      return callHeliusApi(method, params, retries - 1);
    }
    throw error;
  }
}

// Helper for DAS API with retry logic and rate limiting
async function callDASApi(method: string, params: any, retries = MAX_RETRIES): Promise<any> {
  try {
    // Apply rate limiting
    await dasRateLimiter.waitForSlot('helius-das', RATE_LIMITS.DAS_REQUESTS_PER_MINUTE);
    
    const res = await fetch(`${HELIUS_DAS_URL}?api-key=${HELIUS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "helius-das",
        method,
        params,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    
    if (data.error) {
      throw new Error(`DAS API error: ${data.error.message}`);
    }

    return data.result;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying ${method} (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries)));
      return callDASApi(method, params, retries - 1);
    }
    throw error;
  }
}

// Get SOL balance with proper error handling
async function getSolBalance(address: string): Promise<number> {
  try {
    const res = await callHeliusApi("getBalance", [address]);
    return res.value / 1_000_000_000; // Convert lamports to SOL
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    return 0;
  }
}

// Get token price with caching
export async function getTokenPrice(mint: string): Promise<number> {
  // Check cache first
  const cachedPrice = getFromCache(cache.tokenPrices, mint, CACHE_TTL.TOKEN_PRICE);
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  try {
    const response = await callDASApi("getAsset", { id: mint });
    const price = response.token_info?.price_info?.price_per_token || 0;
    
    // Cache the price
    setCache(cache.tokenPrices, mint, price);
    
    return price;
  } catch (error) {
    console.error('Error fetching token price:', error);
    return 0;
  }
}

// Get SOL price with caching and rate limiting
export async function getSolPrice(): Promise<number> {
  // Check cache first
  const cachedPrice = getSolPriceFromCache();
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  try {
    // Apply rate limiting
    await externalApiRateLimiter.waitForSlot('coingecko', RATE_LIMITS.EXTERNAL_API_REQUESTS_PER_MINUTE);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch SOL price: ${res.status}`);
    }
    
    const data = await res.json();
    const price = data.solana.usd;
    
    // Cache the price
    setSolPriceCache(price);
    
    return price;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return 0;
  }
}

// Get token accounts using DAS API with pagination support
async function getTokenAccounts(address: string, page = 1, limit = TOKEN_PAGE_SIZE): Promise<TokenAccount[]> {
  try {
    const response = await callDASApi("getAssetsByOwner", {
      ownerAddress: address,
      page,
      limit,
      displayOptions: {
        showFungible: true, // Include SPL tokens
        showNativeBalance: true, // Include SOL balance
        showInscription: false, // Exclude inscriptions for performance
      },
    });

    if (!response.items || response.items.length === 0) {
      return [];
    }

    const tokens: TokenAccount[] = [];
    
    for (const asset of response.items) {
      if (asset.token_info && asset.token_info.balance > 0) {
        const tokenInfo = asset.token_info;
        const pricePerToken = tokenInfo.price_info?.price_per_token || 0;
        
        // Calculate the correct uiAmount by dividing the raw balance by decimals
        const rawBalance = tokenInfo.balance;
        const uiAmount = rawBalance / Math.pow(10, tokenInfo.decimals);
        
        tokens.push({
          mint: asset.id,
          tokenAmount: {
            amount: (rawBalance * Math.pow(10, tokenInfo.decimals)).toString(),
            decimals: tokenInfo.decimals,
            uiAmount: uiAmount,
            uiAmountString: uiAmount.toString()
          },
          tokenInfo: {
            symbol: tokenInfo.symbol || "UNKNOWN",
            name: asset.content.metadata.name || "Unknown Token",
            logoURI: asset.content.links.image,
            usdValue: uiAmount * pricePerToken,
            pricePerToken
          }
        });
      }
    }

    // Sort by USD value, then by token amount
    return tokens.sort((a, b) => {
      const aValue = a.tokenInfo.usdValue || 0;
      const bValue = b.tokenInfo.usdValue || 0;
      if (aValue !== bValue) {
        return bValue - aValue;
      }
      return b.tokenAmount.uiAmount - a.tokenAmount.uiAmount;
    });

  } catch (error) {
    console.error('Error in getTokenAccounts:', error);
    return [];
  }
}

// Get all token accounts with automatic pagination
export async function getAllTokenAccounts(address: string, maxPages = 10): Promise<{tokens: TokenAccount[], total: number}> {
  const allTokens: TokenAccount[] = [];
  let page = 1;
  let hasMore = true;
  let total = 0;

  while (hasMore && page <= maxPages) {
    try {
      const response = await callDASApi("getAssetsByOwner", {
        ownerAddress: address,
        page,
        limit: TOKEN_PAGE_SIZE,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
          showInscription: false,
        },
      });

      if (!response.items || response.items.length === 0) {
        hasMore = false;
        break;
      }

      // Process current page
      for (const asset of response.items) {
        if (asset.token_info && asset.token_info.balance > 0) {
          const tokenInfo = asset.token_info;
          const pricePerToken = tokenInfo.price_info?.price_per_token || 0;
          
          allTokens.push({
            mint: asset.id,
            tokenAmount: {
              amount: (tokenInfo.balance * Math.pow(10, tokenInfo.decimals)).toString(),
              decimals: tokenInfo.decimals,
              uiAmount: tokenInfo.balance,
              uiAmountString: tokenInfo.balance.toString()
            },
            tokenInfo: {
              symbol: tokenInfo.symbol || "UNKNOWN",
              name: asset.content.metadata.name || "Unknown Token",
              logoURI: asset.content.links.image,
              usdValue: tokenInfo.balance * pricePerToken,
              pricePerToken
            }
          });
        }
      }

      total = response.total || 0;
      
      // Check if we have more pages
      hasMore = response.items.length === TOKEN_PAGE_SIZE;
      page++;
      
      // Small delay between pages to respect rate limits
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Error fetching token accounts page ${page}:`, error);
      hasMore = false;
    }
  }

  // Sort all tokens by USD value, then by token amount
  const sortedTokens = allTokens.sort((a, b) => {
    const aValue = a.tokenInfo.usdValue || 0;
    const bValue = b.tokenInfo.usdValue || 0;
    if (aValue !== bValue) {
      return bValue - aValue;
    }
    return b.tokenAmount.uiAmount - a.tokenAmount.uiAmount;
  });

  return {
    tokens: sortedTokens,
    total
  };
}

// Common DeFi program IDs with extended list
const DEFI_PROGRAMS: Record<string, string> = {
  // DEX Aggregators
  "Jupiter": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  "Jupiter DCA": "DCA26V4t7vX5b5w3s6fZ5s5s5s5s5s5s5s5s5s5s5s",
  
  // DEX Protocols
  "Raydium": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  "Raydium Liquidity": "27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv",
  "Raydium CLMM": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  "Raydium CPMM": "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  "Raydium Stable Swap": "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h",
  "Raydium Staking": "EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q",
  "Raydium Farm": "9KEPoZmtHUrBbhWN1v1KWLMkkvwY6WLtAVUCPRtRjP4z",
  "Orca": "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP",
  "Orca V2": "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP",
  "Orca Whirlpool": "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
  "Meteora": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  "Meteora DLMM": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  "Meteora DAMM v1": "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
  "Meteora DAMM v2": "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
  "Meteora DBC": "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN",
  "Meteora Dynamic Fee Sharing": "dfsdo2UqvwfN8DuUVrMRNfQe11VaiNoKcMqLHVvDPzh",
  "Meteora Stake2Earn": "FEESngU3neckdwib9X3KWqdL7Mjmqk9XNp3uh5JbP4KP",
  
  // Lending Protocols
  "Kamino": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  "Kamino Lending": "KLend2g3cPKVUE8nKM6gD5DkV1F2eQWZ5hCE7DcW3jz",
  "Kamino Liquidity": "KLiMg9zHL4V9cZJj2b75VZ5tEgFgquZVd2oqq6oy8K",
  "Solend": "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpA",
  "Marginfi": "Marginfi97Zwi4z8cA5DVyMFGFqaX1zRUJhBqjDEKQtBw",
  
  // Perpetuals
  "Drift": "dRiftyHA39MWEi3m9aunc5MzRF1J8BsW5BF2kyA4UMj",
  
  // Bridge Protocols
  "Wormhole": "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ",
  
  // NFT Marketplaces
  "Tensor": "TSWAPaqzMSnyPbhkKUPbAVgJcRKXWg6F4b1sYg3yQz",
  "Magic Eden": "M2mx93ekt1fmXSVkTrUL9xVFHjMEaH3d488HYWT7yf25",
  
  // Staking
  "Marinade": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYndxJ6mNpX",
  "Serum DEX": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
  "Pyth Oracle": "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH",
  "Switchboard": "SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv",
  "Bonk Rewards": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "Jito Staking": "J1to3PQfXidUUhprQWgdKkQAMWPJAEqSJ7amkBDE9qhF",
  
  // Other
  "Phoenix": "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",
  "OpenBook": "srmqPvymJeFKQ4zGQed1GFppgkRHL9eaELiyT45vC02"
};

// Program ID to protocol name mapping for reverse lookup
const PROGRAM_ID_TO_PROTOCOL: Record<string, string> = {
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium",
  "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": "Orca",
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo": "Meteora",
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB": "Meteora",
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG": "Meteora",
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN": "Meteora",
  "dfsdo2UqvwfN8DuUVrMRNfQe11VaiNoKcMqLHVvDPzh": "Meteora",
  "FEESngU3neckdwib9X3KWqdL7Mjmqk9XNp3uh5JbP4KP": "Meteora",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium",
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C": "Raydium",
  "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h": "Raydium",
  "EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q": "Raydium",
  "9KEPoZmtHUrBbhWN1v1KWLMkkvwY6WLtAVUCPRtRjP4z": "Raydium",
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": "Serum",
  "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH": "Pyth",
  "SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv": "Switchboard",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "Bonk Rewards",
  "J1to3PQfXidUUhprQWgdKkQAMWPJAEqSJ7amkBDE9qhF": "Jito",
  "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD": "Kamino",
  "KLend2g3cPKVUE8nKM6gD5DkV1F2eQWZ5hCE7DcW3jz": "Kamino",
  "KLiMg9zHL4V9cZJj2b75VZ5tEgFgquZVd2oqq6oy8K": "Kamino",
  "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpA": "Solend",
  "Marginfi97Zwi4z8cA5DVyMFGFqaX1zRUJhBqjDEKQtBw": "Marginfi",
  "dRiftyHA39MWEi3m9aunc5MzRF1J8BsW5BF2kyA4UMj": "Drift",
  "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ": "Wormhole",
  "TSWAPaqzMSnyPbhkKUPbAVgJcRKXWg6F4b1sYg3yQz": "Tensor",
  "M2mx93ekt1fmXSVkTrUL9xVFHjMEaH3d488HYWT7yf25": "Magic Eden",
  "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYndxJ6mNpX": "Marinade",
  "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY": "Phoenix",
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9eaELiyT45vC02": "OpenBook"
};

// Enhanced transaction details with protocol detection and improved categorization
async function getTransactionDetails(signature: string): Promise<Transaction | null> {
  try {
    const details = await callHeliusApi("getTransaction", [
      signature,
      { encoding: "jsonParsed", commitment: COMMITMENT_LEVEL, maxSupportedTransactionVersion: 0 }
    ]);
    
    if (!details) return null;

    let type = "unknown";
    let detailedType = "Unknown";
    let amount = 0;
    let token = "SOL";
    let fee = details.meta?.fee ? details.meta.fee / 1_000_000_000 : 0;
    let description = "";
    let isSwap = false;
    let protocol = "";
    let fromToken = "";
    let toToken = "";
    let fromAmount = 0;
    let toAmount = 0;

    const instructions = details?.transaction?.message?.instructions || [];
    const preBalances = details?.meta?.preTokenBalances || [];
    const postBalances = details?.meta?.postTokenBalances || [];
    const preSolBalances = details?.meta?.preBalances || [];
    const postSolBalances = details?.meta?.postBalances || [];
    const accountKeys = details?.transaction?.message?.accountKeys || [];
    const walletAddress = accountKeys[0]; // Assuming first account is the wallet

    // Detect which protocol is involved
    let detectedProtocol = "";
    console.log('🔍 Détection de protocole pour la transaction:', signature);
    console.log('📋 Account keys dans la transaction:', accountKeys);
    console.log('🔑 Program IDs à vérifier (premiers 10):');
    accountKeys.slice(0, 10).forEach((key, index) => {
      console.log(`  ${index + 1}. ${key}`);
    });
    
    for (const [programName, programId] of Object.entries(DEFI_PROGRAMS)) {
      const programInvolved = details?.transaction?.message?.accountKeys?.some(
        (key: string) => key === programId
      );
      
      if (programInvolved) {
        detectedProtocol = programName;
        protocol = programName;
        console.log('✅ Protocole détecté:', programName, 'avec Program ID:', programId);
        break;
      }
    }
    
    if (!detectedProtocol) {
      console.log('❌ Aucun protocole DeFi détecté pour cette transaction');
    }

    // Enhanced transaction type detection based on protocol and instructions
    if (detectedProtocol) {
      console.log('🎯 Traitement spécifique pour le protocole:', detectedProtocol);
      // Protocol-specific transaction detection
      let protocolHandled = false;
      
      // DEX Aggregators (Jupiter)
      if (detectedProtocol === "Jupiter" || detectedProtocol === "Jupiter DCA") {
        // For Jupiter, analyze token transfer instructions directly
        const tokenTransfers = [];
        for (const instr of instructions) {
          if (instr.parsed?.type === "transfer" || instr.parsed?.type === "transferChecked") {
            const info = instr.parsed.info;
            if (info.amount && info.mint) {
              const isSender = info.source === walletAddress;
              const amount = Number(info.amount) / Math.pow(10, info.decimals || 0);
              const tokenSymbol = await getTokenSymbolFast(info.mint);
              
              tokenTransfers.push({
                symbol: tokenSymbol,
                amount: isSender ? -amount : amount,
                mint: info.mint
              });
            }
          }
        }
        
        if (tokenTransfers.length >= 2) {
          const sent = tokenTransfers.filter(t => t.amount < 0);
          const received = tokenTransfers.filter(t => t.amount > 0);
          
          if (sent.length > 0 && received.length > 0) {
            const sentToken = sent[0];
            const receivedToken = received[0];
            
            description = `SWAP: ${Math.abs(sentToken.amount).toFixed(6)} ${sentToken.symbol} → ${receivedToken.amount.toFixed(6)} ${receivedToken.symbol}; ${detectedProtocol}`;
            isSwap = true;
            type = "Swap";
            detailedType = "Token Swap";
            fromToken = sentToken.symbol;
            toToken = receivedToken.symbol;
            fromAmount = Math.abs(sentToken.amount);
            toAmount = receivedToken.amount;
            amount = Math.max(fromAmount, toAmount);
            protocol = detectedProtocol;
            token = sentToken.symbol;
            protocolHandled = true;
          }
        }
      }
      
      // DEX Protocols (Raydium, Orca, Meteora)
      if (!protocolHandled && (
        detectedProtocol.includes("Raydium") || 
        detectedProtocol.includes("Orca") || 
        detectedProtocol.includes("Meteora") ||
        detectedProtocol === "Serum DEX"
      )) {
        const enhancedChanges = await calculateEnhancedBalanceChanges(
          preBalances || [], 
          postBalances || [], 
          preSolBalances || [], 
          postSolBalances || [], 
          walletAddress
        );
        
        if (enhancedChanges.length > 0) {
          const received = enhancedChanges.filter(c => c.amount > 0);
          const sent = enhancedChanges.filter(c => c.amount < 0);
          
          if (received.length > 0 && sent.length > 0) {
            const sentToken = sent[0];
            const receivedToken = received[0];
            
            // Check for liquidity provision vs swap
            if (detectedProtocol.includes("Liquidity") || 
                detectedProtocol.includes("CLMM") || 
                detectedProtocol.includes("DLMM") ||
                detectedProtocol.includes("Whirlpool") ||
                detectedProtocol.includes("DAMM") ||
                (sentToken.symbol.includes("LP") || receivedToken.symbol.includes("LP"))) {
              // Liquidity provision
              description = `Liquidity: ${Math.abs(sentToken.amount).toFixed(6)} ${sentToken.symbol} → ${receivedToken.amount.toFixed(6)} ${receivedToken.symbol}; ${detectedProtocol}`;
              type = "Liquidity";
              detailedType = "Liquidity Provision";
              protocol = detectedProtocol.includes("Raydium") ? "Raydium" : 
                         detectedProtocol.includes("Orca") ? "Orca" : "Meteora";
              token = sentToken.symbol;
              amount = Math.abs(sentToken.amount);
            } else {
              // Regular swap with protocol-specific details
              let protocolPrefix = detectedProtocol;
              if (detectedProtocol === "Raydium") protocolPrefix = "Raydium AMM";
              if (detectedProtocol === "Raydium CLMM") protocolPrefix = "Raydium CLMM";
              if (detectedProtocol === "Raydium CPMM") protocolPrefix = "Raydium CPMM";
              if (detectedProtocol === "Raydium Stable Swap") protocolPrefix = "Raydium Stable";
              if (detectedProtocol === "Orca") protocolPrefix = "Orca V2";
              if (detectedProtocol === "Orca Whirlpool") protocolPrefix = "Orca Whirlpool";
              if (detectedProtocol === "Meteora") protocolPrefix = "Meteora DLMM";
              if (detectedProtocol === "Meteora DAMM v1") protocolPrefix = "Meteora DAMM v1";
              if (detectedProtocol === "Meteora DAMM v2") protocolPrefix = "Meteora DAMM v2";
              if (detectedProtocol === "Serum DEX") protocolPrefix = "Serum DEX";
              
              description = `SWAP: ${Math.abs(sentToken.amount).toFixed(6)} ${sentToken.symbol} → ${receivedToken.amount.toFixed(6)} ${receivedToken.symbol}; ${protocolPrefix}`;
              isSwap = true;
              type = "Swap";
              detailedType = "Token Swap";
              fromToken = sentToken.symbol;
              toToken = receivedToken.symbol;
              fromAmount = Math.abs(sentToken.amount);
              toAmount = receivedToken.amount;
              amount = Math.max(fromAmount, toAmount);
              protocol = detectedProtocol.includes("Raydium") ? "Raydium" : 
                         detectedProtocol.includes("Orca") ? "Orca" : 
                         detectedProtocol.includes("Meteora") ? "Meteora" : "Serum";
              token = sentToken.symbol;
            }
            protocolHandled = true;
          } else if (received.length > 0) {
            // Liquidity withdrawal or reward
            const receivedToken = received[0];
            description = `Liquidity Withdrawal: ${receivedToken.amount.toFixed(6)} ${receivedToken.symbol}; ${detectedProtocol}`;
            type = "Unstake";
            detailedType = "Liquidity Withdrawal";
            protocol = detectedProtocol.includes("Raydium") ? "Raydium" : 
                       detectedProtocol.includes("Orca") ? "Orca" : "Meteora";
            protocolHandled = true;
          } else if (sent.length > 0) {
            // Single token sent (liquidity provision)
            const sentToken = sent[0];
            description = `Liquidity Provision: ${Math.abs(sentToken.amount).toFixed(6)} ${sentToken.symbol}; ${detectedProtocol}`;
            type = "Stake";
            detailedType = "Liquidity Provision";
            protocol = detectedProtocol.includes("Raydium") ? "Raydium" : 
                       detectedProtocol.includes("Orca") ? "Orca" : "Meteora";
            token = sentToken.symbol;
            amount = Math.abs(sentToken.amount);
            protocolHandled = true;
          }
        }
      }
      
      // Lending Protocols (Kamino, Solend, Marginfi)
      if (!protocolHandled && (
        detectedProtocol.includes("Kamino") || 
        detectedProtocol.includes("Solend") || 
        detectedProtocol.includes("Marginfi")
      )) {
        const enhancedChanges = await calculateEnhancedBalanceChanges(
          preBalances || [], 
          postBalances || [], 
          preSolBalances || [], 
          postSolBalances || [], 
          walletAddress
        );
        
        if (enhancedChanges.length > 0) {
          const received = enhancedChanges.filter(c => c.amount > 0);
          const sent = enhancedChanges.filter(c => c.amount < 0);
          
          if (received.length > 0) {
            const receivedToken = received[0];
            if (detectedProtocol.includes("Lending")) {
              description = `${detectedProtocol} Borrow: ${receivedToken.amount.toFixed(6)} ${receivedToken.symbol}`;
              type = "Borrow";
              detailedType = "Loan Borrow";
            } else {
              description = `${detectedProtocol} Deposit Return: ${receivedToken.amount.toFixed(6)} ${receivedToken.symbol}`;
              type = "Receive";
              detailedType = "Deposit Return";
            }
            protocol = detectedProtocol.includes("Kamino") ? "Kamino" : 
                       detectedProtocol.includes("Solend") ? "Solend" : "Marginfi";
            protocolHandled = true;
          } else if (sent.length > 0) {
            const sentToken = sent[0];
            if (detectedProtocol.includes("Lending")) {
              description = `${detectedProtocol} Repay: ${Math.abs(sentToken.amount).toFixed(6)} ${sentToken.symbol}`;
              type = "Repay";
              detailedType = "Loan Repayment";
            } else {
              description = `${detectedProtocol} Deposit: ${Math.abs(sentToken.amount).toFixed(6)} ${sentToken.symbol}`;
              type = "Send";
              detailedType = "Lending Deposit";
            }
            protocol = detectedProtocol.includes("Kamino") ? "Kamino" : 
                       detectedProtocol.includes("Solend") ? "Solend" : "Marginfi";
            token = sentToken.symbol;
            amount = Math.abs(sentToken.amount);
            protocolHandled = true;
          }
        }
      }
      
      // Perpetuals Trading (Drift)
      if (!protocolHandled && detectedProtocol === "Drift") {
        description = `Drift Trading: Position Update`;
        type = "Trade";
        detailedType = "Perpetual Trading";
        protocol = "Drift";
        protocolHandled = true;
      }
      
      // Bridge Protocols (Wormhole)
      if (!protocolHandled && detectedProtocol === "Wormhole") {
        const enhancedChanges = await calculateEnhancedBalanceChanges(
          preBalances || [], 
          postBalances || [], 
          preSolBalances || [], 
          postSolBalances || [], 
          walletAddress
        );
        
        if (enhancedChanges.length > 0) {
          const received = enhancedChanges.filter(c => c.amount > 0);
          const sent = enhancedChanges.filter(c => c.amount < 0);
          
          if (received.length > 0) {
            const receivedToken = received[0];
            description = `Bridge Receive: ${receivedToken.amount.toFixed(6)} ${receivedToken.symbol}; Wormhole`;
            type = "Receive";
            detailedType = "Bridge Receive";
            protocol = "Wormhole";
            protocolHandled = true;
          } else if (sent.length > 0) {
            const sentToken = sent[0];
            description = `Bridge Send: ${Math.abs(sentToken.amount).toFixed(6)} ${sentToken.symbol}; Wormhole`;
            type = "Send";
            detailedType = "Bridge Send";
            protocol = "Wormhole";
            token = sentToken.symbol;
            amount = Math.abs(sentToken.amount);
            protocolHandled = true;
          }
        }
      }
      
      // NFT Marketplaces (Tensor, Magic Eden)
      if (!protocolHandled && (
        detectedProtocol === "Tensor" || 
        detectedProtocol === "Magic Eden"
      )) {
        description = `NFT ${detectedProtocol}: Transaction`;
        type = "NFT";
        detailedType = "NFT Transaction";
        protocol = detectedProtocol;
        protocolHandled = true;
      }
      
      // Staking Protocols (Marinade, Bonk Rewards, Jito Staking)
      if (!protocolHandled && (
        detectedProtocol.includes("Staking") || 
        detectedProtocol.includes("Marinade") || 
        detectedProtocol.includes("Bonk Rewards") || 
        detectedProtocol.includes("Jito")
      )) {
        const enhancedChanges = await calculateEnhancedBalanceChanges(
          preBalances || [], 
          postBalances || [], 
          preSolBalances || [], 
          postSolBalances || [], 
          walletAddress
        );
        
        if (enhancedChanges.length > 0) {
          const received = enhancedChanges.filter(c => c.amount > 0);
          const sent = enhancedChanges.filter(c => c.amount < 0);
          
          if (received.length > 0) {
            const receivedToken = received[0];
            description = `Unstaking: ${receivedToken.amount.toFixed(6)} ${receivedToken.symbol}; ${detectedProtocol}`;
            type = "Unstake";
            detailedType = "Staking Withdrawal";
            protocol = detectedProtocol.includes("Marinade") ? "Marinade" : 
                       detectedProtocol.includes("Bonk") ? "Bonk Rewards" : "Jito";
            protocolHandled = true;
          } else if (sent.length > 0) {
            const sentToken = sent[0];
            description = `Staking: ${Math.abs(sentToken.amount).toFixed(6)} ${sentToken.symbol}; ${detectedProtocol}`;
            type = "Stake";
            detailedType = "Staking Deposit";
            protocol = detectedProtocol.includes("Marinade") ? "Marinade" : 
                       detectedProtocol.includes("Bonk") ? "Bonk Rewards" : "Jito";
            token = sentToken.symbol;
            amount = Math.abs(sentToken.amount);
            protocolHandled = true;
          }
        }
      }
      
      // Oracle Protocols (Pyth, Switchboard)
      if (!protocolHandled && (
        detectedProtocol === "Pyth Oracle" || 
        detectedProtocol === "Switchboard"
      )) {
        description = `${detectedProtocol}: Price Update`;
        type = "Oracle";
        detailedType = "Price Update";
        protocol = detectedProtocol.includes("Pyth") ? "Pyth" : "Switchboard";
        protocolHandled = true;
      }
      
      // Other Protocols (Phoenix, OpenBook)
      if (!protocolHandled && (
        detectedProtocol === "Phoenix" || 
        detectedProtocol === "OpenBook"
      )) {
        description = `${detectedProtocol}: Trading`;
        type = "Trade";
        detailedType = "DEX Trading";
        protocol = detectedProtocol;
        protocolHandled = true;
      }
      
      // Fallback for detected protocols without specific handling
      if (!protocolHandled) {
        description = `${detectedProtocol}: Interaction`;
        type = "Unknown";
        detailedType = "Protocol Interaction";
        protocol = detectedProtocol;
      }
    }

    // Check for transfers if no DeFi interaction found
    if (type === "unknown") {
      for (const instr of instructions) {
        if (instr.parsed?.type === "transfer") {
          const info = instr.parsed.info;
          
          if (info.lamports) {
            // SOL transfer
            const isSender = info.source === walletAddress;
            type = isSender ? "Send" : "Receive";
            detailedType = "SOL Transfer";
            amount = info.lamports / 1_000_000_000;
            token = "SOL";
            protocol = "Solana";
            
            fromToken = "SOL";
            toToken = "SOL";
            fromAmount = isSender ? amount : 0;
            toAmount = isSender ? 0 : amount;
            
            description = `${isSender ? "Send" : "Receive"} ${amount.toFixed(9)} SOL`;
            break;
          } else if (info.amount && info.mint) {
            // SPL token transfer
            const isSender = info.source === walletAddress;
            type = isSender ? "Send" : "Receive";
            detailedType = "Token Transfer";
            amount = Number(info.amount) / Math.pow(10, info.decimals || 0);
            
            // Get token symbol
            const tokenSymbol = await getTokenSymbolFast(info.mint);
            token = tokenSymbol;
            protocol = "Token Transfer";
            
            fromToken = tokenSymbol;
            toToken = tokenSymbol;
            fromAmount = isSender ? amount : 0;
            toAmount = isSender ? 0 : amount;
            
            description = `${isSender ? "Send" : "Receive"} ${amount.toFixed(6)} ${tokenSymbol}`;
            break;
          }
        }
      }
    }

    // If still unknown, check SOL balance changes
    if (type === "unknown" && preSolBalances.length > 0 && postSolBalances.length > 0) {
      const walletIndex = accountKeys.findIndex(key => key === walletAddress);
      if (walletIndex !== -1) {
        const preSol = preSolBalances[walletIndex] / 1_000_000_000;
        const postSol = postSolBalances[walletIndex] / 1_000_000_000;
        const solDiff = postSol - preSol;
        
        if (Math.abs(solDiff) > 0.000000001) { // Ignore dust
          const isReceive = solDiff > 0;
          type = isReceive ? "Receive" : "Send";
          detailedType = "SOL Balance Change";
          amount = Math.abs(solDiff);
          token = "SOL";
          protocol = "Solana";
          
          fromToken = "SOL";
          toToken = "SOL";
          fromAmount = isReceive ? 0 : amount;
          toAmount = isReceive ? amount : 0;
          
          description = `${isReceive ? "Receive" : "Send"} ${amount.toFixed(9)} SOL`;
        }
      }
    }

    // Final fallback for unknown transactions
    if (type === "unknown") {
      type = "Unknown";
      detailedType = "Unknown Transaction";
      description = "Unknown transaction type";
      protocol = "Unknown";
    }

    const result: Transaction = {
      signature,
      type,
      token,
      amount,
      timestamp: details.blockTime || Math.floor(Date.now() / 1000),
      status: (details.meta?.err ? "failed" : "success") as 'success' | 'failed',
      slot: details.slot,
      fee,
      isSwap,
      protocol,
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      detailedType,
      description: description || type
    };
    
    console.log('📊 Résultat final de la transaction:', {
      signature: result.signature,
      type: result.type,
      detailedType: result.detailedType,
      protocol: result.protocol,
      description: result.description,
      fromToken: result.fromToken,
      toToken: result.toToken,
      amount: result.amount
    });
    
    return result;

  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}

// Helper to calculate enhanced balance changes including SOL and tokens
async function calculateEnhancedBalanceChanges(
  preTokenBalances: any[], 
  postTokenBalances: any[], 
  preSolBalances: number[], 
  postSolBalances: number[], 
  walletAddress: string
): Promise<Array<{mint: string, amount: number, symbol: string}>> {
  const changes: Array<{mint: string, amount: number, symbol: string}> = [];
  
  // Calculate SOL balance changes
  const walletIndex = 0; // Assuming first account is the wallet
  if (preSolBalances[walletIndex] !== undefined && postSolBalances[walletIndex] !== undefined) {
    const preSol = preSolBalances[walletIndex] / 1_000_000_000;
    const postSol = postSolBalances[walletIndex] / 1_000_000_000;
    const solDiff = postSol - preSol;
    
    if (Math.abs(solDiff) > 0.000000001) { // Ignore dust
      changes.push({
        mint: "So11111111111111111111111111111111111111112",
        amount: solDiff,
        symbol: "SOL"
      });
    }
  }
  
  // Calculate token balance changes
  const tokenPromises = [];
  
  // Process existing tokens
  for (const pre of preTokenBalances) {
    if (pre.owner !== walletAddress) continue;
    
    const post = postTokenBalances.find(p => 
      p.mint === pre.mint && p.owner === walletAddress
    );
    
    if (post) {
      const preAmount = Number(pre.uiTokenAmount?.amount || 0) / Math.pow(10, pre.uiTokenAmount?.decimals || 0);
      const postAmount = Number(post.uiTokenAmount?.amount || 0) / Math.pow(10, post.uiTokenAmount?.decimals || 0);
      const diff = postAmount - preAmount;
      
      if (Math.abs(diff) > 0.000001) { // Ignore dust
        tokenPromises.push(
          getTokenSymbolFast(pre.mint).then(symbol => ({
            mint: pre.mint,
            amount: diff,
            symbol
          }))
        );
      }
    } else {
      // Token was completely transferred out
      const preAmount = Number(pre.uiTokenAmount?.amount || 0) / Math.pow(10, pre.uiTokenAmount?.decimals || 0);
      if (preAmount > 0.000001) {
        tokenPromises.push(
          getTokenSymbolFast(pre.mint).then(symbol => ({
            mint: pre.mint,
            amount: -preAmount,
            symbol
          }))
        );
      }
    }
  }
  
  // Check for new tokens received
  for (const post of postTokenBalances) {
    if (post.owner !== walletAddress) continue;
    
    const pre = preTokenBalances.find(p => 
      p.mint === post.mint && p.owner === walletAddress
    );
    
    if (!pre) {
      // New token received
      const postAmount = Number(post.uiTokenAmount?.amount || 0) / Math.pow(10, post.uiTokenAmount?.decimals || 0);
      if (postAmount > 0.000001) {
        tokenPromises.push(
          getTokenSymbolFast(post.mint).then(symbol => ({
            mint: post.mint,
            amount: postAmount,
            symbol
          }))
        );
      }
    }
  }
  
  // Wait for all token symbol resolutions to complete
  const tokenChanges = await Promise.all(tokenPromises);
  changes.push(...tokenChanges);
  
  return changes.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

// Helper to calculate balance changes (legacy function)
function calculateBalanceChanges(preBalances: any[], postBalances: any[]) {
  const changes: Array<{mint: string, amount: number, symbol: string}> = [];
  
  for (const pre of preBalances) {
    const post = postBalances.find(p => p.mint === pre.mint);
    if (post) {
      const preAmount = Number(pre.uiTokenAmount?.amount || 0);
      const postAmount = Number(post.uiTokenAmount?.amount || 0);
      const diff = postAmount - preAmount;
      
      if (diff !== 0) {
        changes.push({
          mint: pre.mint,
          amount: diff,
          symbol: pre.uiTokenAmount?.symbol || pre.mint
        });
      }
    }
  }
  
  return changes.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

// Get recent transactions with optimized batching and pagination support
export async function getRecentTransactions(
  address: string, 
  limit = TX_LIMIT, 
  before?: string
): Promise<{transactions: Transaction[], hasMore: boolean, lastSignature?: string}> {
  try {
    const params: any = { 
      limit,
      commitment: COMMITMENT_LEVEL
    };
    
    if (before) {
      params.before = before;
    }

    const signatures = await callHeliusApi("getSignaturesForAddress", [
      address,
      params
    ]);

    if (!signatures || signatures.length === 0) {
      return { transactions: [], hasMore: false };
    }

    // Process transactions in batches to avoid overwhelming the API
    const batchSize = 3;
    const transactions: Transaction[] = [];
    
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((sig: any) => getTransactionDetails(sig.signature))
      );
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          transactions.push(result.value);
        }
      }
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < signatures.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Check if there are more transactions
    const hasMore = signatures.length === limit;
    const lastSignature = signatures.length > 0 ? signatures[signatures.length - 1].signature : undefined;

    return {
      transactions,
      hasMore,
      lastSignature
    };
  } catch (error) {
    console.error('Error in getRecentTransactions:', error);
    return { transactions: [], hasMore: false };
  }
}

// Get all transactions with automatic pagination
export async function getAllTransactions(
  address: string, 
  maxTransactions = 100
): Promise<{transactions: Transaction[], totalFetched: number}> {
  const allTransactions: Transaction[] = [];
  let before: string | undefined;
  let hasMore = true;
  let totalFetched = 0;

  while (hasMore && totalFetched < maxTransactions) {
    const remaining = maxTransactions - totalFetched;
    const limit = Math.min(TX_LIMIT, remaining);
    
    try {
      const result = await getRecentTransactions(address, limit, before);
      
      if (result.transactions.length === 0) {
        hasMore = false;
        break;
      }

      allTransactions.push(...result.transactions);
      totalFetched += result.transactions.length;
      
      // Set up for next page
      hasMore = result.hasMore && !!result.lastSignature;
      before = result.lastSignature;
      
      // Small delay between pages to respect rate limits
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Error fetching transactions page:', error);
      hasMore = false;
    }
  }

  return {
    transactions: allTransactions,
    totalFetched
  };
}

// Main API function with optimized parallel calls
export async function fetchWalletData(address: string): Promise<WalletData> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    throw new Error("Invalid Solana address");
  }

  try {
    console.log('Fetching wallet data for:', address);
    
    // Parallel calls for better performance
    const [balance, tokens, transactionsResult, solPrice] = await Promise.allSettled([
      getSolBalance(address),
      getTokenAccounts(address),
      getRecentTransactions(address, TX_LIMIT),
      getSolPrice()
    ]);

    const walletData: WalletData = {
      address,
      balance: balance.status === 'fulfilled' ? balance.value : 0,
      tokens: tokens.status === 'fulfilled' ? tokens.value : [],
      transactions: transactionsResult.status === 'fulfilled' ? transactionsResult.value.transactions : [],
      usdValue: 0
    };

    // Calculate USD value if we have both balance and price
    if (balance.status === 'fulfilled' && solPrice.status === 'fulfilled') {
      walletData.usdValue = balance.value * solPrice.value;
    }

    console.log('Wallet data fetched successfully:', { 
      balance: walletData.balance, 
      tokensCount: walletData.tokens.length, 
      transactionsCount: walletData.transactions.length,
      usdValue: walletData.usdValue
    });

    return walletData;
  } catch (err) {
    console.error("Error fetching wallet data:", err);
    throw new Error("Unable to fetch wallet data");
  }
}

// Additional utility functions for better performance

// Get specific token balance
export async function getTokenBalance(mint: string, owner: string): Promise<number> {
  try {
    const response = await callDASApi("getAssetsByOwner", {
      ownerAddress: owner,
      page: 1,
      limit: 1,
      displayOptions: {
        showFungible: true,
      },
    });

    const tokenAsset = response.items.find(asset => asset.id === mint);
    return tokenAsset?.token_info?.balance || 0;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}
