-- 1. Fix predictor_standings view to exclude inactive competition scores.
--    Without this filter, scores from unrevealed competitions (is_active = false)
--    are still summed, causing points to appear higher than they should be.
CREATE OR REPLACE VIEW "public"."predictor_standings" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."username",
    "p"."country",
    "p"."role",
    "p"."total_predictions",
    "p"."correct_predictions",
    (COALESCE("sum"("cs"."points"), (0)::bigint))::integer AS "total_points",
        CASE
            WHEN ("p"."total_predictions" = 0) THEN NULL::bigint
            ELSE "rank"() OVER (ORDER BY COALESCE("sum"("cs"."points"), (0)::bigint) DESC)
        END AS "season_rank"
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."competition_scores" "cs"
       ON ("cs"."user_id" = "p"."id" AND "cs"."is_active" = true))
  GROUP BY "p"."id", "p"."username", "p"."country", "p"."role",
           "p"."total_predictions", "p"."correct_predictions";

-- 2. Remove duplicate results rows, keeping only the most recently imported
--    row per (competition_id, athlete_id). These duplicates were caused by
--    repeated syncs when maybeSingle() silently failed on existing duplicates.
DELETE FROM public.results
WHERE id NOT IN (
    SELECT DISTINCT ON (competition_id, athlete_id) id
    FROM public.results
    ORDER BY competition_id, athlete_id, imported_at DESC NULLS LAST
);

-- 3. Add a unique constraint to prevent future duplicates.
ALTER TABLE public.results
    ADD CONSTRAINT results_competition_athlete_unique
    UNIQUE (competition_id, athlete_id);
