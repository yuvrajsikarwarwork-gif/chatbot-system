# System Architecture

Modules

connectors
backend-api
worker
bot-engine
database
shared-types


Runtime Pipeline

Platform
→ Connector
→ Backend API
→ Queue (queue_jobs / Redis)
→ Worker
→ Bot Engine
→ Database
→ Worker
→ Backend API
→ Connector
→ Platform


Database tables used at runtime

users
bots
flows
conversations
messages
integrations
conversation_state
analytics_events
agent_tickets
queue_jobs


Responsibilities

Connectors receive platform webhooks.

Backend API validates requests and inserts queue jobs.

Queue stores jobs for workers.

Worker consumes queue jobs.

Worker calls bot-engine.

Bot-engine executes flow logic.

Bot-engine updates conversation_state.

Worker writes messages.

Worker writes analytics_events.

Worker updates queue_jobs.

Backend API provides outgoing messages to connectors.

Shared-types defines common runtime contracts.


Rules

Worker writes runtime data.

Backend writes API data.

Engine writes state only.