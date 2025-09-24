import { ExternalLink, ArrowUpRight, ArrowDownLeft, RefreshCw, Coins, TrendingUp, TrendingDown, DollarSign, Shield, Zap, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/lib/solana-api";

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const getTypeIcon = (type: Transaction["type"], detailedType?: string) => {
    // Use detailedType for better icon selection
    if (detailedType) {
      if (detailedType.includes("Swap")) return <RefreshCw className="h-4 w-4" />;
      if (detailedType.includes("Transfer")) return type === "Send" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />;
      if (detailedType.includes("Borrow") || detailedType.includes("Loan")) return <TrendingUp className="h-4 w-4" />;
      if (detailedType.includes("Repay")) return <TrendingDown className="h-4 w-4" />;
      if (detailedType.includes("Stake")) return <Shield className="h-4 w-4" />;
      if (detailedType.includes("Reward")) return <DollarSign className="h-4 w-4" />;
      if (detailedType.includes("Liquidity")) return <Droplets className="h-4 w-4" />;
    }
    
    // Fallback to basic type
    switch (type.toLowerCase()) {
      case "send":
        return <ArrowUpRight className="h-4 w-4" />;
      case "receive":
        return <ArrowDownLeft className="h-4 w-4" />;
      case "swap":
        return <RefreshCw className="h-4 w-4" />;
      case "borrow":
        return <TrendingUp className="h-4 w-4" />;
      case "repay":
        return <TrendingDown className="h-4 w-4" />;
      case "stake":
        return <Shield className="h-4 w-4" />;
      case "unstake":
        return <DollarSign className="h-4 w-4" />;
      case "liquidity":
        return <Droplets className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: Transaction["type"], detailedType?: string) => {
    // Use detailedType for better color selection
    if (detailedType) {
      if (detailedType.includes("Swap")) return "text-solana-purple";
      if (detailedType.includes("Transfer")) return "text-solana-blue";
      if (detailedType.includes("Borrow") || detailedType.includes("Loan")) return "text-green-600";
      if (detailedType.includes("Repay")) return "text-orange-600";
      if (detailedType.includes("Stake")) return "text-blue-600";
      if (detailedType.includes("Reward")) return "text-yellow-600";
      if (detailedType.includes("Liquidity")) return "text-cyan-600";
    }
    
    // Fallback to basic type
    switch (type.toLowerCase()) {
      case "send":
        return "text-red-600";
      case "receive":
        return "text-green-600";
      case "swap":
        return "text-solana-purple";
      case "borrow":
        return "text-green-600";
      case "repay":
        return "text-orange-600";
      case "stake":
        return "text-blue-600";
      case "unstake":
        return "text-yellow-600";
      case "liquidity":
        return "text-cyan-600";
      default:
        return "text-foreground";
    }
  };

  const getProtocolColor = (protocol?: string) => {
    if (!protocol) return "bg-gray-100 text-gray-800";
    
    switch (protocol.toLowerCase()) {
      case "jupiter":
        return "bg-orange-100 text-orange-800";
      case "raydium":
        return "bg-red-100 text-red-800";
      case "orca":
        return "bg-blue-100 text-blue-800";
      case "meteora":
        return "bg-purple-100 text-purple-800";
      case "kamino":
        return "bg-green-100 text-green-800";
      case "solend":
        return "bg-yellow-100 text-yellow-800";
      case "marginfi":
        return "bg-indigo-100 text-indigo-800";
      case "drift":
        return "bg-pink-100 text-pink-800";
      case "wormhole":
        return "bg-teal-100 text-teal-800";
      case "tensor":
        return "bg-cyan-100 text-cyan-800";
      case "magic eden":
        return "bg-violet-100 text-violet-800";
      case "marinade":
        return "bg-emerald-100 text-emerald-800";
      case "phoenix":
        return "bg-amber-100 text-amber-800";
      case "solana":
        return "bg-solana-bg text-solana-text";
      case "token transfer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openTransaction = (signature: string) => {
    window.open(`https://solscan.io/tx/${signature}`, "_blank");
  };

  return (
    <Card className="gradient-card border-accent/20 shadow-card">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 crypto-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full bg-muted ${getTypeColor(tx.type, tx.detailedType)}`}>
                      {getTypeIcon(tx.type, tx.detailedType)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium capitalize">{tx.detailedType || tx.type}</span>
                        <Badge variant={tx.status === "success" ? "default" : "destructive"}>
                          {tx.status}
                        </Badge>
                        {tx.protocol && tx.protocol !== "Unknown" && (
                          <Badge className={`text-xs ${getProtocolColor(tx.protocol)}`}>
                            {tx.protocol}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tx.description || `${tx.amount.toFixed(4)} ${tx.token}`}
                      </p>
                      {tx.fromToken && tx.toToken && tx.fromToken !== tx.toToken && (
                        <p className="text-xs text-muted-foreground">
                          {tx.fromToken} → {tx.toToken}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {formatDate(tx.timestamp)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openTransaction(tx.signature)}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}