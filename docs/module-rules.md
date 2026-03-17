# Module Rules


connectors

must not access database
must not call engine
must not call worker
only call backend-api


backend-api

must not execute flow
must not call engine
must not modify conversation_state
must insert queue_jobs
must provide API responses


worker

must not call connectors
must not call frontend
must read queue_jobs
must call bot-engine
must insert messages
must update conversation_state
must write analytics_events


bot-engine

must not insert messages
must not access integrations
must not access queue_jobs
must only read flows
must update conversation_state
must return replies


database

storage only
no logic


shared-types

must match database schema
must match queue payload
must match engine request
must match API response