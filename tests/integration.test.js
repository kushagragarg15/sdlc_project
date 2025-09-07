const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

describe('Integration Tests - Complete User Workflows', () => {
    let projectId;
    let taskId;

    // Clean up test data before each test
    beforeEach(() => {
        const testDataDir = path.join(__dirname, '..', 'data');
        const projectsFile = path.join(testDataDir, 'projects.json');
        const tasksFile = path.join(testDataDir, 'tasks.json');

        if (fs.existsSync(projectsFile)) {
            fs.unlinkSync(projectsFile);
        }
        if (fs.existsSync(tasksFile)) {
            fs.unlinkSync(tasksFile);
        }
    });

    afterEach(() => {
        // Clean up test uploads directory
        if (projectId) {
            const testUploadsDir = path.join(__dirname, '..', 'uploads', projectId);
            if (fs.existsSync(testUploadsDir)) {
                fs.rmSync(testUploadsDir, { recursive: true, force: true });
            }
        }
    });

    describe('Complete Project Lifecycle', () => {
        test('should handle complete project creation to completion workflow', async () => {
            // Step 1: Create a new project
            const createResponse = await request(app)
                .post('/api/projects')
                .send({ name: 'Integration Test Project' })
                .expect(201);

            projectId = createResponse.body.id;
            expect(createResponse.body.name).toBe('Integration Test Project');
            expect(createResponse.body.overallStatus).toBe('In Progress');

            // Step 2: Verify project appears in projects list
            const listResponse = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(listResponse.body).toHaveLength(1);
            expect(listResponse.body[0].id).toBe(projectId);

            // Step 3: Get project details and verify default tasks were created
            const detailsResponse = await request(app)
                .get(`/api/projects/${projectId}`)
                .expect(200);

            expect(detailsResponse.body.tasks).toBeDefined();
            expect(detailsResponse.body.tasks.planning).toHaveLength(2);
            expect(detailsResponse.body.tasks.design).toHaveLength(2);
            expect(detailsResponse.body.tasks.implementation).toHaveLength(2);
            expect(detailsResponse.body.tasks.testing).toHaveLength(2);
            expect(detailsResponse.body.tasks.deployment).toHaveLength(2);

            taskId = detailsResponse.body.tasks.planning[0].id;

            // Step 4: Complete first task with notes
            const updateTaskResponse = await request(app)
                .put(`/api/projects/${projectId}/tasks/${taskId}`)
                .send({ 
                    completed: true, 
                    notes: 'Completed threat modeling exercise successfully' 
                })
                .expect(200);

            expect(updateTaskResponse.body.task.completed).toBe(true);
            expect(updateTaskResponse.body.task.notes).toBe('Completed threat modeling exercise successfully');
            expect(updateTaskResponse.body.task.completedDate).toBeDefined();

            // Step 5: Upload evidence for the completed task
            const testFilePath = path.join(__dirname, 'integration-test-evidence.pdf');
            fs.writeFileSync(testFilePath, 'Mock PDF content for integration test');

            const uploadResponse = await request(app)
                .post(`/api/projects/${projectId}/tasks/${taskId}/evidence`)
                .attach('evidence', testFilePath)
                .expect(200);

            expect(uploadResponse.body.message).toBe('Evidence uploaded successfully');
            expect(uploadResponse.body.uploadedFiles).toHaveLength(1);
            expect(uploadResponse.body.task.evidenceFiles).toHaveLength(1);

            // Clean up test file
            fs.unlinkSync(testFilePath);

            // Step 6: Download the uploaded evidence
            const uploadedFilename = uploadResponse.body.uploadedFiles[0].filename;
            const downloadResponse = await request(app)
                .get(`/api/projects/${projectId}/tasks/${taskId}/evidence/${uploadedFilename}`)
                .expect(200);

            expect(downloadResponse.text).toBe('Mock PDF content for integration test');

            // Step 7: Complete all tasks in planning phase
            const planningTasks = detailsResponse.body.tasks.planning;
            for (const task of planningTasks) {
                if (task.id !== taskId) { // Skip the already completed task
                    await request(app)
                        .put(`/api/projects/${projectId}/tasks/${task.id}`)
                        .send({ completed: true, notes: 'Completed in integration test' })
                        .expect(200);
                }
            }

            // Step 8: Verify planning phase is now completed
            const updatedProjectResponse = await request(app)
                .get(`/api/projects/${projectId}`)
                .expect(200);

            expect(updatedProjectResponse.body.phases.planning.completed).toBe(true);
            expect(updatedProjectResponse.body.phases.planning.completedDate).toBeDefined();

            // Step 9: Generate and verify report
            const reportResponse = await request(app)
                .get(`/api/projects/${projectId}/report`)
                .expect(200);

            expect(reportResponse.headers['content-type']).toBe('application/pdf');
            expect(reportResponse.headers['content-disposition']).toContain('attachment');
            expect(reportResponse.body.length).toBeGreaterThan(0);

            // Verify it's a valid PDF
            const pdfHeader = reportResponse.body.slice(0, 4).toString();
            expect(pdfHeader).toBe('%PDF');
        });

        test('should handle project completion workflow', async () => {
            // Create project
            const createResponse = await request(app)
                .post('/api/projects')
                .send({ name: 'Complete Project Test' })
                .expect(201);

            projectId = createResponse.body.id;

            // Get all tasks
            const projectResponse = await request(app)
                .get(`/api/projects/${projectId}`)
                .expect(200);

            // Complete all tasks in all phases
            const phases = ['planning', 'design', 'implementation', 'testing', 'deployment'];
            for (const phase of phases) {
                const phaseTasks = projectResponse.body.tasks[phase];
                for (const task of phaseTasks) {
                    await request(app)
                        .put(`/api/projects/${projectId}/tasks/${task.id}`)
                        .send({ completed: true, notes: `Completed ${task.title}` })
                        .expect(200);
                }
            }

            // Verify project is now completed
            const finalProjectResponse = await request(app)
                .get(`/api/projects/${projectId}`)
                .expect(200);

            expect(finalProjectResponse.body.overallStatus).toBe('Completed');
            
            // All phases should be completed
            phases.forEach(phase => {
                expect(finalProjectResponse.body.phases[phase].completed).toBe(true);
                expect(finalProjectResponse.body.phases[phase].completedDate).toBeDefined();
            });

            // Generate final report
            const reportResponse = await request(app)
                .get(`/api/projects/${projectId}/report`)
                .expect(200);

            expect(reportResponse.headers['content-type']).toBe('application/pdf');
        });
    });

    describe('Error Handling Workflows', () => {
        test('should handle cascading errors gracefully', async () => {
            // Try to update task for non-existent project
            const response1 = await request(app)
                .put('/api/projects/nonexistent/tasks/also-nonexistent')
                .send({ completed: true })
                .expect(404);

            expect(response1.body.error).toBe('Project not found');

            // Try to upload evidence for non-existent project
            const testFilePath = path.join(__dirname, 'error-test.txt');
            fs.writeFileSync(testFilePath, 'Error test content');

            const response2 = await request(app)
                .post('/api/projects/nonexistent/tasks/nonexistent/evidence')
                .attach('evidence', testFilePath)
                .expect(404);

            expect(response2.body.error).toBe('Project not found');

            // Try to generate report for non-existent project
            const response3 = await request(app)
                .get('/api/projects/nonexistent/report')
                .expect(404);

            expect(response3.body.error).toBe('Project not found');

            // Clean up test file
            fs.unlinkSync(testFilePath);
        });

        test('should handle partial task completion scenarios', async () => {
            // Create project
            const createResponse = await request(app)
                .post('/api/projects')
                .send({ name: 'Partial Completion Test' })
                .expect(201);

            projectId = createResponse.body.id;

            // Get project tasks
            const projectResponse = await request(app)
                .get(`/api/projects/${projectId}`)
                .expect(200);

            const planningTasks = projectResponse.body.tasks.planning;

            // Complete only first task in planning phase
            await request(app)
                .put(`/api/projects/${projectId}/tasks/${planningTasks[0].id}`)
                .send({ completed: true })
                .expect(200);

            // Verify phase is not completed yet
            const updatedProjectResponse = await request(app)
                .get(`/api/projects/${projectId}`)
                .expect(200);

            expect(updatedProjectResponse.body.phases.planning.completed).toBe(false);
            expect(updatedProjectResponse.body.overallStatus).toBe('In Progress');

            // Generate report with partial completion
            const reportResponse = await request(app)
                .get(`/api/projects/${projectId}/report`)
                .expect(200);

            expect(reportResponse.headers['content-type']).toBe('application/pdf');
        });
    });

    describe('Multi-Project Workflows', () => {
        test('should handle multiple projects independently', async () => {
            // Create first project
            const project1Response = await request(app)
                .post('/api/projects')
                .send({ name: 'Project One' })
                .expect(201);

            const project1Id = project1Response.body.id;

            // Create second project
            const project2Response = await request(app)
                .post('/api/projects')
                .send({ name: 'Project Two' })
                .expect(201);

            const project2Id = project2Response.body.id;

            // Verify both projects exist
            const listResponse = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(listResponse.body).toHaveLength(2);

            // Get tasks for both projects
            const project1Details = await request(app)
                .get(`/api/projects/${project1Id}`)
                .expect(200);

            const project2Details = await request(app)
                .get(`/api/projects/${project2Id}`)
                .expect(200);

            // Complete a task in project 1
            const task1Id = project1Details.body.tasks.planning[0].id;
            await request(app)
                .put(`/api/projects/${project1Id}/tasks/${task1Id}`)
                .send({ completed: true, notes: 'Project 1 task' })
                .expect(200);

            // Complete a different task in project 2
            const task2Id = project2Details.body.tasks.design[0].id;
            await request(app)
                .put(`/api/projects/${project2Id}/tasks/${task2Id}`)
                .send({ completed: true, notes: 'Project 2 task' })
                .expect(200);

            // Verify projects remain independent
            const finalProject1 = await request(app)
                .get(`/api/projects/${project1Id}`)
                .expect(200);

            const finalProject2 = await request(app)
                .get(`/api/projects/${project2Id}`)
                .expect(200);

            // Project 1 should have completed planning task
            const project1PlanningTasks = finalProject1.body.tasks.planning;
            const completedTask1 = project1PlanningTasks.find(t => t.id === task1Id);
            expect(completedTask1.completed).toBe(true);
            expect(completedTask1.notes).toBe('Project 1 task');

            // Project 2 should have completed design task
            const project2DesignTasks = finalProject2.body.tasks.design;
            const completedTask2 = project2DesignTasks.find(t => t.id === task2Id);
            expect(completedTask2.completed).toBe(true);
            expect(completedTask2.notes).toBe('Project 2 task');

            // Clean up uploads for both projects
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            [project1Id, project2Id].forEach(id => {
                const projectUploadDir = path.join(uploadsDir, id);
                if (fs.existsSync(projectUploadDir)) {
                    fs.rmSync(projectUploadDir, { recursive: true, force: true });
                }
            });
        });
    });
});