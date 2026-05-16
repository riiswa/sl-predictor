


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, username, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'country'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_prediction_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  UPDATE profiles
  SET
    total_predictions = (
      SELECT COUNT(*)
      FROM predictions
      WHERE user_id = target_user_id
    ),
    correct_predictions = (
      SELECT COUNT(*)
      FROM predictions
      WHERE user_id = target_user_id AND is_exact = true
    )
  WHERE id = target_user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_profile_prediction_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_total_points"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points), 0)
    FROM competition_scores
    WHERE user_id = target_user_id AND is_active = TRUE
  )
  WHERE id = target_user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_profile_total_points"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."athletes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competition_id" "uuid",
    "category_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "nationality" "text",
    "bodyweight" numeric,
    "muscle_up" numeric,
    "pullup" numeric,
    "dip" numeric,
    "squat" numeric,
    "instagram_id" "text",
    "instagram_is_dummy" boolean DEFAULT false,
    CONSTRAINT "check_valid_bodyweight" CHECK ((("bodyweight" IS NULL) OR (("bodyweight" > (0)::numeric) AND ("bodyweight" <= (1000)::numeric)))),
    CONSTRAINT "check_valid_lifts" CHECK (((("muscle_up" IS NULL) OR (("muscle_up" >= (0)::numeric) AND ("muscle_up" <= (1000)::numeric))) AND (("pullup" IS NULL) OR (("pullup" >= (0)::numeric) AND ("pullup" <= (1000)::numeric))) AND (("dip" IS NULL) OR (("dip" >= (0)::numeric) AND ("dip" <= (1000)::numeric))) AND (("squat" IS NULL) OR (("squat" >= (0)::numeric) AND ("squat" <= (1000)::numeric)))))
);


ALTER TABLE "public"."athletes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['CREATE'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gender" "text" NOT NULL,
    "weight_class" "text" NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competition_scores" (
    "user_id" "uuid" NOT NULL,
    "competition_id" "uuid" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "scored_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scoring_run_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "scoring_config_snapshot" "jsonb",
    "scored_by" "uuid"
);


ALTER TABLE "public"."competition_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "country" "text" NOT NULL,
    "flag" "text",
    "organizer" "text",
    "date_start" "date" NOT NULL,
    "date_end" "date",
    "prediction_deadline" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text",
    "scoring_config" "jsonb" DEFAULT '{"p4p": {"positions": 3, "points_exact": 20, "points_partial": 10}, "podium": {"positions": 3, "points_exact": 10, "points_partial": 5}}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "results_visible" boolean DEFAULT false,
    "drive_file_id" "text"
);


ALTER TABLE "public"."competitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competitions_categories" (
    "competition_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."competitions_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drive_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drive_file_id" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "competition_id" "uuid",
    "modified_time" timestamp with time zone,
    "last_synced_at" timestamp with time zone,
    "sync_status" "text" DEFAULT 'new'::"text",
    "has_results" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "mime_type" "text"
);


ALTER TABLE "public"."drive_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."predictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "competition_id" "uuid",
    "category_id" "uuid",
    "module" "text" NOT NULL,
    "position" integer NOT NULL,
    "athlete_id" "uuid",
    "points_earned" integer DEFAULT 0,
    "is_exact" boolean,
    "is_partial" boolean,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_valid_module" CHECK (("module" = ANY (ARRAY['podium'::"text", 'p4p_men'::"text", 'p4p_women'::"text"]))),
    CONSTRAINT "check_valid_position" CHECK (("position" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "country" "text",
    "total_points" integer DEFAULT 0,
    "total_predictions" integer DEFAULT 0,
    "correct_predictions" integer DEFAULT 0,
    "season_rank" integer,
    "role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


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
     LEFT JOIN "public"."competition_scores" "cs" ON ((("cs"."user_id" = "p"."id") AND ("cs"."is_active" = true))))
  GROUP BY "p"."id", "p"."username", "p"."country", "p"."role", "p"."total_predictions", "p"."correct_predictions";


ALTER VIEW "public"."predictor_standings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competition_id" "uuid",
    "category_id" "uuid",
    "athlete_id" "uuid",
    "rank_in_category" integer,
    "ris_score" numeric,
    "dnf" boolean DEFAULT false,
    "disqualified" boolean DEFAULT false,
    "category_changed" boolean DEFAULT false,
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "muscle_up" numeric,
    "pullup" numeric,
    "dip" numeric,
    "squat" numeric,
    "missing_data" boolean DEFAULT false,
    CONSTRAINT "check_valid_rank" CHECK ((("rank_in_category" IS NULL) OR ("rank_in_category" > 0)))
);


ALTER TABLE "public"."results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_predictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "season" integer NOT NULL,
    "gender" "text" NOT NULL,
    "athlete_id" "uuid",
    "points_earned" integer DEFAULT 0,
    "is_correct" boolean,
    "submitted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."season_predictions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_instagram_id_key" UNIQUE ("instagram_id");



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_global_gender_weight_class_key" UNIQUE ("gender", "weight_class");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_global_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competition_scores"
    ADD CONSTRAINT "competition_scores_pkey" PRIMARY KEY ("user_id", "competition_id");



ALTER TABLE ONLY "public"."competition_scores"
    ADD CONSTRAINT "competition_scores_user_comp_run_key" UNIQUE ("user_id", "competition_id", "scoring_run_id");



ALTER TABLE ONLY "public"."competitions_categories"
    ADD CONSTRAINT "competitions_categories_pkey" PRIMARY KEY ("competition_id", "category_id");



ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drive_files"
    ADD CONSTRAINT "drive_files_drive_file_id_key" UNIQUE ("drive_file_id");



ALTER TABLE ONLY "public"."drive_files"
    ADD CONSTRAINT "drive_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_user_id_competition_id_category_id_module_posit_key" UNIQUE ("user_id", "competition_id", "category_id", "module", "position");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_competition_athlete_unique" UNIQUE ("competition_id", "athlete_id");



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_predictions"
    ADD CONSTRAINT "season_predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_predictions"
    ADD CONSTRAINT "season_predictions_user_id_season_gender_key" UNIQUE ("user_id", "season", "gender");



CREATE INDEX "idx_audit_logs_admin_id" ON "public"."audit_logs" USING "btree" ("admin_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_table_action" ON "public"."audit_logs" USING "btree" ("table_name", "action");



CREATE INDEX "idx_categories_gender_weight" ON "public"."categories" USING "btree" ("gender", "weight_class");



CREATE INDEX "idx_competition_scores_active" ON "public"."competition_scores" USING "btree" ("competition_id", "user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_competitions_categories_category" ON "public"."competitions_categories" USING "btree" ("category_id");



CREATE INDEX "idx_competitions_categories_competition" ON "public"."competitions_categories" USING "btree" ("competition_id");



CREATE OR REPLACE TRIGGER "trg_sync_prediction_counts" AFTER INSERT OR DELETE OR UPDATE ON "public"."predictions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_prediction_counts"();



CREATE OR REPLACE TRIGGER "trg_sync_total_points" AFTER INSERT OR DELETE OR UPDATE OF "is_active", "points" ON "public"."competition_scores" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_total_points"();



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_scores"
    ADD CONSTRAINT "competition_scores_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_scores"
    ADD CONSTRAINT "competition_scores_scored_by_fkey" FOREIGN KEY ("scored_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."competition_scores"
    ADD CONSTRAINT "competition_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competitions_categories"
    ADD CONSTRAINT "competitions_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competitions_categories"
    ADD CONSTRAINT "competitions_categories_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drive_files"
    ADD CONSTRAINT "drive_files_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id");



ALTER TABLE ONLY "public"."competition_scores"
    ADD CONSTRAINT "fk_competition_scores_users" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "fk_predictions_athletes" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "fk_results_athletes" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_predictions"
    ADD CONSTRAINT "season_predictions_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_predictions"
    ADD CONSTRAINT "season_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins manage scores" ON "public"."competition_scores" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Users read own scores" ON "public"."competition_scores" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "admin_all" ON "public"."athletes" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin_all" ON "public"."competitions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin_all" ON "public"."drive_files" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin_all" ON "public"."predictions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin_all" ON "public"."results" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin_update" ON "public"."profiles" FOR UPDATE WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"text")))));



ALTER TABLE "public"."athletes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competition_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drive_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_insert" ON "public"."predictions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own_insert" ON "public"."season_predictions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own_read" ON "public"."predictions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own_read" ON "public"."season_predictions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."predictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_read" ON "public"."athletes" FOR SELECT USING (true);



CREATE POLICY "public_read" ON "public"."competition_scores" FOR SELECT USING (true);



CREATE POLICY "public_read" ON "public"."competitions" FOR SELECT USING (true);



CREATE POLICY "public_read" ON "public"."drive_files" FOR SELECT USING (true);



CREATE POLICY "public_read" ON "public"."profiles" FOR SELECT USING (true);



ALTER TABLE "public"."results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "results_visible" ON "public"."results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."competitions" "c"
  WHERE (("c"."id" = "results"."competition_id") AND ("c"."results_visible" = true)))));



ALTER TABLE "public"."season_predictions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_prediction_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_prediction_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_prediction_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_total_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_total_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_total_points"() TO "service_role";


















GRANT ALL ON TABLE "public"."athletes" TO "anon";
GRANT ALL ON TABLE "public"."athletes" TO "authenticated";
GRANT ALL ON TABLE "public"."athletes" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."competition_scores" TO "anon";
GRANT ALL ON TABLE "public"."competition_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_scores" TO "service_role";



GRANT ALL ON TABLE "public"."competitions" TO "anon";
GRANT ALL ON TABLE "public"."competitions" TO "authenticated";
GRANT ALL ON TABLE "public"."competitions" TO "service_role";



GRANT ALL ON TABLE "public"."competitions_categories" TO "anon";
GRANT ALL ON TABLE "public"."competitions_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."competitions_categories" TO "service_role";



GRANT ALL ON TABLE "public"."drive_files" TO "anon";
GRANT ALL ON TABLE "public"."drive_files" TO "authenticated";
GRANT ALL ON TABLE "public"."drive_files" TO "service_role";



GRANT ALL ON TABLE "public"."predictions" TO "anon";
GRANT ALL ON TABLE "public"."predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."predictions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."predictor_standings" TO "anon";
GRANT ALL ON TABLE "public"."predictor_standings" TO "authenticated";
GRANT ALL ON TABLE "public"."predictor_standings" TO "service_role";



GRANT ALL ON TABLE "public"."results" TO "anon";
GRANT ALL ON TABLE "public"."results" TO "authenticated";
GRANT ALL ON TABLE "public"."results" TO "service_role";



GRANT ALL ON TABLE "public"."season_predictions" TO "anon";
GRANT ALL ON TABLE "public"."season_predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."season_predictions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































