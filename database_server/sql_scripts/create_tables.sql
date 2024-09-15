CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  action VARCHAR(512) NOT NULL
);

CREATE TYPE IF NOT EXISTS step_status AS ENUM ('Completed', 'Skipped', 'Uncomplete');

CREATE TABLE IF NOT EXISTS steps (
	id SERIAL PRIMARY KEY,
	task_id INT NOT NULL REFERENCES tasks(id),
	index INT UNIQUE NOT NULL CHECK (index > 0),
	instruction VARCHAR(512) NOT NULL
	status step_status DEFAULT 'Uncomplete' NOT NULL
)




