const { v4: uuidv4 } = require('uuid');

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

    complete(notes = '') {
        this.completed = true;
        this.completedDate = new Date().toISOString();
        this.notes = notes;
    }

    addEvidence(filename) {
        if (!this.evidenceFiles.includes(filename)) {
            this.evidenceFiles.push(filename);
        }
    }
}

module.exports = Task;