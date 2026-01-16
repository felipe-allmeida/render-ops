import { ActionResult, ActionParams } from './index';

// Get allowed domains from environment
function getAllowedDomains(): string[] {
  const allowlist = process.env.WEBHOOK_ALLOWLIST || '';
  return allowlist
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

// Allowed HTTP methods
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Validate URL against allowlist
 */
function isUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const allowedDomains = getAllowedDomains();

    // If no allowlist is configured, block all requests
    if (allowedDomains.length === 0) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    // Check if hostname matches any allowed domain
    return allowedDomains.some((domain) => {
      // Support wildcard subdomains (e.g., *.example.com)
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2);
        return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
      }
      return hostname === domain;
    });
  } catch {
    return false;
  }
}

/**
 * http_request - Make an HTTP request to an allowed endpoint
 */
export async function httpRequest(
  params: ActionParams,
  userId: string
): Promise<ActionResult> {
  try {
    const { url, method = 'GET', headers = {}, body } = params;

    if (!url) {
      return { success: false, error: 'URL is required' };
    }

    // Validate URL against allowlist
    if (!isUrlAllowed(url)) {
      return {
        success: false,
        error: 'URL domain is not in the allowlist. Contact administrator to add it.',
      };
    }

    // Validate method
    const upperMethod = method.toUpperCase();
    if (!ALLOWED_METHODS.includes(upperMethod)) {
      return {
        success: false,
        error: `Invalid HTTP method. Allowed methods: ${ALLOWED_METHODS.join(', ')}`,
      };
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: upperMethod,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RenderOps/1.0',
        'X-Request-User': userId,
        ...headers,
      },
    };

    // Add body for non-GET requests
    if (body && upperMethod !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    // Set timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeout);

      // Parse response
      let responseData: unknown;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: responseData,
        };
      }

      return {
        success: true,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData,
        },
      };
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return { success: false, error: 'Request timed out after 30 seconds' };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('http_request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'HTTP request failed',
    };
  }
}
