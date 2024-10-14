-- Drop tasks dependency on steps
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
		ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_last_actioned_step;
	END IF;
END $$;
DROP TABLE IF EXISTS steps CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TYPE IF EXISTS step_status;
