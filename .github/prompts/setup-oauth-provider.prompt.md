---
description: Configure OAuth provider client IDs so social login buttons appear in the UI
mode: agent
---

# Setup OAuth Provider

The user wants to configure an OAuth provider (Google, GitHub, or both) for the TenantTracker app so that the `SocialLoginButtons` component renders in the login/register pages.

## How It Works

Social login buttons only appear when the provider's `clientId` is set. The visibility is controlled by `getAvailableProviders()` which filters out providers with empty client IDs.

**Config chain:** `.env` → `VITE_*_CLIENT_ID` → `config/oauth.js` → `getAvailableProviders()` → `SocialLoginButtons`

## Steps

1. Ask the user which provider(s) they want to enable: **Google**, **GitHub**, or **both**.
2. For each provider, ask the user for their OAuth **Client ID** (and confirm they have the Client Secret configured on the backend).
3. Determine which frontend the user is working with:
   - `frontend/.env` (Docker-based frontend)
   - `TenantTracker-Web/.env` (src2 Vite frontend)
4. Create or update the `.env` file with the provided client IDs:
   - `VITE_GOOGLE_CLIENT_ID=<their-client-id>`
   - `VITE_GITHUB_CLIENT_ID=<their-client-id>`
5. Remind the user to also configure the **backend** `.env` with the corresponding `GOOGLE_CLIENT_SECRET` / `GITHUB_CLIENT_SECRET`.
6. Remind the user to set the correct **OAuth redirect URI** in their provider's developer console:
   - Google: `http://localhost:5173/auth/callback/google`
   - GitHub: `http://localhost:5173/auth/callback/github`
7. Restart the Vite dev server so the new env vars are picked up.
8. Verify the buttons appear by checking that `getAvailableProviders()` now returns the configured providers.
