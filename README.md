# Solana Web3 Dashboard

A modern, responsive Web3 dashboard for tracking Solana wallets, transactions, and on-chain analytics.

## 🚀 Features

- **Wallet Tracking**: Input any Solana wallet address to view balance and transaction history
- **Real-time Data**: Get up-to-date SOL balance and USD valuations  
- **Transaction History**: View detailed transaction logs with type, amount, and timestamps
- **Analytics**: Quick stats including total transactions, top tokens, and trading volume
- **Responsive Design**: Beautiful UI that works on desktop and mobile
- **Explorer Integration**: Direct links to Solscan for detailed transaction views

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React hooks
- **API Ready**: Prepared for Helius API integration
- **Backend Ready**: Supabase integration support for auth and data persistence

## 📦 Project Structure

```
src/
├── components/          # UI components
│   ├── WalletInput.tsx     # Wallet address input form
│   ├── WalletOverview.tsx  # Balance and address display
│   ├── StatsCards.tsx      # Analytics cards
│   ├── TransactionTable.tsx # Transaction history
│   └── WelcomeHero.tsx     # Landing hero section
├── lib/
│   └── solana-api.ts    # API functions (ready for Helius)
├── pages/
│   └── Dashboard.tsx    # Main dashboard page
└── assets/              # Images and static files
```

## 🔧 Setup & Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   npm run dev
   ```

2. **Environment Setup:**
   The project is ready to connect to external services:
   
   - **Helius API**: Update `src/lib/solana-api.ts` with your API key
   - **Supabase**: Use the Lovable Supabase integration for backend features

## 🔌 API Integration

### Helius API Setup
Replace the mock functions in `src/lib/solana-api.ts`:

```typescript
// Example Helius API integration
const HELIUS_API_KEY = "your-api-key-here";
const HELIUS_URL = `https://api.helius.xyz/v0`;

export async function fetchWalletData(address: string) {
  const response = await fetch(
    `${HELIUS_URL}/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`
  );
  return response.json();
}
```

### Supabase Integration
For authentication and favorites storage:

1. Click the Supabase button in Lovable to connect your project
2. Enable authentication (email/password recommended)  
3. Create tables for storing favorite wallets
4. Use Supabase client for data persistence

## 🎨 Design System

The dashboard uses a Web3-inspired design with:
- **Colors**: Solana purple/blue gradients with dark theme
- **Components**: Custom shadcn/ui variants with crypto aesthetics  
- **Animations**: Smooth transitions and glow effects
- **Typography**: Modern fonts with proper hierarchy
- **Mobile-first**: Responsive design for all devices

## 📱 Usage

1. **Enter Wallet Address**: Input any valid Solana wallet address
2. **View Analytics**: See balance, transaction count, top tokens, and volume
3. **Browse Transactions**: Review recent transactions with filtering
4. **External Links**: Click through to Solscan for detailed views
5. **Copy/Share**: Easy address copying and sharing functionality

## 🔮 Future Enhancements

- [ ] Connect Helius API for live data
- [ ] Add Supabase auth for user accounts  
- [ ] Implement favorites/watchlist functionality
- [ ] Add balance history charts with Recharts
- [ ] Include token price tracking
- [ ] Add transaction filtering and search
- [ ] Implement wallet connection (Phantom, Solflare)
- [ ] Add export functionality for transaction data

## 📄 License

This project is ready for deployment and can be customized for your specific needs.

---

**Ready to track Solana wallets like a pro!** 🌟