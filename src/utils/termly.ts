/**
 * Termly API Key Utility
 * 
 * This utility provides access to the Termly API key for backend cookie management.
 * 
 * Usage:
 * - If your website sets cookies from the backend, you will not have access to the JS Callback
 * - Use this API key to retrieve the cookie whitelist your visitor has consented to
 * - The API key should be stored in your .env file as TERMLY_API_KEY
 * 
 * API Documentation: https://app.termly.io/
 */

/**
 * Get the Termly API key from environment variables
 * @returns The Termly API key or undefined if not set
 */
export function getTermlyApiKey(): string | undefined {
  return import.meta.env.TERMLY_API_KEY;
}

/**
 * Check if the Termly API key is configured
 * @returns true if the API key is set, false otherwise
 */
export function hasTermlyApiKey(): boolean {
  return !!getTermlyApiKey();
}
