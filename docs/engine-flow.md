# Engine Flow

Input

message
conversation_id
bot_id


Steps

load bot
load flow
load conversation_state
find current node
execute node
update conversation_state
generate replies
return replies


Allowed tables

flows
bots
conversation_state
analytics_events
agent_tickets


Not allowed

messages
queue_jobs
integrations
users


Rules

Engine must not insert messages.

Engine must not access queue_jobs.

Engine must not access integrations.

Engine returns replies.

Worker saves replies.