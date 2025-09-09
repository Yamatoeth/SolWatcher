import heroImage from "@/assets/solana-hero.jpg";

export function WelcomeHero() {
  return (
    <div className="text-center py-16">
      <div className="space-y-6">
        <div className="relative mx-auto max-w-2xl">
          <img 
            src={heroImage} 
            alt="Solana Web3 Dashboard" 
            className="w-full h-64 object-cover rounded-2xl shadow-glow border border-accent/20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-2xl"></div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-bold gradient-solana bg-clip-text text-transparent">
            Welcome to Solana Dashboard
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Track any Solana wallet's balance, transactions, and analytics in real-time. 
            Enter a wallet address above to explore on-chain data with our professional Web3 dashboard.
          </p>
          
          <div className="flex items-center justify-center space-x-8 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">Real-time</div>
              <div className="text-sm text-muted-foreground">Data Updates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-solana-green">100%</div>
              <div className="text-sm text-muted-foreground">On-chain</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-solana-blue">24/7</div>
              <div className="text-sm text-muted-foreground">Monitoring</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}