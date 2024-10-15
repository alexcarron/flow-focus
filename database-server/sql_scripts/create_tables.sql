CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  action VARCHAR(1024) NOT NULL,
	start_time TIMESTAMP WITH TIME ZONE,
	end_time TIMESTAMP WITH TIME ZONE,
	deadline TIMESTAMP WITH TIME ZONE,
	min_duration INTERVAL,
	max_duration INTERVAL,
	repeat_interval INTERVAL,
	is_mandatory BOOLEAN DEFAULT FALSE,
	is_complete BOOLEAN DEFAULT FALSE,
	is_skipped BOOLEAN DEFAULT FALSE,
	last_actioned_step_position INT NULL

	CHECK (
		(min_duration IS NULL OR max_duration IS NULL) OR
		(min_duration <= max_duration)
	),
	CHECK (
		(start_time IS NULL OR end_time IS NULL) OR
		(start_time <= end_time)
	),
	CHECK (
		(start_time IS NULL OR deadline IS NULL) OR
		(start_time <= deadline)
	),
	CHECK (
		(deadline IS NULL OR end_time IS NULL) OR
		(deadline <= end_time)
	)
);

DO $$ BEGIN
	CREATE TYPE step_status AS ENUM (
		'COMPLETED',
		'SKIPPED',
		'UNCOMPLETED'
	);
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS steps (
	task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	position INT NOT NULL CHECK (position > 0),
	instruction VARCHAR(1024) NOT NULL,
	status step_status DEFAULT 'UNCOMPLETED' NOT NULL,

	PRIMARY KEY (task_id, position)
);

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE constraint_type = 'FOREIGN KEY'
			AND table_name = 'tasks'
			AND constraint_name = 'fk_last_actioned_step'
	) THEN
		ALTER TABLE tasks
		ADD CONSTRAINT fk_last_actioned_step
			FOREIGN KEY (id, last_actioned_step_position)
			REFERENCES steps(task_id, position)
			ON DELETE SET NULL;
	END IF;
END $$;
