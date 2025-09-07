const { v4: uuidv4 } = require('uuid');

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

module.exports = Project;