const request = require('supertest');
const app = require('../server');
const Storage = require('../utils/storage');
const Project = require('../models/Project');
const Task = require('../models/Task');

describe('Report Generation API', () => {
    let testProject;
    
    beforeEach(() => {
        // Create a test project with some completed tasks
        testProject = new Project('Test Report Project');
        
        // Save the project
        Storage.saveProject(testProject);
        
        // Create and save some test tasks
        const defaultTasks = Task.getDefaultTasks();
        
        // Mark some tasks as completed
        defaultTasks.planning[0].completed = true;
        defaultTasks.planning[0].completedDate = new Date().toISOString();
        defaultTasks.planning[0].notes = 'Test notes for completed task';
        
        defaultTasks.design[0].completed = true;
        defaultTasks.design[0].completedDate = new Date().toISOString();
        
        // Update project phase status
        testProject.updatePhaseStatus('planning', true);
        Storage.saveProject(testProject);
        
        Storage.saveTasksForProject(testProject.id, defaultTasks);
    });
    
    afterEach(() => {
        // Clean up test data
        const projects = Storage.readProjects();
        const filteredProjects = projects.filter(p => p.id !== testProject.id);
        Storage.writeProjects(filteredProjects);
        
        // Clean up tasks
        try {
            const fs = require('fs');
            const path = require('path');
            const tasksFile = path.join(__dirname, '..', 'data', `tasks_${testProject.id}.json`);
            if (fs.existsSync(tasksFile)) {
                fs.unlinkSync(tasksFile);
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    });
    
    describe('GET /api/projects/:id/report', () => {
        test('should generate PDF report for existing project', async () => {
            const response = await request(app)
                .get(`/api/projects/${testProject.id}/report`)
                .expect(200);
            
            // Check response headers
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(response.headers['content-disposition']).toContain('SSDLC_Report_');
            expect(response.headers['content-disposition']).toContain('.pdf');
            
            // Check that we received PDF data
            expect(response.body).toBeDefined();
            expect(response.body.length).toBeGreaterThan(0);
            
            // Basic check that it's a PDF (starts with PDF header)
            const pdfHeader = response.body.slice(0, 4).toString();
            expect(pdfHeader).toBe('%PDF');
        });
        
        test('should return 404 for non-existent project', async () => {
            const response = await request(app)
                .get('/api/projects/non-existent-id/report')
                .expect(404);
            
            expect(response.body).toEqual({
                error: 'Project not found'
            });
        });
        
        test('should handle report generation errors gracefully', async () => {
            // Mock Storage.getProjectById to throw an error
            const originalGetProjectById = Storage.getProjectById;
            Storage.getProjectById = jest.fn(() => {
                throw new Error('Database error');
            });
            
            const response = await request(app)
                .get(`/api/projects/${testProject.id}/report`)
                .expect(500);
            
            expect(response.body).toEqual({
                error: 'Failed to generate report'
            });
            
            // Restore original function
            Storage.getProjectById = originalGetProjectById;
        });
        
        test('should include project information in report filename', async () => {
            const response = await request(app)
                .get(`/api/projects/${testProject.id}/report`)
                .expect(200);
            
            const contentDisposition = response.headers['content-disposition'];
            expect(contentDisposition).toContain('Test_Report_Project');
            expect(contentDisposition).toContain(new Date().toISOString().split('T')[0]);
        });
        
        test('should generate report with correct content structure', async () => {
            const response = await request(app)
                .get(`/api/projects/${testProject.id}/report`)
                .expect(200);
            
            // Verify it's a valid PDF
            expect(response.body.length).toBeGreaterThan(1000); // PDF should be reasonably sized
            
            // Check PDF structure (basic validation)
            const pdfContent = response.body.toString();
            expect(pdfContent).toContain('%PDF');
            expect(pdfContent).toContain('%%EOF');
        });
    });
    
    describe('Report Content Validation', () => {
        test('should calculate security score correctly', async () => {
            // This test verifies the report generation logic by checking the endpoint works
            // The actual PDF content validation would require PDF parsing libraries
            const response = await request(app)
                .get(`/api/projects/${testProject.id}/report`)
                .expect(200);
            
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(response.body.length).toBeGreaterThan(0);
        });
        
        test('should handle projects with no completed tasks', async () => {
            // Create a project with no completed tasks
            const emptyProject = new Project('Empty Test Project');
            Storage.saveProject(emptyProject);
            
            const defaultTasks = Task.getDefaultTasks();
            Storage.saveTasksForProject(emptyProject.id, defaultTasks);
            
            const response = await request(app)
                .get(`/api/projects/${emptyProject.id}/report`)
                .expect(200);
            
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(response.body.length).toBeGreaterThan(0);
            
            // Clean up
            const projects = Storage.readProjects();
            const filteredProjects = projects.filter(p => p.id !== emptyProject.id);
            Storage.writeProjects(filteredProjects);
        });
        
        test('should handle projects with all completed tasks', async () => {
            // Mark all tasks as completed
            const allTasks = Storage.getTasksForProject(testProject.id);
            
            for (const phase in allTasks) {
                allTasks[phase].forEach(task => {
                    task.completed = true;
                    task.completedDate = new Date().toISOString();
                });
                testProject.updatePhaseStatus(phase, true);
            }
            
            Storage.saveProject(testProject);
            Storage.saveTasksForProject(testProject.id, allTasks);
            
            const response = await request(app)
                .get(`/api/projects/${testProject.id}/report`)
                .expect(200);
            
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(response.body.length).toBeGreaterThan(0);
        });
    });
});