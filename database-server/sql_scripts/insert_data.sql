ALTER SEQUENCE tasks_id_seq RESTART 1;

-- Insert tasks into the tasks table
INSERT INTO tasks (action, start_time, end_time, deadline, min_duration, max_duration, repeat_interval, is_mandatory, is_complete, is_skipped, last_actioned_step_position)
VALUES
    ('Apply New Concepts to Flow Focus', NULL, NULL, '2024-10-16T03:00:00Z', INTERVAL '3 hours', INTERVAL '10 hours', NULL, FALSE, FALSE, FALSE, NULL),
    ('Grade Assignment 6.2', '2024-10-14T11:00:00Z', NULL, '2024-10-17T03:00:00Z', INTERVAL '30 minutes', INTERVAL '2 hours', NULL, TRUE, FALSE, FALSE, NULL),
    ('Grade Mini Practicum 6', '2024-10-14T11:00:00Z', NULL, '2024-10-17T03:00:00Z', INTERVAL '30 minutes', INTERVAL '2 hours', NULL, TRUE, FALSE, FALSE, NULL),
    ('MathWorks Video Interview', NULL, NULL, '2024-10-17T03:00:00Z', INTERVAL '30 minutes', INTERVAL '1 hour', NULL, TRUE, FALSE, FALSE, NULL),
    ('MathWorks Coding Challenge', NULL, NULL, '2024-10-17T03:00:00Z', INTERVAL '30 minutes', INTERVAL '1 hour', NULL, TRUE, FALSE, FALSE, NULL),
    ('Cognitive Walkthrough Report', '2024-10-14T11:00:00Z', NULL, '2024-10-19T03:00:00Z', INTERVAL '30 minutes', INTERVAL '2 hours', NULL, TRUE, FALSE, FALSE, NULL),
    ('Add All Task Manager Requirements to Flow Focus', NULL, NULL, '2024-10-21T03:00:00Z', INTERVAL '30 minutes', INTERVAL '5 hours', NULL, FALSE, FALSE, FALSE, NULL),
    ('Misfits w/ Brandon', NULL, NULL, '2024-10-21T03:00:00Z', INTERVAL '30 minutes', INTERVAL '4 hours', NULL, FALSE, FALSE, FALSE, NULL),
    ('Hangout With Friends', '2024-09-22T13:00:00Z', NULL, '2024-10-22T13:00:00Z', INTERVAL '5 minutes', INTERVAL '8 hours', INTERVAL '30 days', FALSE, FALSE, FALSE, NULL),
    ('CSGO', NULL, NULL, '2024-10-23T03:00:00Z', INTERVAL '30 minutes', INTERVAL '4 hours', NULL, FALSE, FALSE, FALSE, NULL),
    ('Work on Flow Focus', NULL, NULL, '2024-10-28T03:00:00Z', INTERVAL '30 minutes', INTERVAL '5 hours', NULL, FALSE, FALSE, FALSE, NULL),
    ('Add to Anime Reading with Nhi', NULL, NULL, NULL, INTERVAL '30 minutes', INTERVAL '5 hours', NULL, FALSE, FALSE, FALSE, NULL),
    ('Work on the Music Player Project', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, NULL, NULL),
		('Work on Rapid Discord Mafia', NULL, NULL, NULL, INTERVAL '6 hours', INTERVAL '7 days', NULL, FALSE, FALSE, FALSE, NULL),
		('Update Portfolio Website', NULL, NULL, NULL, INTERVAL '30 minutes', INTERVAL '8 hours', NULL, FALSE, FALSE, FALSE, NULL),
		('Update All Routines', NULL, NULL, NULL, INTERVAL '30 minutes', INTERVAL '8 hours', NULL, FALSE, FALSE, FALSE, NULL),
		('Listen to New Music', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, NULL),
		('Do Night Routine', '2024-10-14T02:50:00.000Z', '2024-10-14T09:00:00.000Z', '2024-10-14T03:00:00.000Z', INTERVAL '1 minute', INTERVAL '15 minutes', INTERVAL '1 day', TRUE, FALSE, FALSE, NULL),
		('Morning Routine', '2024-10-14T11:00:00.000Z', '2024-10-15T10:59:00.000Z', '2024-10-14T11:50:00.000Z', INTERVAL '10 minutes', INTERVAL '50 minutes', INTERVAL '1 day', TRUE, TRUE, FALSE, NULL),
		('Work on Game', '2024-10-13T21:13:14.469Z', NULL, '2024-10-14T03:00:00.000Z', INTERVAL '30 minutes', INTERVAL '4 hours', NULL, FALSE, TRUE, FALSE, NULL),
		('Complete Weekly Routine', '2024-10-11T11:00:00.000Z', NULL, '2024-10-14T03:00:00.000Z', INTERVAL '30 minutes', INTERVAL '2 hours', NULL, FALSE, TRUE, FALSE, NULL),
		('Walk and Self-Reflect', '2024-10-11T22:00:00.000Z', NULL, '2024-10-14T04:45:00.000Z', INTERVAL '30 minutes', INTERVAL '30 minutes', INTERVAL '1 week', FALSE, TRUE, FALSE, NULL),
		('Mid-Term Project Presentations', '2024-10-15T06:39:59.165Z', NULL, '2024-10-16T03:00:00.000Z', INTERVAL '30 minutes', INTERVAL '2 hours', NULL, TRUE, FALSE, FALSE, NULL);

-- Insert steps into the steps table
-- First task: Apply New Concepts to Flow Focus
INSERT INTO steps (task_id, position, instruction, status)
VALUES
    (1, 1, 'Design Database Schema', 'COMPLETED'),
    (1, 2, 'Create PostgreSQL Database w/ pgAdmin', 'UNCOMPLETED'),
    (1, 3, 'Create Python server w/ rebuild tables test', 'UNCOMPLETED'),
    (1, 4, 'Create general CRUD methods for database', 'UNCOMPLETED'),
    (1, 5, 'Add example REST API and test', 'UNCOMPLETED'),
    (1, 6, 'Create REST API architecture', 'UNCOMPLETED'),
    (1, 7, 'Do Contextual Inquiry', 'UNCOMPLETED'),
    (1, 8, 'Do Contextual Analysis', 'UNCOMPLETED'),
    (1, 9, 'Extract Requirements', 'UNCOMPLETED'),
    (1, 10, 'Validate Requirements', 'UNCOMPLETED'),
    (1, 11, 'Create Design-Informing Models', 'UNCOMPLETED'),
    (1, 12, 'Do Design Thinking', 'UNCOMPLETED'),
    (1, 13, 'Create Conceptual Design', 'UNCOMPLETED'),
    (1, 14, 'Produce Design', 'UNCOMPLETED');

-- Second task: Grade Assignment 6.2 (no steps)

-- Third task: Grade Mini Practicum 6 (no steps)

-- Fourth task: MathWorks Video Interview (no steps)

-- Fifth task: MathWorks Coding Challenge (no steps)

-- Sixth task: Cognitive Walkthrough Report (no steps)

-- Seventh task: Add All Task Manager Requirements to Flow Focus
INSERT INTO steps (task_id, position, instruction, status)
VALUES
    (7, 1, 'Refactor steps data structure', 'UNCOMPLETED'),
    (7, 2, 'Add step in between steps of task', 'UNCOMPLETED'),
    (7, 3, 'Delete a step', 'UNCOMPLETED'),
    (7, 4, 'Rearrange existing steps', 'UNCOMPLETED'),
    (7, 5, 'Search task by title', 'UNCOMPLETED'),
    (7, 6, 'Undo/Redo Functionality', 'UNCOMPLETED'),
    (7, 7, 'Batch Actions', 'UNCOMPLETED');

-- Eighth task: Misfits w/ Brandon (no steps)

-- Ninth task: Hangout With Friends
INSERT INTO steps (task_id, position, instruction, status)
VALUES
    (9, 1, 'Pick a friend', 'UNCOMPLETED'),
    (9, 2, 'Suggest the idea of doing an activity together', 'UNCOMPLETED'),
    (9, 3, 'If receptive, specify the activity', 'UNCOMPLETED'),
    (9, 4, 'If receptive, specify a time and place', 'UNCOMPLETED'),
    (9, 5, 'If okay, schedule hangout', 'UNCOMPLETED'),
    (9, 6, 'Add hangout to task', 'UNCOMPLETED');

-- Tenth task: CSGO (no steps)

-- Eleventh task: Work on Flow Focus (no steps)

-- Twelfth task: Add to Anime Reading with Nhi
INSERT INTO steps (task_id, position, instruction, status)
VALUES
    (12, 1, 'Find Nhis Anime Reading Github Repo', 'COMPLETED'),
    (12, 2, 'Pick an issue to work on', 'COMPLETED'),
    (12, 3, 'Communicate with Nhi on Discord about the issue', 'UNCOMPLETED'),
    (12, 4, 'Attempt to fix issue in separate branch', 'UNCOMPLETED'),
    (12, 5, 'Communicate with Nhi when resolved', 'UNCOMPLETED');

-- Thirteenth task: Work on the Music Player Project
INSERT INTO steps (task_id, position, instruction, status)
VALUES
    (13, 1, 'Open Music Player Document', 'SKIPPED'),
    (13, 2, 'Open Music Player Trello', 'SKIPPED'),
    (13, 3, 'Open Music Player code', 'UNCOMPLETED'),
    (13, 4, 'Start Software Engineering Process from the ground up', 'UNCOMPLETED'),
    (13, 5, 'Add song file with auto metadata', 'UNCOMPLETED'),
    (13, 6, 'Make rating a song super fast', 'UNCOMPLETED'),
    (13, 7, 'Make setting a song’s quality super fast', 'UNCOMPLETED'),
    (13, 8, 'Make playlist easy to set up', 'UNCOMPLETED'),
    (13, 9, 'Ability to import iTunes library', 'UNCOMPLETED'),
    (13, 10, 'Ability to shuffle queue', 'UNCOMPLETED'),
    (13, 11, 'Ability to play songs in queue', 'UNCOMPLETED'),
    (13, 12, 'Sandbox area for testing new features', 'UNCOMPLETED');

INSERT INTO steps (task_id, position, instruction, status)
VALUES
		(14, 1, 'Add Discord to-do tasks to Trello', 'UNCOMPLETED'),
		(14, 2, 'Complete Trello Tasks', 'UNCOMPLETED'),
		(14, 3, 'Update game with all tasks completed', 'UNCOMPLETED'),
		(14, 4, 'Beta test game', 'UNCOMPLETED'),
		(14, 5, 'Make game fully automated', 'UNCOMPLETED'),

		(15, 1, 'Open portfolio website and code from GitHub repo', 'UNCOMPLETED'),
		(15, 2, 'Remove irrelevant or embarrassing information or projects', 'UNCOMPLETED'),
		(15, 3, 'Go through GitHub repos and add impressive projects or ones that show skill', 'UNCOMPLETED'),
		(15, 4, 'Go through resume and add everything on it', 'UNCOMPLETED'),
		(15, 5, 'Commit, push, and publish new website', 'UNCOMPLETED'),
		(15, 6, 'Add link to website to appropriate place', 'UNCOMPLETED'),

		(16, 1, '', 'UNCOMPLETED'),

		(17, 1, 'dadadaizuHalvLaurThe LoyalistLVTHERMaozonNakuru AitsukiNhatoNokaeOliverseOppositionOsanziThe OutsidersPSYQUIPuruQuadecaRameses BREDALiCEReolReoNaScatman JohnThe Second NarratorSennzaiSeven LionsSilentroomSMLEStrider WhiteSubtactSweet ARMSSynthiontechnoplanetTomori KusunokiToru KitajimaAngel TaylorWtanabe SakiwebcageZAYNZythianrNKuro Koutei04 Limited SazabysCrywolfFlowidusBlacklolitaUSAOTANUKIToohSiromarukamome sanoMisomyLYuamitosuak+1TAGDimier√LisbSanaasEve (Dramaturgy)YunosukeAkakiVivyMinamisuccduccAIKAAnother colonyTrySai2KrewellaSurvive Said The ProfitVirtual RiotDraGonisyetepJuggernaut.Suck a Stew DryGigaP', 'UNCOMPLETED'),

		(18, 1, 'Brush teeth', 'UNCOMPLETED'),
		(18, 2, 'Fill water bottle in sink', 'UNCOMPLETED'),
		(18, 3, 'Charge stylus, earbuds, and portable charger', 'UNCOMPLETED'),
		(18, 4, 'Lock all doors', 'UNCOMPLETED'),
		(18, 5, 'Set water nearby bed', 'UNCOMPLETED'),
		(18, 6, 'Put on pajamas', 'UNCOMPLETED'),
		(18, 7, 'Put on earplugs', 'UNCOMPLETED'),
		(18, 8, 'Put on retainer', 'UNCOMPLETED'),
		(18, 9, 'Set morning alarms', 'UNCOMPLETED'),
		(18, 10, 'Write down tasks to do tomorrow', 'UNCOMPLETED'),
		(18, 11, 'Charge phone by bed', 'UNCOMPLETED'),
		(18, 12, 'Turn off ALL lights', 'UNCOMPLETED'),

		(19, 1, 'Shower', 'COMPLETED'),
		(19, 2, 'Brush Teeth, Floss, Brush Hair, Deodorant, Vanilla Perfume', 'COMPLETED'),
		(19, 3, 'Check Weather to Change Clothes', 'COMPLETED'),
		(19, 4, 'Fill Water Bottle', 'COMPLETED'),
		(19, 5, 'Eat Breakfast or Drink Coffee', 'COMPLETED'),
		(19, 6, 'Read Emails', 'COMPLETED'),
		(19, 7, 'Check Calendar', 'COMPLETED'),
		(19, 8, 'Check To Do Tomorrow', 'COMPLETED'),
		(19, 9, 'Complete All Anki Flashcards', 'COMPLETED'),
		(19, 10, 'Convert Notes Into Flashcards', 'COMPLETED'),
		(19, 11, 'Check For ALL Upcoming Work', 'COMPLETED'),

		(20, 1, '', 'UNCOMPLETED'),

		(21, 1, 'Do Laundry', 'COMPLETED'),
		(21, 2, 'Sync iPhone to iTunes', 'COMPLETED'),
		(21, 3, 'Update Budget', 'COMPLETED'),
		(21, 4, 'Organize Computer Files', 'COMPLETED'),
		(21, 5, 'Update Resume', 'COMPLETED'),
		(21, 6, 'Clean Retainer', 'COMPLETED'),
		(21, 7, 'Clean Room', 'COMPLETED'),
		(21, 8, 'Clean Apartment', 'COMPLETED'),
		(21, 9, 'Take Out Trash', 'COMPLETED'),
		(21, 10, 'Water Plant', 'COMPLETED'),
		(21, 11, 'Organize iPhone Photos', 'COMPLETED'),
		(21, 12, 'Create Meal Plan', 'COMPLETED'),
		(21, 13, 'Shave & Clip Nails', 'COMPLETED'),

		(22, 1, 'Choose journaling or thoughts', 'COMPLETED'),
		(22, 2, 'Set alarm for walk', 'COMPLETED'),
		(22, 3, 'Set timer for 30 minutes', 'COMPLETED'),
		(22, 4, 'Open Self-Reflection Guide', 'COMPLETED'),
		(22, 5, '', 'COMPLETED'),
		(22, 6, 'Finish walking with music or podcast', 'COMPLETED'),

		(23, 1, '', 'UNCOMPLETED');
