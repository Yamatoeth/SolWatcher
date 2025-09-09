import { TrendingUp, Coins, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsData {
  totalTransactions: number;
  topTokens: Array<{ symbol: string; amount: number; }>;
  tradingVolume: number;
}

interface StatsCardsProps {
  data: StatsData;
}

export function StatsCards({ data }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Transactions */}
      <Card className="gradient-card border-accent/20 shadow-card hover:shadow-glow transition-glow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{data.totalTransactions}</div>
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
            {data.topTokens.slice(0, 3).map((token, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="font-medium">{token.symbol}</span>
                <span className="text-muted-foreground">{token.amount.toFixed(2)}</span>
              </div>
            ))}
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
          <div className="text-2xl font-bold text-solana-green">${data.tradingVolume.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Estimated 30d volume</p>
        </CardContent>
      </Card>
    </div>
  );
}