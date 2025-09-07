const fs = require('fs');
const path = require('path');
const Storage = require('../utils/storage');
const Project = require('../models/Project');
const Task = require('../models/Task');

// Test data directory
const TEST_DATA_DIR = path.join(__dirname, '..', 'data');
const TEST_PROJECTS_FILE = path.join(TEST_DATA_DIR, 'projects.json');
const TEST_TASKS_FILE = path.join(TEST_DATA_DIR, 'tasks.json');

describe('Storage Utility', () => {
    // Clean up test data before and after tests
    beforeEach(() => {
        // Ensure clean state for each test
        if (fs.existsSync(TEST_PROJECTS_FILE)) {
            fs.unlinkSync(TEST_PROJECTS_FILE);
        }
        if (fs.existsSync(TEST_TASKS_FILE)) {
            fs.unlinkSync(TEST_TASKS_FILE);
        }
    });

    afterAll(() => {
        // Clean up after all tests
        if (fs.existsSync(TEST_PROJECTS_FILE)) {
            fs.unlinkSync(TEST_PROJECTS_FILE);
        }
        if (fs.existsSync(TEST_TASKS_FILE)) {
            fs.unlinkSync(TEST_TASKS_FILE);
        }
    });

    describe('readProjects', () => {
        test('should return empty array when no projects file exists', () => {
            const projects = Storage.readProjects();
            expect(projects).toEqual([]);
        });

        test('should return projects from existing file', () => {
            const testProjects = [
                { id: '1', name: 'Project 1' },
                { id: '2', name: 'Project 2' }
            ];

            fs.writeFileSync(TEST_PROJECTS_FILE, JSON.stringify(testProjects));

            const projects = Storage.readProjects();
            expect(projects).toEqual(testProjects);
        });

        test('should handle corrupted JSON file gracefully', () => {
            fs.writeFileSync(TEST_PROJECTS_FILE, 'invalid json');

            const projects = Storage.readProjects();
            expect(projects).toEqual([]);
        });
    });

    describe('writeProjects', () => {
        test('should write projects to file successfully', () => {
            const testProjects = [
                { id: '1', name: 'Project 1' },
                { id: '2', name: 'Project 2' }
            ];

            const result = Storage.writeProjects(testProjects);
            expect(result).toBe(true);

            // Verify file was written correctly
            const fileContent = fs.readFileSync(TEST_PROJECTS_FILE, 'utf8');
            const parsedContent = JSON.parse(fileContent);
            expect(parsedContent).toEqual(testProjects);
        });

        test('should return false on write error', () => {
            // Mock fs.writeFileSync to throw an error
            const originalWriteFileSync = fs.writeFileSync;
            fs.writeFileSync = jest.fn(() => {
                throw new Error('Write error');
            });

            const result = Storage.writeProjects([]);
            expect(result).toBe(false);

            // Restore original function
            fs.writeFileSync = originalWriteFileSync;
        });
    });

    describe('readTasks', () => {
        test('should return empty object when no tasks file exists', () => {
            const tasks = Storage.readTasks();
            expect(tasks).toEqual({});
        });

        test('should return tasks from existing file', () => {
            const testTasks = {
                'project1': { planning: [], design: [] },
                'project2': { planning: [], design: [] }
            };

            fs.writeFileSync(TEST_TASKS_FILE, JSON.stringify(testTasks));

            const tasks = Storage.readTasks();
            expect(tasks).toEqual(testTasks);
        });

        test('should handle corrupted JSON file gracefully', () => {
            fs.writeFileSync(TEST_TASKS_FILE, 'invalid json');

            const tasks = Storage.readTasks();
            expect(tasks).toEqual({});
        });
    });

    describe('writeTasks', () => {
        test('should write tasks to file successfully', () => {
            const testTasks = {
                'project1': { planning: [], design: [] }
            };

            const result = Storage.writeTasks(testTasks);
            expect(result).toBe(true);

            // Verify file was written correctly
            const fileContent = fs.readFileSync(TEST_TASKS_FILE, 'utf8');
            const parsedContent = JSON.parse(fileContent);
            expect(parsedContent).toEqual(testTasks);
        });

        test('should return false on write error', () => {
            // Mock fs.writeFileSync to throw an error
            const originalWriteFileSync = fs.writeFileSync;
            fs.writeFileSync = jest.fn(() => {
                throw new Error('Write error');
            });

            const result = Storage.writeTasks({});
            expect(result).toBe(false);

            // Restore original function
            fs.writeFileSync = originalWriteFileSync;
        });
    });

    describe('getProjectById', () => {
        test('should return project when it exists', () => {
            const testProjects = [
                { id: 'project1', name: 'Project 1' },
                { id: 'project2', name: 'Project 2' }
            ];

            Storage.writeProjects(testProjects);

            const project = Storage.getProjectById('project1');
            expect(project).toEqual({ id: 'project1', name: 'Project 1' });
        });

        test('should return undefined when project does not exist', () => {
            const testProjects = [
                { id: 'project1', name: 'Project 1' }
            ];

            Storage.writeProjects(testProjects);

            const project = Storage.getProjectById('nonexistent');
            expect(project).toBeUndefined();
        });

        test('should return undefined when no projects exist', () => {
            const project = Storage.getProjectById('project1');
            expect(project).toBeUndefined();
        });
    });

    describe('saveProject', () => {
        test('should add new project to storage', () => {
            const project = new Project('New Project');

            const result = Storage.saveProject(project);
            expect(result).toBe(true);

            const projects = Storage.readProjects();
            expect(projects).toHaveLength(1);
            expect(projects[0].id).toBe(project.id);
            expect(projects[0].name).toBe('New Project');
        });

        test('should update existing project in storage', () => {
            const project = new Project('Original Name');
            Storage.saveProject(project);

            // Update project name
            project.name = 'Updated Name';
            const result = Storage.saveProject(project);
            expect(result).toBe(true);

            const projects = Storage.readProjects();
            expect(projects).toHaveLength(1);
            expect(projects[0].name).toBe('Updated Name');
        });

        test('should handle multiple projects', () => {
            const project1 = new Project('Project 1');
            const project2 = new Project('Project 2');

            Storage.saveProject(project1);
            Storage.saveProject(project2);

            const projects = Storage.readProjects();
            expect(projects).toHaveLength(2);
        });
    });

    describe('getTasksForProject', () => {
        test('should return tasks for existing project', () => {
            const projectId = 'test-project';
            const testTasks = {
                [projectId]: { planning: [], design: [] }
            };

            Storage.writeTasks(testTasks);

            const tasks = Storage.getTasksForProject(projectId);
            expect(tasks).toEqual({ planning: [], design: [] });
        });

        test('should return empty object for non-existent project', () => {
            const tasks = Storage.getTasksForProject('nonexistent');
            expect(tasks).toEqual({});
        });
    });

    describe('saveTasksForProject', () => {
        test('should save tasks for new project', () => {
            const projectId = 'test-project';
            const tasks = Task.getDefaultTasks();

            const result = Storage.saveTasksForProject(projectId, tasks);
            expect(result).toBe(true);

            const savedTasks = Storage.getTasksForProject(projectId);
            expect(savedTasks).toEqual(tasks);
        });

        test('should update tasks for existing project', () => {
            const projectId = 'test-project';
            const initialTasks = { planning: [], design: [] };
            const updatedTasks = { planning: [{ id: '1', title: 'Task 1' }], design: [] };

            Storage.saveTasksForProject(projectId, initialTasks);
            Storage.saveTasksForProject(projectId, updatedTasks);

            const savedTasks = Storage.getTasksForProject(projectId);
            expect(savedTasks).toEqual(updatedTasks);
        });

        test('should handle multiple projects', () => {
            const project1Id = 'project1';
            const project2Id = 'project2';
            const tasks1 = { planning: [{ id: '1', title: 'Task 1' }] };
            const tasks2 = { planning: [{ id: '2', title: 'Task 2' }] };

            Storage.saveTasksForProject(project1Id, tasks1);
            Storage.saveTasksForProject(project2Id, tasks2);

            expect(Storage.getTasksForProject(project1Id)).toEqual(tasks1);
            expect(Storage.getTasksForProject(project2Id)).toEqual(tasks2);
        });
    });
});