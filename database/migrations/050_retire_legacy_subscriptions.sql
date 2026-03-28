DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'subscriptions'
    ) THEN
        CREATE TABLE IF NOT EXISTS subscriptions_legacy_archive
        (LIKE subscriptions INCLUDING ALL);

        INSERT INTO subscriptions_legacy_archive
        SELECT s.*
        FROM subscriptions s
        WHERE NOT EXISTS (
            SELECT 1
            FROM subscriptions_legacy_archive archive
            WHERE archive.id = s.id
        );

        DROP TABLE subscriptions;
    END IF;
END $$;
