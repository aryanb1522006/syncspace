# Connected profile implementation

Source: the supplied syncspace-main.zip, extracted without editing the original archive.

1. Establish a clean ZIP baseline and run existing checks.
2. Add optional GitHub/LinkedIn URLs and explicit private/team/college visibility. Extend PostgreSQL, validated APIs, demo adapter, and both profile views. Test this phase before continuing.
3. Add authenticated GitHub OAuth and LinkedIn OIDC linking with short-lived single-use transactions, browser binding, provider identity uniqueness, encrypted server-only credentials, and reconnect/disconnect behavior. Preserve college Google identity. Test authorization failures and replay.
4. Add public GitHub metadata import, selected featured repositories, and reviewed dictionary skill suggestions. Imported content stays in a preview until explicitly accepted. Do not request private repository or email access. Test imports against mocked provider HTTP and real local PostgreSQL.
5. Run full regressions, production build, and desktop/mobile browser checks. Package source and phase evidence.
6. Prepare the live deployment using the current remote state, additive migrations, disabled-until-configured provider controls, and explicit credentials/callback setup. Do not claim provider authorization or live deployment from mocks. Record any external setup still required.

Local implementation gates are in GATES.md. Live credentials and successful provider consent are external acceptance checks, recorded separately in the deployment handoff.
