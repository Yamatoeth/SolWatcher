import { ExternalLink, ArrowUpRight, ArrowDownLeft, RefreshCw, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Transaction {
  signature: string;
  type: "transfer" | "swap" | "mint" | "burn" | "stake" | "unstake";
  token: string;
  amount: number;
  timestamp: number;
  status: "success" | "failed";
}

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const getTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "transfer":
        return <ArrowUpRight className="h-4 w-4" />;
      case "swap":
        return <RefreshCw className="h-4 w-4" />;
      case "mint":
      case "burn":
        return <Coins className="h-4 w-4" />;
      case "stake":
      case "unstake":
        return <ArrowDownLeft className="h-4 w-4" />;
      default:
        return <ArrowUpRight className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: Transaction["type"]) => {
    switch (type) {
      case "transfer":
        return "text-solana-blue";
      case "swap":
        return "text-solana-purple";
      case "mint":
        return "text-solana-green";
      case "burn":
        return "text-destructive";
      case "stake":
      case "unstake":
        return "text-primary";
      default:
        return "text-foreground";
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
                    <div className={`p-2 rounded-full bg-muted ${getTypeColor(tx.type)}`}>
                      {getTypeIcon(tx.type)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium capitalize">{tx.type}</span>
                        <Badge variant={tx.status === "success" ? "default" : "destructive"}>
                          {tx.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tx.amount.toFixed(4)} {tx.token}
                      </p>
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