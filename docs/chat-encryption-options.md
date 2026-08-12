# SyncSpace chat encryption options

## Recommendation for the 50-student pilot

Do not design a new cryptographic protocol. If the pilot needs genuine end-to-end encryption, integrate an audited Matrix client stack and keep the SyncSpace server responsible only for project membership and room provisioning. If delivery speed is more important, begin with TLS plus encryption at rest and label it accurately as private server-hosted chat, not end-to-end encrypted chat.

The existing encrypted-chat prototype stays outside `main` on branch `prototype/encrypted-team-chat`. It is useful for validating the interaction design, but its browser Web Crypto construction is not production security.

## Options

### 1. Matrix Olm/Megolm - recommended integration path

- Designed for encrypted multi-device conversations and group rooms.
- Matrix recommends maintained cryptographic implementations such as `vodozemac` rather than rebuilding the ratchets.
- SyncSpace can create one private encrypted room per accepted team and invite only current creator/collaborator identities.
- Operational work remains: a Matrix homeserver or hosted provider, identity mapping, device verification, key backup/recovery, moderation metadata, push notifications, and member-removal tests.

### 2. Signal PQXDH plus Double Ratchet - strongest fit for one-to-one chat

- Provides a fresh message key and forward-security/break-in-recovery properties.
- Excellent for direct messages, but multi-device and project-group behavior require substantial protocol and state-management work.
- Use a maintained audited library. Copying the specification into custom application code is not an acceptable shortcut.

### 3. Messaging Layer Security (MLS) - standards-based group encryption

- IETF RFC 9420 is designed for asynchronous groups from two to thousands with forward secrecy and post-compromise security.
- Architecturally attractive for project teams, but the web ecosystem and product integration are more involved than Matrix for this pilot.

### 4. Browser Web Crypto - prototype only

- The Web Crypto API supports primitives such as X25519/ECDH, HKDF, and AES-GCM.
- It does not supply identity verification, a secure ratchet, device changes, skipped-message handling, group membership rotation, key backup, or recovery.
- A custom Web Crypto design can demonstrate encrypted payloads, but should not be marketed as secure production E2EE without an independent cryptographic review.

### 5. TLS plus database/storage encryption - simplest, not E2EE

- HTTPS protects messages in transit and managed storage encryption protects persisted data.
- The application server can still read plaintext, so administrators or a compromised server could read messages.
- This can be appropriate for a small disclosed pilot when abuse reporting and recovery matter more than endpoint-only secrecy.

## Cost

The cryptographic browser APIs and open protocol specifications do not charge per message. Costs come from message storage, database connections, realtime delivery, push notifications, backups, bandwidth, and any hosted Matrix provider. A low-traffic pilot may fit existing free quotas, but no free platform should be treated as a permanent availability guarantee.

## Minimum launch gate for genuine E2EE

- [ ] Threat model documents who should and should not read messages.
- [ ] Only accepted current team members receive room keys.
- [ ] Removing a member rotates future group keys.
- [ ] Device verification and lost-device recovery are designed and tested.
- [ ] Keys never enter application logs, analytics, error reports, or database rows.
- [ ] Message metadata retained by the server is disclosed.
- [ ] Abuse reporting behavior is defined without silently weakening E2EE.
- [ ] Independent security review and multi-device/browser interoperability tests pass.

## Primary references

- [Matrix end-to-end encryption implementation guide](https://matrix.org/docs/matrix-concepts/end-to-end-encryption/)
- [Signal Double Ratchet specification](https://signal.org/docs/specifications/doubleratchet/)
- [Signal PQXDH specification](https://signal.org/docs/specifications/pqxdh/)
- [IETF RFC 9420: Messaging Layer Security](https://www.rfc-editor.org/info/rfc9420/)
- [W3C Web Cryptography API](https://www.w3.org/TR/WebCryptoAPI/)
