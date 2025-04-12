/**
 * Utilities for handling referral codes
 */

/**
 * Extracts referral code from URL
 */
export function extractUIDFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  
  const url = new URL(window.location.href);
  const UID = url.searchParams.get('ref');
  
  if (UID) {
    // Store the referral code in session storage for later use
    sessionStorage.setItem('UID', UID);
    console.log(`Referral code detected: ${UID}`);
  }
  
  return UID;
}

/**
 * Gets stored referral code from session storage
 */
export function getStoredUID(): string | null {
  if (typeof window === 'undefined') return null;
  
  return sessionStorage.getItem('UID');
}

/**
 * Clears stored referral code
 */
export function clearStoredUID(): void {
  if (typeof window === 'undefined') return;
  
  sessionStorage.removeItem('UID');
}

/**
 * Apply a referral code to a user
 */
export async function applyUID(walletAddress: string, UID: string): Promise<boolean> {
  try {
    const response = await fetch('/api/referral/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        UID
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error applying referral code:', errorData.error);
      return false;
    }
    
    const data = await response.json();
    console.log('Referral code applied successfully:', data);
    
    // Clear the stored referral code after successful application
    clearStoredUID();
    
    return data.success;
  } catch (error) {
    console.error('Failed to apply referral code:', error);
    return false;
  }
} 