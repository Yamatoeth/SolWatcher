import { TrendingUp, Coins, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Token {
  symbol: string;
  amount: number;
}

interface StatsData {
  totalTransactions?: number;
  topTokens?: Token[];
  tradingVolume?: number;
}

interface StatsCardsProps {
  data: StatsData;
}

export function StatsCards({ data }: StatsCardsProps) {
  const totalTransactions = data.totalTransactions ?? 0;
  const topTokens = data.topTokens ?? [];
  const tradingVolume = data.tradingVolume ?? 0;

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
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </CardContent>
      </Card>

      {/* Top Tokens */}
      <Card className="gradient-card border-accent/20 shadow-card hover:shadow-glow transition-glow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Tokens</CardTitle>
          <Coins className="h-4 w-4 text-solana-blue" />
        </CardHeader>
        <CardContent>
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
            ${tradingVolume.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Estimated 30d volume</p>
        </CardContent>
      </Card>
    </div>
  );
}