const { v4: uuidv4 } = require('uuid');

// In-memory storage for demo purposes (in production, use a database)
let projects = [];
let tasks = {};

// Project model
class Project {
    constructor(name) {
        this.id = uuidv4();
        this.name = name;
        this.createdDate = new Date().toISOString();
        this.phases = {
            planning: { completed: false, completedDate: null },
            design: { completed: false, completedDate: null },
            implementation: { completed: false, completedDate: null },
            testing: { completed: false, completedDate: null },
            deployment: { completed: false, completedDate: null }
        };
        this.overallStatus = 'In Progress';
    }

    static validate(projectData) {
        if (!projectData.name || typeof projectData.name !== 'string' || projectData.name.trim().length === 0) {
            throw new Error('Project name is required and must be a non-empty string');
        }
        return true;
    }

    updatePhaseStatus(phase, completed) {
        if (!this.phases[phase]) {
            throw new Error(`Invalid phase: ${phase}`);
        }
        
        this.phases[phase].completed = completed;
        this.phases[phase].completedDate = completed ? new Date().toISOString() : null;
        
        // Update overall status
        const allPhasesCompleted = Object.values(this.phases).every(p => p.completed);
        this.overallStatus = allPhasesCompleted ? 'Completed' : 'In Progress';
    }
}

// Task model
class Task {
    constructor(phase, title, description) {
        this.id = uuidv4();
        this.phase = phase;
        this.title = title;
        this.description = description;
        this.completed = false;
        this.completedDate = null;
        this.notes = '';
        this.evidenceFiles = [];
    }

    static getDefaultTasks() {
        return {
            planning: [
                new Task('planning', 'Threat Modeling', 'Conduct threat modeling exercise to identify potential security risks'),
                new Task('planning', 'Security Requirements Gathering', 'Define security requirements and acceptance criteria')
            ],
            design: [
                new Task('design', 'Security Architecture Review', 'Review system architecture for security considerations'),
                new Task('design', 'Data Flow Analysis', 'Analyze data flows and identify sensitive data handling')
            ],
            implementation: [
                new Task('implementation', 'Secure Coding Review', 'Review code for secure coding practices'),
                new Task('implementation', 'Dependency Scanning', 'Scan dependencies for known vulnerabilities')
            ],
            testing: [
                new Task('testing', 'Security Testing', 'Perform security-focused testing scenarios'),
                new Task('testing', 'Penetration Testing', 'Conduct penetration testing on the application')
            ],
            deployment: [
                new Task('deployment', 'Security Configuration Review', 'Review deployment configuration for security'),
                new Task('deployment', 'Access Control Setup', 'Configure proper access controls and permissions')
            ]
        };
    }
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    const path = event.path.replace('/.netlify/functions/projects', '');
    const method = event.httpMethod;

    try {
        // GET /projects - List all projects
        if (method === 'GET' && path === '') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(projects)
            };
        }

        // POST /projects - Create new project
        if (method === 'POST' && path === '') {
            const { name } = JSON.parse(event.body || '{}');
            
            // Validate input
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Project name is required and must be a non-empty string' })
                };
            }

            // Create new project
            const project = new Project(name);
            projects.push(project);

            // Create default tasks for the project
            const defaultTasks = Task.getDefaultTasks();
            tasks[project.id] = defaultTasks;

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(project)
            };
        }

        // GET /projects/:id - Get specific project
        const projectIdMatch = path.match(/^\/([^\/]+)$/);
        if (method === 'GET' && projectIdMatch) {
            const projectId = projectIdMatch[1];
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Project not found' })
                };
            }

            const projectTasks = tasks[projectId] || {};
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    ...project,
                    tasks: projectTasks
                })
            };
        }

        // PUT /projects/:id/tasks/:taskId - Update task
        const taskUpdateMatch = path.match(/^\/([^\/]+)\/tasks\/([^\/]+)$/);
        if (method === 'PUT' && taskUpdateMatch) {
            const [, projectId, taskId] = taskUpdateMatch;
            const { completed, notes } = JSON.parse(event.body || '{}');

            const project = projects.find(p => p.id === projectId);
            if (!project) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Project not found' })
                };
            }

            const projectTasks = tasks[projectId] || {};
            let taskFound = false;
            let updatedTask = null;

            // Find and update the task
            for (const phase in projectTasks) {
                const phaseTaskIndex = projectTasks[phase].findIndex(task => task.id === taskId);
                if (phaseTaskIndex !== -1) {
                    taskFound = true;
                    const task = projectTasks[phase][phaseTaskIndex];
                    
                    if (typeof completed === 'boolean') {
                        task.completed = completed;
                        task.completedDate = completed ? new Date().toISOString() : null;
                    }
                    
                    if (notes !== undefined) {
                        task.notes = notes || '';
                    }
                    
                    updatedTask = task;

                    // Check if all tasks in this phase are completed
                    const allPhaseTasksCompleted = projectTasks[phase].every(t => t.completed);
                    project.updatePhaseStatus(phase, allPhaseTasksCompleted);
                    
                    break;
                }
            }

            if (!taskFound) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Task not found' })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    task: updatedTask,
                    project: {
                        phases: project.phases,
                        overallStatus: project.overallStatus
                    }
                })
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};