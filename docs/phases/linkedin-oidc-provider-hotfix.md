# LinkedIn OIDC provider compatibility repair

After the authorization-code length fix, the deployed connection reached ID-token validation and failed there. The implementation pinned the issuer to an older documentation example (`https://www.linkedin.com`), while LinkedIn's live discovery metadata advertises `https://www.linkedin.com/oauth`. The original fixtures repeated the old example, masking the mismatch.

The verifier now accepts only those two exact LinkedIn-owned issuer identifiers. It still verifies the RS256 signature using LinkedIn's fixed JWKS endpoint, key ID, audience, authorized party, expiry, issue time and matching user-info subject. It never trusts an issuer or key URL supplied by an unverified token.

New authorization requests follow the confidential authorization-code flow with signed, expiring state, a server-side single-use transaction and an initiating-browser proof. They do not request an optional nonce. This matches the maintained Auth.js LinkedIn provider's state-based code-flow configuration. OIDC code flow permits omission of nonce when it was not requested. Previously started requests that contain a stored nonce still require that exact signed-token nonce; missing or wrong nonce remains an error. The change is explicit provider configuration, not a fallback that silently ignores a missing requested claim.

Token validation failures now have a fixed diagnostic reason (for example `issuer_mismatch`, `invalid_signature`, `audience_mismatch`, `token_expired`, or `nonce_missing`). The API logs only provider/stage/reason with the existing request ID. No token, authorization code, nonce, claims, provider response body or secret is logged. The user still sees a generic failure message; the API response includes the fixed reason for troubleshooting.

Tests cover current-issuer tokens without an unrequested nonce, previous-issuer compatibility, strict legacy nonce matching, lookalike/wrong issuers, wrong audience, expired tokens, wrong signing key/signature, future issue time, mismatched subject, browser binding, replay, duplicate connection and disconnect during exchange. Full HTTP tests use the current issuer and prove new requests do not send/store a nonce. The original validator rejects the new current-provider fixture; the repaired validator accepts it while rejecting negative cases.

Deploy the merged commit to Render's API service, then start **Connect LinkedIn** afresh from the profile. No secret replacement, migration or frontend change is required. Do not reuse an old callback. Actual owner consent remains a separate verification step; matching provider fixtures do not establish completed live consent.

Primary references checked during repair:

- [LinkedIn live discovery metadata](https://www.linkedin.com/oauth/.well-known/openid-configuration)
- [LinkedIn older OIDC documentation](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Auth.js LinkedIn provider implementation](https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/providers/linkedin.ts)
- [OpenID Connect Core: authorization-code ID-token validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
