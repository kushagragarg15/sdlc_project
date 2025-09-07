const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class Storage {
    static readProjects() {
        try {
            if (!fs.existsSync(PROJECTS_FILE)) {
                return [];
            }
            const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading projects:', error);
            return [];
        }
    }

    static writeProjects(projects) {
        try {
            fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing projects:', error);
            return false;
        }
    }

    static readTasks() {
        try {
            if (!fs.existsSync(TASKS_FILE)) {
                return {};
            }
            const data = fs.readFileSync(TASKS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading tasks:', error);
            return {};
        }
    }

    static writeTasks(tasks) {
        try {
            fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing tasks:', error);
            return false;
        }
    }

    static getProjectById(projectId) {
        const projects = this.readProjects();
        return projects.find(project => project.id === projectId);
    }

    static saveProject(project) {
        const projects = this.readProjects();
        const existingIndex = projects.findIndex(p => p.id === project.id);
        
        if (existingIndex >= 0) {
            projects[existingIndex] = project;
        } else {
            projects.push(project);
        }
        
        return this.writeProjects(projects);
    }

    static getTasksForProject(projectId) {
        const allTasks = this.readTasks();
        return allTasks[projectId] || {};
    }

    static saveTasksForProject(projectId, tasks) {
        const allTasks = this.readTasks();
        allTasks[projectId] = tasks;
        return this.writeTasks(allTasks);
    }
}

module.exports = Storage;