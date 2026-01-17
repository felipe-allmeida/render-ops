/**
 * Keycloak Admin API Client
 *
 * Used for user management operations like searching and creating users.
 */

interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  createdTimestamp: number;
}

interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface CreateUserParams {
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  enabled?: boolean;
  emailVerified?: boolean;
}

// Cache for admin token
let adminToken: { token: string; expiresAt: number } | null = null;

/**
 * Get Keycloak base URL and realm from issuer
 */
function getKeycloakConfig() {
  const issuer = process.env.KEYCLOAK_ISSUER;
  if (!issuer) {
    throw new Error('KEYCLOAK_ISSUER not configured');
  }

  // Parse issuer URL: http://localhost:8080/realms/render-ops
  const match = issuer.match(/^(https?:\/\/[^/]+)\/realms\/(.+)$/);
  if (!match) {
    throw new Error('Invalid KEYCLOAK_ISSUER format');
  }

  return {
    baseUrl: match[1],
    realm: match[2],
  };
}

/**
 * Get admin access token using client credentials
 */
async function getAdminToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (adminToken && adminToken.expiresAt > Date.now() + 60000) {
    return adminToken.token;
  }

  const { baseUrl, realm } = getKeycloakConfig();
  const clientId = process.env.KEYCLOAK_ID;
  const clientSecret = process.env.KEYCLOAK_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('KEYCLOAK_ID and KEYCLOAK_SECRET must be configured');
  }

  const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get admin token: ${error}`);
  }

  const data: KeycloakTokenResponse = await response.json();

  // Cache the token
  adminToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Search users by email or username
 */
export async function searchUsers(query: string, max: number = 10): Promise<KeycloakUser[]> {
  const { baseUrl, realm } = getKeycloakConfig();
  const token = await getAdminToken();

  const searchParams = new URLSearchParams({
    search: query,
    max: String(max),
  });

  const response = await fetch(
    `${baseUrl}/admin/realms/${realm}/users?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to search users: ${error}`);
  }

  return response.json();
}

/**
 * Find user by exact email
 */
export async function findUserByEmail(email: string): Promise<KeycloakUser | null> {
  const { baseUrl, realm } = getKeycloakConfig();
  const token = await getAdminToken();

  const searchParams = new URLSearchParams({
    email: email,
    exact: 'true',
  });

  const response = await fetch(
    `${baseUrl}/admin/realms/${realm}/users?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to find user: ${error}`);
  }

  const users: KeycloakUser[] = await response.json();
  return users.length > 0 ? users[0] : null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<KeycloakUser | null> {
  const { baseUrl, realm } = getKeycloakConfig();
  const token = await getAdminToken();

  const response = await fetch(
    `${baseUrl}/admin/realms/${realm}/users/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user: ${error}`);
  }

  return response.json();
}

/**
 * Create a new user in Keycloak
 */
export async function createUser(params: CreateUserParams): Promise<KeycloakUser> {
  const { baseUrl, realm } = getKeycloakConfig();
  const token = await getAdminToken();

  const userPayload = {
    username: params.email, // Use email as username
    email: params.email,
    firstName: params.firstName || '',
    lastName: params.lastName || '',
    enabled: params.enabled ?? true,
    emailVerified: params.emailVerified ?? false,
    credentials: params.password
      ? [
          {
            type: 'password',
            value: params.password,
            temporary: true, // Force password change on first login
          },
        ]
      : undefined,
    requiredActions: params.password ? [] : ['UPDATE_PASSWORD', 'VERIFY_EMAIL'],
  };

  const response = await fetch(`${baseUrl}/admin/realms/${realm}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userPayload),
  });

  if (response.status === 409) {
    throw new Error('User with this email already exists');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create user: ${error}`);
  }

  // Keycloak returns 201 with Location header containing the user ID
  const locationHeader = response.headers.get('Location');
  if (!locationHeader) {
    throw new Error('Failed to get created user ID');
  }

  // Extract user ID from location header
  const userId = locationHeader.split('/').pop();
  if (!userId) {
    throw new Error('Failed to parse user ID from location header');
  }

  // Fetch and return the created user
  const createdUser = await getUserById(userId);
  if (!createdUser) {
    throw new Error('Failed to fetch created user');
  }

  return createdUser;
}

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(userId: string): Promise<void> {
  const { baseUrl, realm } = getKeycloakConfig();
  const token = await getAdminToken();

  const response = await fetch(
    `${baseUrl}/admin/realms/${realm}/users/${userId}/execute-actions-email`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['UPDATE_PASSWORD']),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send password reset email: ${error}`);
  }
}

/**
 * Format user for API response (hide internal details)
 */
export function formatUserForResponse(user: KeycloakUser) {
  return {
    id: user.id,
    email: user.email || user.username,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}
