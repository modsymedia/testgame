import '../app/globals.css';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { dbService } from '../lib/database-service';
import { WalletProvider } from '@/context/WalletContext';
import { UserDataProvider } from '@/context/UserDataContext';
import { initDatabase } from '../lib/database-schema';

// Initialize the database when the app starts on the server side
if (typeof window === 'undefined') {
  initDatabase()
    .then(success => {
      console.log(`Database initialization ${success ? 'successful' : 'failed'}`);
    })
    .catch(error => {
      console.error('Error during database initialization:', error);
    });
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  // Setup router events to ensure data is saved before navigation
  useEffect(() => {
    const handleRouteChangeStart = async () => {
      // Force synchronize data before navigating
      try {
        setIsSyncing(true);
        await dbService.forceSynchronize();
      } catch (error) {
        console.error('Error synchronizing data before navigation:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleRouteChangeComplete = () => {
      setIsSyncing(false);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeComplete);
    };
  }, [router.events]);

  // Setup visibility change event to sync data when tab becomes hidden/visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // About to hide tab, synchronize immediately
        try {
          await dbService.forceSynchronize();
        } catch (error) {
          console.error('Error synchronizing data on tab hide:', error);
        }
      } else if (document.visibilityState === 'visible') {
        // Tab is visible again, check for updates
        try {
          await dbService.synchronize();
        } catch (error) {
          console.error('Error synchronizing data on tab show:', error);
        }
      }
    };

    // Register event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Setup beforeunload to ensure data is saved when page is closed
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Try to force sync
      dbService.forceSynchronize().catch(console.error);

      // Show confirmation if we have unsaved changes
      if (dbService.hasPendingChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Periodic sync to ensure data is saved
  useEffect(() => {
    const syncInterval = setInterval(() => {
      dbService.synchronize().catch(error => {
        console.error('Error during periodic sync:', error);
      });
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <WalletProvider>
      <UserDataProvider>
        {isSyncing && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-center text-xs py-1">
            Saving your progress...
          </div>
        )}
        <Component {...pageProps} />
      </UserDataProvider>
    </WalletProvider>
  );
} 