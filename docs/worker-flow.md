# Worker Flow

Worker responsibilities

read queue_jobs
call bot-engine
save messages
update conversation_state
write analytics_events
mark job done


Flow

queue_jobs
→ worker
→ bot-engine
→ database
→ worker
→ queue_jobs updated


Rules

Worker does not call connectors.

Worker does not call frontend.

Worker does not execute flow logic.

Worker must call bot-engine.

Worker inserts outgoing messages.

Worker updates conversation_state.

Worker logs analytics_events.