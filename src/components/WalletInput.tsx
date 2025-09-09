import { useState } from "react";
import { Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface WalletInputProps {
  onWalletSubmit: (address: string) => void;
  loading?: boolean;
}

export function WalletInput({ onWalletSubmit, loading = false }: WalletInputProps) {
  const [walletAddress, setWalletAddress] = useState("");

  const validateSolanaAddress = (address: string) => {
    // Basic Solana address validation (base58, 32-44 chars)
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaRegex.test(address);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateSolanaAddress(walletAddress)) {
      onWalletSubmit(walletAddress);
    }
  };

  return (
    <Card className="p-6 gradient-card border-accent/20 shadow-glow">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Track Solana Wallet</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Enter Solana wallet address..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="flex-1 crypto-border bg-muted/50 transition-glow focus:shadow-glow"
            />
            <Button
              type="submit"
              disabled={!validateSolanaAddress(walletAddress) || loading}
              className="gradient-solana hover:shadow-glow transition-glow"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {walletAddress && !validateSolanaAddress(walletAddress) && (
            <p className="text-destructive text-sm">Please enter a valid Solana wallet address</p>
          )}
        </form>
      </div>
    </Card>
  );
}