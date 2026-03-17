# Message Flow

1. User sends message to platform

2. Platform sends webhook to connector

3. Connector normalizes message

4. Connector sends message to backend-api

5. backend-api validates request

6. backend-api inserts queue_jobs record

7. worker reads queue_jobs

8. worker calls bot-engine

9. bot-engine loads flow

10. bot-engine updates conversation_state

11. bot-engine returns replies

12. worker saves messages

13. worker logs analytics_events

14. worker marks queue_jobs done

15. connector requests outgoing messages via backend-api

16. connector sends response to platform