import { http, createConfig } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Polygon Amoy Testnet Configuration
export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    injected(), // MetaMask, Brave, etc.
  ],
  transports: {
    [polygonAmoy.id]: http(),
  },
});

