# Trigger Flow API

`POST /api/v1/trigger-flow`

This endpoint lets an external CRM, scheduler, or automation tool force-start a bot flow for an existing conversation or for a contact that should be created/resolved at runtime.

## Authentication

Send one of these headers:

- `x-engine-secret: <INTERNAL_ENGINE_SECRET>`
- `x-trigger-secret: <INTERNAL_ENGINE_SECRET>`

You may also send `secret` in the JSON body, but headers are preferred.

## Idempotency

Supported request keys:

- `idempotencyKey`
- `externalTriggerId`

If you do not send one, the backend applies a short auto-dedupe window based on the request fingerprint to suppress duplicate retries.

Possible outcomes:

- fresh execution: `200 OK`
- duplicate completed request: `200 OK` with `deduped: true`
- duplicate in-flight request: `202 Accepted` with `processing: true`

## Request Body

At least one of these identity inputs is required:

- `conversationId`
- `contactId`
- `platformUserId`
- `phone`
- `email`

Example:

```json
{
  "idempotencyKey": "crm-booking-evt-1001",
  "botId": "a8f7edd6-adc7-46ca-aa62-258fd88e2de7",
  "flowId": "11111111-2222-3333-4444-555555555555",
  "platform": "whatsapp",
  "platformUserId": "916268434155",
  "contactName": "Yuvraj Sikarwar",
  "variables": {
    "service_type": "oil change",
    "preferred_date": "2026-03-29",
    "preferred_time": "10:30 AM"
  },
  "context": {
    "campaignId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "entryPointId": "ffffffff-1111-2222-3333-444444444444"
  }
}
```

## Optional Fields

- `botId`
- `flowId`
- `startNodeId`
- `conversationId`
- `contactId`
- `platform`
- `channel`
- `platformUserId`
- `phone`
- `email`
- `contactName`
- `variables`
- `context.workspaceId`
- `context.projectId`
- `context.campaignId`
- `context.channelId`
- `context.entryPointId`
- `context.listId`
- `context.platformAccountId`
- `context.entryKey`

## Response

Example success response:

```json
{
  "success": true,
  "receiptId": "7b559b36-0ce3-4a83-a1fc-55ed1ca8d5d0",
  "idempotencyKey": "crm-booking-evt-1001",
  "conversationId": "f12f58ec-6a77-4b78-bc3c-7a5ef13714f8",
  "contactId": "c3fcce19-8f5f-4838-a13c-bc0c1de8cf7f",
  "botId": "a8f7edd6-adc7-46ca-aa62-258fd88e2de7",
  "flowId": "11111111-2222-3333-4444-555555555555",
  "startNodeId": "node-start",
  "actionCount": 1,
  "actions": [
    {
      "type": "text",
      "text": "Thanks, we have started your booking flow."
    }
  ]
}
```

## Notes

- If `conversationId` is provided, the trigger reuses that conversation.
- If only contact identity is provided, the backend resolves or creates the contact and conversation.
- `variables` are merged into the conversation before the flow executes.
- Generated actions are dispatched immediately through the normal runtime message router.
