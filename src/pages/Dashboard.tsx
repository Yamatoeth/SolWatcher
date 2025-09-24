import { useState } from "react";
import { WalletInput } from "@/components/WalletInput";
import { WalletOverview } from "@/components/WalletOverview";
import { StatsCards } from "@/components/StatsCards";
import { TransactionTable } from "@/components/TransactionTable";
import { WelcomeHero } from "@/components/WelcomeHero";
import { fetchWalletData, WalletData } from "@/lib/solana-api";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleWalletSubmit = async (address: string) => {
    setLoading(true);
    try {
      // Fetch wallet data via the unified API
      const walletInfo = await fetchWalletData(address);

      setWalletData(walletInfo);

      toast({
        title: "Wallet loaded successfully",
        description: `Loaded data for ${address.slice(0, 6)}...${address.slice(-4)}`,
      });
    } catch (error) {
      toast({
        title: "Error loading wallet",
        description: "Failed to fetch wallet data. Please try again.",
        variant: "destructive",
      });
      console.error("Error fetching wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-accent/20 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold gradient-solana bg-clip-text text-transparent">
              Solana Dashboard
            </h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-solana-green rounded-full animate-pulse"></div>
              <span>Mainnet</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Wallet Input */}
        <WalletInput onWalletSubmit={handleWalletSubmit} loading={loading} />

        {/* Dashboard Content */}
        {walletData && (
          <div className="space-y-8 animate-fade-in">
            {/* Wallet Overview */}
            <WalletOverview
              address={walletData.address}
              balance={walletData.balance}
              usdValue={walletData.usdValue}
            />

            {/* Stats Cards */}
            {walletData.tokens.length > 0 && (
              <StatsCards data={{ 
                tokens: walletData.tokens, 
                transactions: walletData.transactions 
              }} />
            )}

            {/* Transaction History */}
            {walletData.transactions.length > 0 && (
              <TransactionTable transactions={walletData.transactions} />
            )}
          </div>
        )}

        {/* Welcome State */}
        {!walletData && !loading && <WelcomeHero />}
      </main>
    </div>
  );
}