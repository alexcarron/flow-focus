CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  action VARCHAR(512) NOT NULL,
	start_time TIMESTAMP WITH TIME ZONE,
	end_time TIMESTAMP WITH TIME ZONE,
	deadline TIMESTAMP WITH TIME ZONE,
	min_duration INTERVAL,
	max_duration INTERVAL,
	repeat_interval INTERVAL,
	is_mandatory BOOLEAN DEFAULT FALSE,
	is_complete BOOLEAN DEFAULT FALSE,
	is_skipped BOOLEAN DEFAULT FALSE,
	last_actioned_step_id INT

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
	task_id INT NOT NULL REFERENCES tasks(id),
	position INT UNIQUE NOT NULL CHECK (position > 0),
	instruction VARCHAR(512) NOT NULL,
	status step_status DEFAULT 'UNCOMPLETED' NOT NULL,

	PRIMARY KEY (task_id, position)
);

ALTER TABLE tasks ADD CONSTRAINT fk_last_actioned_step
FOREIGN KEY (last_actioned_step_id) REFERENCES steps(position);


