const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

// Test data directory
const TEST_DATA_DIR = path.join(__dirname, '..', 'data');
const TEST_PROJECTS_FILE = path.join(TEST_DATA_DIR, 'projects.json');
const TEST_TASKS_FILE = path.join(TEST_DATA_DIR, 'tasks.json');

describe('Project API Endpoints', () => {
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

    describe('GET /api/projects', () => {
        test('should return empty array when no projects exist', async () => {
            const response = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(response.body).toEqual([]);
        });

        test('should return list of projects when projects exist', async () => {
            // First create a project
            await request(app)
                .post('/api/projects')
                .send({ name: 'Test Project' })
                .expect(201);

            // Then get all projects
            const response = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0]).toHaveProperty('name', 'Test Project');
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('createdDate');
            expect(response.body[0]).toHaveProperty('phases');
            expect(response.body[0]).toHaveProperty('overallStatus', 'In Progress');
        });
    });

    describe('POST /api/projects', () => {
        test('should create a new project with valid data', async () => {
            const projectData = { name: 'New Test Project' };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name', 'New Test Project');
            expect(response.body).toHaveProperty('createdDate');
            expect(response.body).toHaveProperty('phases');
            expect(response.body).toHaveProperty('overallStatus', 'In Progress');

            // Verify phases structure
            const phases = response.body.phases;
            expect(phases).toHaveProperty('planning');
            expect(phases).toHaveProperty('design');
            expect(phases).toHaveProperty('implementation');
            expect(phases).toHaveProperty('testing');
            expect(phases).toHaveProperty('deployment');

            // All phases should start as incomplete
            Object.values(phases).forEach(phase => {
                expect(phase.completed).toBe(false);
                expect(phase.completedDate).toBeNull();
            });
        });

        test('should return 400 error when name is missing', async () => {
            const response = await request(app)
                .post('/api/projects')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('required');
        });

        test('should return 400 error when name is empty string', async () => {
            const response = await request(app)
                .post('/api/projects')
                .send({ name: '' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('required');
        });

        test('should return 400 error when name is only whitespace', async () => {
            const response = await request(app)
                .post('/api/projects')
                .send({ name: '   ' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('required');
        });
    });

    describe('GET /api/projects/:id', () => {
        test('should return project details with tasks when project exists', async () => {
            // First create a project
            const createResponse = await request(app)
                .post('/api/projects')
                .send({ name: 'Test Project for Details' })
                .expect(201);

            const projectId = createResponse.body.id;

            // Then get project details
            const response = await request(app)
                .get(`/api/projects/${projectId}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', projectId);
            expect(response.body).toHaveProperty('name', 'Test Project for Details');
            expect(response.body).toHaveProperty('tasks');

            // Verify tasks structure
            const tasks = response.body.tasks;
            expect(tasks).toHaveProperty('planning');
            expect(tasks).toHaveProperty('design');
            expect(tasks).toHaveProperty('implementation');
            expect(tasks).toHaveProperty('testing');
            expect(tasks).toHaveProperty('deployment');

            // Each phase should have default tasks
            expect(tasks.planning).toHaveLength(2);
            expect(tasks.design).toHaveLength(2);
            expect(tasks.implementation).toHaveLength(2);
            expect(tasks.testing).toHaveLength(2);
            expect(tasks.deployment).toHaveLength(2);
        });

        test('should return 404 error when project does not exist', async () => {
            const response = await request(app)
                .get('/api/projects/nonexistent-id')
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Project not found');
        });
    });
});   
 describe('PUT /api/projects/:id/tasks/:taskId', () => {
        let projectId;
        let taskId;

        beforeEach(async () => {
            // Create a project first
            const response = await request(app)
                .post('/api/projects')
                .send({ name: 'Test Project for Task Updates' });
            
            projectId = response.body.id;
            
            // Get the project to find a task ID
            const projectResponse = await request(app)
                .get(`/api/projects/${projectId}`);
            
            taskId = projectResponse.body.tasks.planning[0].id;
        });

        it('should update task completion status', async () => {
            const response = await request(app)
                .put(`/api/projects/${projectId}/tasks/${taskId}`)
                .send({ completed: true, notes: 'Task completed successfully' })
                .expect(200);

            expect(response.body.task).toBeDefined();
            expect(response.body.task.completed).toBe(true);
            expect(response.body.task.notes).toBe('Task completed successfully');
            expect(response.body.task.completedDate).toBeDefined();
        });

        it('should update task notes without changing completion status', async () => {
            const response = await request(app)
                .put(`/api/projects/${projectId}/tasks/${taskId}`)
                .send({ completed: false, notes: 'Updated notes' })
                .expect(200);

            expect(response.body.task.completed).toBe(false);
            expect(response.body.task.notes).toBe('Updated notes');
            expect(response.body.task.completedDate).toBeNull();
        });

        it('should automatically complete phase when all tasks are completed', async () => {
            // Get all planning tasks
            const projectResponse = await request(app)
                .get(`/api/projects/${projectId}`);
            
            const planningTasks = projectResponse.body.tasks.planning;
            
            // Complete all planning tasks
            for (const task of planningTasks) {
                await request(app)
                    .put(`/api/projects/${projectId}/tasks/${task.id}`)
                    .send({ completed: true, notes: 'Completed' });
            }
            
            // Check that planning phase is completed
            const updatedProjectResponse = await request(app)
                .get(`/api/projects/${projectId}`);
            
            expect(updatedProjectResponse.body.phases.planning.completed).toBe(true);
            expect(updatedProjectResponse.body.phases.planning.completedDate).toBeDefined();
        });

        it('should return 404 error when project does not exist', async () => {
            const response = await request(app)
                .put('/api/projects/nonexistent-id/tasks/some-task-id')
                .send({ completed: true })
                .expect(404);

            expect(response.body.error).toBe('Project not found');
        });

        it('should return 404 error when task does not exist', async () => {
            const response = await request(app)
                .put(`/api/projects/${projectId}/tasks/nonexistent-task-id`)
                .send({ completed: true })
                .expect(404);

            expect(response.body.error).toBe('Task not found');
        });
    });