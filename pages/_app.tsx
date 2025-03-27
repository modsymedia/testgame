import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { WalletProvider } from '@/context/WalletContext';
import { PetNameModal } from '@/components/PetNameModal';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <PetNameModal />
      <Component {...pageProps} />
    </WalletProvider>
  );
} 