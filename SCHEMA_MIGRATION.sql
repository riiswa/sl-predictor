-- Non-Destructive Scoring System Schema Migration
-- Copy and paste each section into the Supabase SQL Editor

-- 1. Add new columns to competition_scores table
-- Run this first:
ALTER TABLE public.competition_scores
ADD COLUMN IF NOT EXISTS scoring_run_id UUID,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scoring_config_snapshot JSONB,
ADD COLUMN IF NOT EXISTS scored_by UUID;

-- 2. Create unique constraint including scoring_run_id
-- First, drop the old unique constraint if it exists:
ALTER TABLE public.competition_scores
DROP CONSTRAINT IF EXISTS competition_scores_user_id_competition_id_key;

-- Add the new constraint:
ALTER TABLE public.competition_scores
ADD CONSTRAINT competition_scores_user_comp_run_unique
UNIQUE (user_id, competition_id, scoring_run_id);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_competition_scores_is_active
ON public.competition_scores(is_active);

CREATE INDEX IF NOT EXISTS idx_competition_scores_user_active
ON public.competition_scores(user_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_competition_scores_scoring_run
ON public.competition_scores(scoring_run_id);

-- 4. Create trigger function to sync profiles.total_points
CREATE OR REPLACE FUNCTION public.sync_user_total_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's total_points to sum of all active competition_scores
  UPDATE public.profiles
  SET total_points = (
    SELECT COALESCE(SUM(cs.points), 0)
    FROM public.competition_scores cs
    WHERE cs.user_id = NEW.user_id AND cs.is_active = true
  )
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to call the function on insert/update/delete
DROP TRIGGER IF EXISTS trigger_sync_total_points ON public.competition_scores;
CREATE TRIGGER trigger_sync_total_points
AFTER INSERT OR UPDATE OR DELETE ON public.competition_scores
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_total_points();

-- 6. Backfill scoring_run_id for existing records (optional - for data integrity)
-- This creates unique scoring runs for existing data:
UPDATE public.competition_scores
SET scoring_run_id = gen_random_uuid()
WHERE scoring_run_id IS NULL;

-- 7. Make scoring_run_id NOT NULL after backfill
ALTER TABLE public.competition_scores
ALTER COLUMN scoring_run_id SET NOT NULL;

-- 8. Optional: Backfill is_active=true for existing records (should already be true by default)
UPDATE public.competition_scores
SET is_active = true
WHERE is_active IS NULL;

-- 9. Make is_active NOT NULL
ALTER TABLE public.competition_scores
ALTER COLUMN is_active SET NOT NULL;
