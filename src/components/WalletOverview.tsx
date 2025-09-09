import { ExternalLink, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface WalletOverviewProps {
  address: string;
  balance: number;
  usdValue?: number;
}

export function WalletOverview({ address, balance, usdValue }: WalletOverviewProps) {
  const { toast } = useToast();

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "Wallet address copied to clipboard",
    });
  };

  const openInSolscan = () => {
    window.open(`https://solscan.io/account/${address}`, "_blank");
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Card className="gradient-card border-accent/20 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Wallet Overview</span>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={openInSolscan}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Address</p>
          <p className="font-mono text-sm">{truncateAddress(address)}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">SOL Balance</p>
            <p className="text-2xl font-bold text-solana-purple">{balance.toFixed(4)} SOL</p>
          </div>
          
          {usdValue && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">USD Value</p>
              <p className="text-2xl font-bold text-solana-green">${usdValue.toLocaleString()}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}