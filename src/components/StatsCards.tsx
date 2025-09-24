import { TrendingUp, Coins, Activity, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenAccount, Transaction } from "@/lib/solana-api";

interface Token {
  symbol: string;
  amount: number;
}

interface StatsData {
  tokens: TokenAccount[];
  transactions: Transaction[];
}

interface StatsCardsProps {
  data: StatsData;
}

export function StatsCards({ data }: StatsCardsProps) {
  const { tokens, transactions } = data;
  
  // Calculate real statistics
  const totalTransactions = transactions.length;
  
  // Calculate total tokens held (excluding SOL)
  const totalTokensHeld = tokens.filter(token => 
    token.mint !== "So11111111111111111111111111111111111111112" // Exclude SOL
  ).length;
  
  // Get top tokens by value using pre-calculated uiAmount
  const topTokens = tokens
    .filter(token => token.mint !== "So11111111111111111111111111111111111111112") // Exclude SOL
    .sort((a, b) => {
      // Use pre-calculated uiAmount for sorting
      return b.tokenAmount.uiAmount - a.tokenAmount.uiAmount;
    })
    .slice(0, 3)
    .map(token => {
      // Use pre-calculated uiAmount and round to 2 decimal places
      const balance = token.tokenAmount.uiAmount;
      return {
        symbol: token.tokenInfo?.symbol || token.mint.slice(0, 4) + "...",
        amount: Math.round(balance * 100) / 100 // Round to 2 decimal places
      };
    });
  
  // Calculate estimated trading volume from transactions
  const swapTransactions = transactions.filter(tx => 
    tx.type === "Swap" || tx.description?.includes("SWAP")
  );
  
  const tradingVolume = swapTransactions.reduce((total, tx) => {
    // Extract the larger amount from swap transactions
    const match = tx.description?.match(/SWAP ([\d.]+)\s+(\w+)\s*->\s*([\d.]+)\s+(\w+)/);
    if (match) {
      const amount1 = parseFloat(match[1]);
      const amount2 = parseFloat(match[3]);
      return total + Math.max(amount1, amount2);
    }
    return total;
  }, 0);
  
  // Calculate transaction types breakdown
  const swapCount = swapTransactions.length;
  const transferCount = transactions.filter(tx => 
    tx.type === "Send" || tx.type === "Receive" || tx.description?.includes("Send") || tx.description?.includes("Receive")
  ).length;
  const otherCount = totalTransactions - swapCount - transferCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Transactions */}
      <Card className="gradient-card border-accent/20 shadow-card hover:shadow-glow transition-glow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{totalTransactions}</div>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Swaps:</span>
              <span className="font-medium">{swapCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Transfers:</span>
              <span className="font-medium">{transferCount}</span>
            </div>
            {otherCount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Other:</span>
                <span className="font-medium">{otherCount}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tokens Held */}
      <Card className="gradient-card border-accent/20 shadow-card hover:shadow-glow transition-glow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tokens Held</CardTitle>
          <Wallet className="h-4 w-4 text-solana-blue" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-solana-blue">{totalTokensHeld}</div>
          <p className="text-xs text-muted-foreground mb-3">Unique SPL tokens</p>
          <div className="space-y-1">
            {topTokens.slice(0, 3).map((token, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="font-medium">{token.symbol}</span>
                <span className="text-muted-foreground">{token.amount.toFixed(2)}</span>
              </div>
            ))}
            {topTokens.length === 0 && (
              <div className="text-sm text-muted-foreground">No tokens found</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trading Volume */}
      <Card className="gradient-card border-accent/20 shadow-card hover:shadow-glow transition-glow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trading Volume</CardTitle>
          <TrendingUp className="h-4 w-4 text-solana-green" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-solana-green">
            {tradingVolume > 0 ? tradingVolume.toFixed(2) : '0.00'}
          </div>
          <p className="text-xs text-muted-foreground">Total swap volume</p>
          {swapCount > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Swap transactions:</span>
                <span className="font-medium">{swapCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Avg per swap:</span>
                <span className="font-medium">{swapCount > 0 ? (tradingVolume / swapCount).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}