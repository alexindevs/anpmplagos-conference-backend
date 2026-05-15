-- New enum values must be the only statement in this migration so Postgres can
-- commit before any later migration uses 'default' (see 55P04).
ALTER TYPE "SponsorTier" ADD VALUE 'default';
