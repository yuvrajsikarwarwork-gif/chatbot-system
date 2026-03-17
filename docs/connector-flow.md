# Connector Flow

Platforms

website
whatsapp
instagram
facebook


Flow

platform webhook
→ connector
→ backend-api
→ queue_jobs
→ worker
→ bot-engine
→ worker saves messages
→ connector gets response via backend-api
→ connector sends response to platform


Rules

Connector never calls engine.

Connector never reads database.

Connector never executes flow.

Connector only calls backend-api.