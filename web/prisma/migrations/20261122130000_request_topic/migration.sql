-- Requests to SenecAI from inside the Hub (e.g. help with a regulation the
-- Hub does not cover yet) share the demo-request inbox and its row-level
-- security; the topic tells them apart. Null = demo request from the
-- landing page.
ALTER TABLE "DemoRequest" ADD COLUMN "topic" TEXT;
