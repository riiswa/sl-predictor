-- Global Categories Refactor
-- Convert per-competition categories to globally shared categories
-- Competitions automatically select/create categories they need

-- 1. Create global categories table (without competition_id)
CREATE TABLE IF NOT EXISTS public.categories_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gender TEXT NOT NULL,
  weight_class TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(gender, weight_class)
);

-- 2. Create junction table to link competitions to categories
CREATE TABLE IF NOT EXISTS public.competitions_categories (
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories_global(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (competition_id, category_id)
);

-- 3. Migrate existing categories to global (deduplicate by gender + weight_class)
INSERT INTO public.categories_global (id, gender, weight_class)
SELECT DISTINCT ON (gender, weight_class) id, gender, weight_class
FROM public.categories
ORDER BY gender, weight_class, created_at
ON CONFLICT (gender, weight_class) DO NOTHING;

-- 4. Populate competitions_categories junction table
INSERT INTO public.competitions_categories (competition_id, category_id)
SELECT DISTINCT c.competition_id, cg.id
FROM public.categories c
JOIN public.categories_global cg ON c.gender = cg.gender AND c.weight_class = cg.weight_class
WHERE c.competition_id IS NOT NULL
ON CONFLICT (competition_id, category_id) DO NOTHING;

-- 5. Update athletes table to reference global categories
-- First, update category_id to point to global categories
UPDATE public.athletes a
SET category_id = cg.id
FROM public.categories c
JOIN public.categories_global cg ON c.gender = cg.gender AND c.weight_class = cg.weight_class
WHERE a.category_id = c.id;

-- 6. Update results table to reference global categories
UPDATE public.results r
SET category_id = cg.id
FROM public.categories c
JOIN public.categories_global cg ON c.gender = cg.gender AND c.weight_class = cg.weight_class
WHERE r.category_id = c.id;

-- 7. Drop the old per-competition categories table (keep backup if needed)
-- This can be done in a separate step after verification
DROP TABLE IF EXISTS public.categories CASCADE;

-- 8. Rename global table to standard name
ALTER TABLE public.categories_global RENAME TO categories;

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitions_categories_competition
ON public.competitions_categories(competition_id);

CREATE INDEX IF NOT EXISTS idx_competitions_categories_category
ON public.competitions_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_categories_gender_weight
ON public.categories(gender, weight_class);

-- Verify the migration
-- Run these SELECT queries to confirm:
-- SELECT COUNT(*) as global_categories FROM public.categories;
-- SELECT COUNT(*) as competition_category_links FROM public.competitions_categories;
-- SELECT c.*, COUNT(cc.competition_id) as num_competitions
-- FROM public.categories c
-- LEFT JOIN public.competitions_categories cc ON c.id = cc.category_id
-- GROUP BY c.id;
