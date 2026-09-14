# Security

Creed is a local desktop application. The Markdown files you open remain on disk. Supporting state and recovery history are stored locally. These files are not encrypted by Creed; use macOS account protections, FileVault, and suitable backups. Local storage does not make data inherently secure.

## Local agents

The MCP service binds only to `127.0.0.1:38473`, validates the Host header, and rejects browser Origin headers. There is no login or connection approval. Any process running locally can connect if it knows a Creed endpoint. Session identifiers route connections and support disconnection; they are not authentication credentials. Agent names are self-reported.

Section permissions are enforced in Rust. Read-only sections cannot be modified by MCP. Proposal sections require user review. Direct sections permit agent changes without review. Proposals are bound to a file revision and stale proposals cannot be accepted.

Saved custom agents use a dedicated endpoint and stable local ID. Creed binds each session to that endpoint and attributes its proposals and activity to the saved agent. This identifies the connection configuration, not the software using it: another local process using the same URL receives the same attribution. Uploaded icons are converted to small PNG images and stored locally with the agent, never embedded in the user's Markdown.

Do not expose the local endpoint through a tunnel or reverse proxy. This product does not provide a remote multi-user security boundary.

## Network services

OpenRouter keys are stored in macOS Keychain, not returned to JavaScript. Optional AI requests send profile context to OpenRouter and the selected model provider. Connected agents may send context to their own services.

Feedback sends only the supplied message and app version to the website relay, which holds its Linear credential server-side. Configure upstream abuse protection when deploying that public endpoint; its in-process limit is only an additional safeguard.

Website sponsorships use Stripe and separate Supabase storage. Sponsor tables and atomic payment functions are service-role-only; public API responses expose only sponsor-wall fields. Stripe webhooks verify signatures before applying idempotent payment facts. Avatar uploads require the corresponding payment client secret. Never bundle website service credentials into the desktop app.

Updates must be signed and distributed over HTTPS. Apple notarization and updater signatures are separate requirements. Never put signing private keys in source.

Report vulnerabilities privately through the repository's GitHub security reporting channel. Do not include personal profiles or credentials in public issues.
