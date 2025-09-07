const Project = require('../models/Project');
const Task = require('../models/Task');

describe('Project Model', () => {
    describe('constructor', () => {
        test('should create project with valid properties', () => {
            const project = new Project('Test Project');

            expect(project.id).toBeDefined();
            expect(project.name).toBe('Test Project');
            expect(project.createdDate).toBeDefined();
            expect(project.overallStatus).toBe('In Progress');
            expect(project.phases).toHaveProperty('planning');
            expect(project.phases).toHaveProperty('design');
            expect(project.phases).toHaveProperty('implementation');
            expect(project.phases).toHaveProperty('testing');
            expect(project.phases).toHaveProperty('deployment');

            // All phases should start as incomplete
            Object.values(project.phases).forEach(phase => {
                expect(phase.completed).toBe(false);
                expect(phase.completedDate).toBeNull();
            });
        });

        test('should generate unique IDs for different projects', () => {
            const project1 = new Project('Project 1');
            const project2 = new Project('Project 2');

            expect(project1.id).not.toBe(project2.id);
        });
    });

    describe('validate', () => {
        test('should pass validation with valid project data', () => {
            const validData = { name: 'Valid Project Name' };
            expect(() => Project.validate(validData)).not.toThrow();
        });

        test('should throw error when name is missing', () => {
            expect(() => Project.validate({})).toThrow('Project name is required');
        });

        test('should throw error when name is empty string', () => {
            expect(() => Project.validate({ name: '' })).toThrow('Project name is required');
        });

        test('should throw error when name is only whitespace', () => {
            expect(() => Project.validate({ name: '   ' })).toThrow('Project name is required');
        });

        test('should throw error when name is not a string', () => {
            expect(() => Project.validate({ name: 123 })).toThrow('Project name is required');
            expect(() => Project.validate({ name: null })).toThrow('Project name is required');
            expect(() => Project.validate({ name: undefined })).toThrow('Project name is required');
        });
    });

    describe('updatePhaseStatus', () => {
        let project;

        beforeEach(() => {
            project = new Project('Test Project');
        });

        test('should update phase to completed', () => {
            project.updatePhaseStatus('planning', true);

            expect(project.phases.planning.completed).toBe(true);
            expect(project.phases.planning.completedDate).toBeDefined();
            expect(project.overallStatus).toBe('In Progress');
        });

        test('should update phase to incomplete', () => {
            // First complete the phase
            project.updatePhaseStatus('planning', true);
            expect(project.phases.planning.completed).toBe(true);

            // Then mark as incomplete
            project.updatePhaseStatus('planning', false);
            expect(project.phases.planning.completed).toBe(false);
            expect(project.phases.planning.completedDate).toBeNull();
        });

        test('should update overall status to completed when all phases are done', () => {
            const phases = ['planning', 'design', 'implementation', 'testing', 'deployment'];
            
            phases.forEach(phase => {
                project.updatePhaseStatus(phase, true);
            });

            expect(project.overallStatus).toBe('Completed');
        });

        test('should keep overall status as in progress when not all phases are done', () => {
            project.updatePhaseStatus('planning', true);
            project.updatePhaseStatus('design', true);

            expect(project.overallStatus).toBe('In Progress');
        });

        test('should throw error for invalid phase', () => {
            expect(() => project.updatePhaseStatus('invalid-phase', true))
                .toThrow('Invalid phase: invalid-phase');
        });
    });
});

describe('Task Model', () => {
    describe('constructor', () => {
        test('should create task with valid properties', () => {
            const task = new Task('planning', 'Test Task', 'Test Description');

            expect(task.id).toBeDefined();
            expect(task.phase).toBe('planning');
            expect(task.title).toBe('Test Task');
            expect(task.description).toBe('Test Description');
            expect(task.completed).toBe(false);
            expect(task.completedDate).toBeNull();
            expect(task.notes).toBe('');
            expect(task.evidenceFiles).toEqual([]);
        });

        test('should generate unique IDs for different tasks', () => {
            const task1 = new Task('planning', 'Task 1', 'Description 1');
            const task2 = new Task('planning', 'Task 2', 'Description 2');

            expect(task1.id).not.toBe(task2.id);
        });
    });

    describe('getDefaultTasks', () => {
        test('should return default tasks for all phases', () => {
            const defaultTasks = Task.getDefaultTasks();

            expect(defaultTasks).toHaveProperty('planning');
            expect(defaultTasks).toHaveProperty('design');
            expect(defaultTasks).toHaveProperty('implementation');
            expect(defaultTasks).toHaveProperty('testing');
            expect(defaultTasks).toHaveProperty('deployment');

            // Each phase should have 2 tasks
            Object.values(defaultTasks).forEach(phaseTasks => {
                expect(phaseTasks).toHaveLength(2);
                phaseTasks.forEach(task => {
                    expect(task).toBeInstanceOf(Task);
                    expect(task.id).toBeDefined();
                    expect(task.title).toBeDefined();
                    expect(task.description).toBeDefined();
                    expect(task.completed).toBe(false);
                });
            });
        });

        test('should return tasks with correct phase assignments', () => {
            const defaultTasks = Task.getDefaultTasks();

            Object.keys(defaultTasks).forEach(phase => {
                defaultTasks[phase].forEach(task => {
                    expect(task.phase).toBe(phase);
                });
            });
        });
    });

    describe('complete', () => {
        test('should mark task as completed with notes', () => {
            const task = new Task('planning', 'Test Task', 'Description');
            const notes = 'Task completed successfully';

            task.complete(notes);

            expect(task.completed).toBe(true);
            expect(task.completedDate).toBeDefined();
            expect(task.notes).toBe(notes);
        });

        test('should mark task as completed without notes', () => {
            const task = new Task('planning', 'Test Task', 'Description');

            task.complete();

            expect(task.completed).toBe(true);
            expect(task.completedDate).toBeDefined();
            expect(task.notes).toBe('');
        });
    });

    describe('addEvidence', () => {
        test('should add evidence file to task', () => {
            const task = new Task('planning', 'Test Task', 'Description');
            const filename = 'evidence.pdf';

            task.addEvidence(filename);

            expect(task.evidenceFiles).toContain(filename);
        });

        test('should not add duplicate evidence files', () => {
            const task = new Task('planning', 'Test Task', 'Description');
            const filename = 'evidence.pdf';

            task.addEvidence(filename);
            task.addEvidence(filename);

            expect(task.evidenceFiles).toHaveLength(1);
            expect(task.evidenceFiles[0]).toBe(filename);
        });

        test('should add multiple different evidence files', () => {
            const task = new Task('planning', 'Test Task', 'Description');

            task.addEvidence('evidence1.pdf');
            task.addEvidence('evidence2.jpg');

            expect(task.evidenceFiles).toHaveLength(2);
            expect(task.evidenceFiles).toContain('evidence1.pdf');
            expect(task.evidenceFiles).toContain('evidence2.jpg');
        });
    });
});