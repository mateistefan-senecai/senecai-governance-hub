-- Structured facts on each AI system (step 1) that the classification
-- (step 2) reads instead of asking again: areas of use, affected groups and
-- capabilities. Ids come from the content library. Existing systems start
-- empty and are asked to complete them before their next classification.
ALTER TABLE "AiSystem" ADD COLUMN "areas" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AiSystem" ADD COLUMN "affectedGroups" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AiSystem" ADD COLUMN "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[];
