const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { jsPDF } = require('jspdf');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Storage = require('./utils/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global error handler for JSON parsing errors
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ error: 'Invalid JSON format in request body' });
    }
    next(error);
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { projectId, taskId } = req.params;
        const taskUploadDir = path.join(uploadsDir, projectId, taskId);
        
        // Ensure task-specific directory exists
        if (!fs.existsSync(taskUploadDir)) {
            fs.mkdirSync(taskUploadDir, { recursive: true });
        }
        
        cb(null, taskUploadDir);
    },
    filename: (req, file, cb) => {
        // Generate secure filename with timestamp and UUID
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const uniqueId = uuidv4().substring(0, 8);
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9]/g, '_');
        
        const secureFilename = `${timestamp}_${uniqueId}_${baseName}${extension}`;
        cb(null, secureFilename);
    }
});

// File filter for security
const fileFilter = (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed. Please upload images, PDFs, or common document formats.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files per upload
    }
});

// Basic route for health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'SSDLC Automation Tool is running' });
});

// Serve main dashboard page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes

// GET /api/projects - List all projects
app.get('/api/projects', (req, res) => {
    try {
        const projects = Storage.readProjects();
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// POST /api/projects - Create new project with default tasks
app.post('/api/projects', (req, res) => {
    try {
        const { name } = req.body;
        
        // Additional input validation
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Request body must be a valid JSON object' });
        }
        
        // Validate input
        Project.validate({ name });
        
        // Create new project
        const project = new Project(name);
        
        // Save project
        const saved = Storage.saveProject(project);
        if (!saved) {
            return res.status(500).json({ error: 'Failed to save project' });
        }
        
        // Create default tasks for the project
        const defaultTasks = Task.getDefaultTasks();
        const savedTasks = Storage.saveTasksForProject(project.id, defaultTasks);
        if (!savedTasks) {
            console.warn('Project created but failed to save default tasks');
        }
        
        res.status(201).json(project);
    } catch (error) {
        console.error('Error creating project:', error);
        if (error.message.includes('required')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to create project' });
        }
    }
});

// GET /api/projects/:id - Get specific project details
app.get('/api/projects/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate project ID format
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        
        const project = Storage.getProjectById(id);
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Get tasks for this project
        const tasks = Storage.getTasksForProject(id);
        
        res.json({
            ...project,
            tasks
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// PUT /api/projects/:id/tasks/:taskId - Update task status
app.put('/api/projects/:id/tasks/:taskId', (req, res) => {
    try {
        const { id: projectId, taskId } = req.params;
        const { completed, notes } = req.body;
        
        // Validate input parameters
        if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        
        if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
            return res.status(400).json({ error: 'Invalid task ID' });
        }
        
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Request body must be a valid JSON object' });
        }
        
        if (completed !== undefined && typeof completed !== 'boolean') {
            return res.status(400).json({ error: 'Completed field must be a boolean value' });
        }
        
        if (notes !== undefined && typeof notes !== 'string') {
            return res.status(400).json({ error: 'Notes field must be a string' });
        }
        
        // Validate project exists
        const projectData = Storage.getProjectById(projectId);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Create Project instance to access methods
        const project = Object.assign(new Project(), projectData);
        
        // Get tasks for this project
        const allTasks = Storage.getTasksForProject(projectId);
        
        // Find the specific task
        let taskFound = false;
        let updatedTask = null;
        
        for (const phase in allTasks) {
            const phaseTaskIndex = allTasks[phase].findIndex(task => task.id === taskId);
            if (phaseTaskIndex !== -1) {
                taskFound = true;
                const task = allTasks[phase][phaseTaskIndex];
                
                // Update task status
                if (typeof completed === 'boolean') {
                    task.completed = completed;
                    task.completedDate = completed ? new Date().toISOString() : null;
                }
                
                // Update notes if provided
                if (notes !== undefined) {
                    task.notes = notes || '';
                }
                
                updatedTask = task;
                
                // Check if all tasks in this phase are completed
                const allPhaseTasksCompleted = allTasks[phase].every(t => t.completed);
                
                // Update project phase status
                project.updatePhaseStatus(phase, allPhaseTasksCompleted);
                
                break;
            }
        }
        
        if (!taskFound) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Save updated tasks and project
        const tasksSaved = Storage.saveTasksForProject(projectId, allTasks);
        const projectSaved = Storage.saveProject(project);
        
        if (!tasksSaved || !projectSaved) {
            return res.status(500).json({ error: 'Failed to save updates' });
        }
        
        res.json({
            task: updatedTask,
            project: {
                phases: project.phases,
                overallStatus: project.overallStatus
            }
        });
        
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// POST /api/projects/:projectId/tasks/:taskId/evidence - Upload evidence files for a task
app.post('/api/projects/:projectId/tasks/:taskId/evidence', upload.array('evidence', 5), (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        
        // Validate project exists
        const projectData = Storage.getProjectById(projectId);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Get tasks for this project
        const allTasks = Storage.getTasksForProject(projectId);
        
        // Find the specific task
        let taskFound = false;
        let updatedTask = null;
        
        for (const phase in allTasks) {
            const phaseTaskIndex = allTasks[phase].findIndex(task => task.id === taskId);
            if (phaseTaskIndex !== -1) {
                taskFound = true;
                const task = allTasks[phase][phaseTaskIndex];
                
                // Add uploaded files to task evidence
                if (req.files && req.files.length > 0) {
                    req.files.forEach(file => {
                        // Store relative path for portability
                        const relativePath = path.join(projectId, taskId, file.filename);
                        if (!task.evidenceFiles.includes(relativePath)) {
                            task.evidenceFiles.push(relativePath);
                        }
                    });
                }
                
                updatedTask = task;
                break;
            }
        }
        
        if (!taskFound) {
            // Clean up uploaded files if task not found
            if (req.files) {
                req.files.forEach(file => {
                    fs.unlink(file.path, (err) => {
                        if (err) console.error('Error cleaning up file:', err);
                    });
                });
            }
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Save updated tasks
        const tasksSaved = Storage.saveTasksForProject(projectId, allTasks);
        if (!tasksSaved) {
            return res.status(500).json({ error: 'Failed to save task updates' });
        }
        
        res.json({
            message: 'Evidence uploaded successfully',
            task: updatedTask,
            uploadedFiles: req.files ? req.files.map(file => ({
                originalName: file.originalname,
                filename: file.filename,
                size: file.size,
                mimetype: file.mimetype
            })) : []
        });
        
    } catch (error) {
        console.error('Error uploading evidence:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error cleaning up file:', err);
                });
            });
        }
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'File size too large. Maximum size is 10MB per file.' });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            res.status(400).json({ error: 'Too many files. Maximum 5 files per upload.' });
        } else if (error.message && error.message.includes('File type not allowed')) {
            res.status(400).json({ error: error.message });
        } else if (error instanceof multer.MulterError) {
            res.status(400).json({ error: `Upload error: ${error.message}` });
        } else {
            res.status(500).json({ error: 'Failed to upload evidence' });
        }
    }
});

// GET /api/projects/:projectId/tasks/:taskId/evidence/:filename - Download evidence file
app.get('/api/projects/:projectId/tasks/:taskId/evidence/:filename', (req, res) => {
    try {
        const { projectId, taskId, filename } = req.params;
        
        // Validate project exists
        const projectData = Storage.getProjectById(projectId);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Get tasks for this project
        const allTasks = Storage.getTasksForProject(projectId);
        
        // Find the specific task and verify file exists in evidence
        let taskFound = false;
        let fileAuthorized = false;
        
        for (const phase in allTasks) {
            const task = allTasks[phase].find(t => t.id === taskId);
            if (task) {
                taskFound = true;
                const relativePath = path.join(projectId, taskId, filename);
                fileAuthorized = task.evidenceFiles.includes(relativePath);
                break;
            }
        }
        
        if (!taskFound) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        if (!fileAuthorized) {
            return res.status(403).json({ error: 'File not authorized for this task' });
        }
        
        // Construct file path
        const filePath = path.join(uploadsDir, projectId, taskId, filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Get file stats for headers
        const stats = fs.statSync(filePath);
        
        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stats.size);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error downloading file' });
            }
        });
        
    } catch (error) {
        console.error('Error downloading evidence:', error);
        res.status(500).json({ error: 'Failed to download evidence' });
    }
});

// GET /api/projects/:id/report - Generate project report
app.get('/api/projects/:id/report', (req, res) => {
    try {
        const { id } = req.params;
        const project = Storage.getProjectById(id);
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Get tasks for this project
        const tasks = Storage.getTasksForProject(id);
        
        // Calculate security score and completion statistics
        let totalTasks = 0;
        let completedTasks = 0;
        const phaseStats = {};
        
        for (const phase in tasks) {
            const phaseTasks = tasks[phase];
            const phaseCompleted = phaseTasks.filter(task => task.completed).length;
            
            phaseStats[phase] = {
                total: phaseTasks.length,
                completed: phaseCompleted,
                percentage: phaseTasks.length > 0 ? Math.round((phaseCompleted / phaseTasks.length) * 100) : 0
            };
            
            totalTasks += phaseTasks.length;
            completedTasks += phaseCompleted;
        }
        
        const overallSecurityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Create PDF document
        const doc = new jsPDF();
        let yPosition = 20;
        
        // Title
        doc.setFontSize(20);
        doc.text('SSDLC Security Report', 20, yPosition);
        yPosition += 15;
        
        // Project information
        doc.setFontSize(14);
        doc.text(`Project: ${project.name}`, 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
        yPosition += 10;
        
        doc.text(`Overall Security Score: ${overallSecurityScore}%`, 20, yPosition);
        yPosition += 15;
        
        // Phase completion status
        doc.setFontSize(14);
        doc.text('Phase Completion Status:', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(12);
        for (const phase in phaseStats) {
            const stats = phaseStats[phase];
            const phaseTitle = phase.charAt(0).toUpperCase() + phase.slice(1);
            const statusText = `${phaseTitle}: ${stats.completed}/${stats.total} tasks (${stats.percentage}%)`;
            
            doc.text(statusText, 30, yPosition);
            yPosition += 8;
            
            // Add phase completion indicator
            if (project.phases[phase] && project.phases[phase].completed) {
                doc.text('✓ Phase Complete', 150, yPosition - 8);
            } else if (stats.completed > 0) {
                doc.text('⚠ In Progress', 150, yPosition - 8);
            } else {
                doc.text('○ Not Started', 150, yPosition - 8);
            }
        }
        
        yPosition += 10;
        
        // Completed tasks details
        doc.setFontSize(14);
        doc.text('Completed Security Tasks:', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        let hasCompletedTasks = false;
        
        for (const phase in tasks) {
            const completedPhaseTasks = tasks[phase].filter(task => task.completed);
            
            if (completedPhaseTasks.length > 0) {
                hasCompletedTasks = true;
                
                // Phase header
                doc.setFontSize(12);
                const phaseTitle = phase.charAt(0).toUpperCase() + phase.slice(1);
                doc.text(`${phaseTitle} Phase:`, 20, yPosition);
                yPosition += 8;
                
                doc.setFontSize(10);
                completedPhaseTasks.forEach(task => {
                    // Check if we need a new page
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    doc.text(`• ${task.title}`, 30, yPosition);
                    yPosition += 6;
                    
                    if (task.completedDate) {
                        doc.text(`  Completed: ${new Date(task.completedDate).toLocaleDateString()}`, 35, yPosition);
                        yPosition += 6;
                    }
                    
                    if (task.notes && task.notes.trim()) {
                        const notes = task.notes.length > 80 ? task.notes.substring(0, 80) + '...' : task.notes;
                        doc.text(`  Notes: ${notes}`, 35, yPosition);
                        yPosition += 6;
                    }
                    
                    if (task.evidenceFiles && task.evidenceFiles.length > 0) {
                        doc.text(`  Evidence: ${task.evidenceFiles.length} file(s) attached`, 35, yPosition);
                        yPosition += 6;
                    }
                    
                    yPosition += 3; // Extra spacing between tasks
                });
                
                yPosition += 5; // Extra spacing between phases
            }
        }
        
        if (!hasCompletedTasks) {
            doc.text('No security tasks have been completed yet.', 30, yPosition);
            yPosition += 10;
        }
        
        // Missing items section (if any)
        const incompleteTasks = [];
        for (const phase in tasks) {
            const incompleteInPhase = tasks[phase].filter(task => !task.completed);
            if (incompleteInPhase.length > 0) {
                incompleteTasks.push({ phase, tasks: incompleteInPhase });
            }
        }
        
        if (incompleteTasks.length > 0) {
            // Check if we need a new page
            if (yPosition > 220) {
                doc.addPage();
                yPosition = 20;
            }
            
            yPosition += 10;
            doc.setFontSize(14);
            doc.text('Outstanding Security Tasks:', 20, yPosition);
            yPosition += 10;
            
            doc.setFontSize(10);
            incompleteTasks.forEach(phaseData => {
                const phaseTitle = phaseData.phase.charAt(0).toUpperCase() + phaseData.phase.slice(1);
                doc.setFontSize(12);
                doc.text(`${phaseTitle} Phase:`, 20, yPosition);
                yPosition += 8;
                
                doc.setFontSize(10);
                phaseData.tasks.forEach(task => {
                    // Check if we need a new page
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    doc.text(`• ${task.title}`, 30, yPosition);
                    yPosition += 6;
                });
                
                yPosition += 5;
            });
        }
        
        // Generate PDF buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="SSDLC_Report_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send PDF
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large. Maximum size is 10MB per file.' });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum 5 files per upload.' });
        } else {
            return res.status(400).json({ error: `Upload error: ${error.message}` });
        }
    } else if (error.message && error.message.includes('File type not allowed')) {
        return res.status(400).json({ error: error.message });
    }
    
    // Pass to default error handler
    next(error);
});

// Start server only if this file is run directly (not imported for testing)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`SSDLC Automation Tool server is running on port ${PORT}`);
        console.log(`Access the application at http://localhost:${PORT}`);
    });
}

module.exports = app;