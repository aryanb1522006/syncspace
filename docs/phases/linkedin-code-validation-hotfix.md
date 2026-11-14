# LinkedIn authorization-code validation hotfix

The LinkedIn callback accepted opaque authorization codes up to 2,000 characters, but the exchange endpoint reused GitHub's 200-character schema. A longer LinkedIn code therefore reached the hash callback page but the API returned `Validation failed` before contacting LinkedIn. The earlier HTTP fixture used `code`, so it did not exercise this mismatch.

LinkedIn's exchange now uses the same named 2,000-character limit as its callback. GitHub's input rules, state signatures, initiating-browser proof, one-time claims, expiry, nonce and ID-token checks stay intact. Oversized codes fail before claiming state or calling the provider. No schema migration, provider credential change or frontend rebuild is required for this server repair.

The regression sends a synthetic 2,000-character code through the HTTP callback and authenticated exchange, checks byte-for-byte forwarding into the provider's form body, rejects 2,001-character codes on both endpoints without consuming state, and verifies replay rejection. It failed against the original code with HTTP 400 and passes with the fix.

Deploy the merged commit to the Render API service (branch `main`). Confirm the deployment is Live, then open the profile and start **Connect LinkedIn** again. Do not reload or reuse the failed callback: the client clears its URL parameters and browser proof. Actual provider consent still needs verification with the owner's configured account; synthetic provider tests do not establish a successful live consent.
