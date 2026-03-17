# Database Schema


Tables

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


Relations

user → bots

bot → flows

bot → conversations

conversation → messages

conversation → conversation_state

bot → integrations

bot → analytics_events

bot → queue_jobs

conversation → agent_tickets


Description

Database stores configuration and runtime data.

Backend writes API data.

Worker writes runtime data.

Engine writes state data.