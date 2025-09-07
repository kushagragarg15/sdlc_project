// Checklist functionality for SSDLC Automation Tool

class Checklist {
    constructor() {
        this.projectId = null;
        this.project = null;
        this.tasks = {};
        this.currentPhase = 'planning';
        this.init();
    }

    init() {
        // Get project ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.projectId = urlParams.get('project');
        
        if (!this.projectId) {
            this.showError('No project specified. Please return to the dashboard.');
            return;
        }

        // Bind event listeners
        this.bindEvents();
        
        // Load project data
        this.loadProject();
    }

    bindEvents() {
        // Phase tab clicks and keyboard navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('phase-tab')) {
                const phase = e.target.getAttribute('data-phase');
                this.switchPhase(phase);
            }
        });

        // Keyboard navigation for phase tabs
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('phase-tab') && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                const phase = e.target.getAttribute('data-phase');
                this.switchPhase(phase);
            }
        });

        // Task checkbox changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('task-checkbox')) {
                const taskId = e.target.getAttribute('data-task-id');
                const completed = e.target.checked;
                this.updateTaskStatus(taskId, completed);
            }
        });

        // Notes textarea changes (debounced)
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('task-notes-input')) {
                const taskId = e.target.getAttribute('data-task-id');
                const notes = e.target.value;
                
                // Debounce the update
                clearTimeout(e.target.updateTimeout);
                e.target.updateTimeout = setTimeout(() => {
                    this.updateTaskNotes(taskId, notes);
                }, 1000);
            }
        });

        // Upload button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('upload-btn')) {
                const taskId = e.target.getAttribute('data-task-id');
                this.uploadEvidence(taskId);
            }
        });

        // Evidence file download clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('evidence-download')) {
                const taskId = e.target.getAttribute('data-task-id');
                const filename = e.target.getAttribute('data-filename');
                this.downloadEvidence(taskId, filename);
            }
        });
    }

    async loadProject() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error-message');

        try {
            // Show loading state
            this.showElement(loadingEl);
            this.hideElement(errorEl);

            // Fetch project data from API
            const response = await fetch(`/.netlify/functions/projects/${this.projectId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Project not found');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            const projectData = await response.json();
            this.project = projectData;
            this.tasks = projectData.tasks || {};

            // Hide loading
            this.hideElement(loadingEl);

            // Render the project
            this.renderProject();
            this.renderPhaseNavigation();
            this.switchPhase(this.currentPhase);

        } catch (error) {
            console.error('Error loading project:', error);
            
            // Hide loading and show error
            this.hideElement(loadingEl);
            this.showError(`Failed to load project: ${error.message}`);
        }
    }

    renderProject() {
        // Update page title and subtitle
        document.title = `${this.project.name} - Security Checklist`;
        document.getElementById('project-subtitle').textContent = `Managing security tasks for ${this.project.name}`;

        // Update project overview
        document.getElementById('project-name').textContent = this.project.name;
        document.getElementById('project-created').textContent = `Created: ${new Date(this.project.createdDate).toLocaleDateString()}`;
        document.getElementById('project-status').textContent = `Status: ${this.project.overallStatus}`;

        // Calculate and update progress
        this.updateProgress();

        // Show project sections
        this.showElement(document.getElementById('project-overview'));
        this.showElement(document.getElementById('phase-navigation'));
    }

    renderPhaseNavigation() {
        const phaseTabs = document.querySelectorAll('.phase-tab');
        
        phaseTabs.forEach(tab => {
            const phase = tab.getAttribute('data-phase');
            const phaseData = this.project.phases[phase];
            
            // Remove existing classes
            tab.classList.remove('active', 'completed');
            
            // Reset accessibility attributes
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('tabindex', '-1');
            
            // Add appropriate class
            if (phaseData && phaseData.completed) {
                tab.classList.add('completed');
            }
            
            if (phase === this.currentPhase) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                tab.setAttribute('tabindex', '0');
            }
        });
    }

    switchPhase(phase) {
        this.currentPhase = phase;
        
        // Update phase navigation
        this.renderPhaseNavigation();
        
        // Update phase header
        const phaseNames = {
            planning: 'Planning Phase',
            design: 'Design Phase',
            implementation: 'Implementation Phase',
            testing: 'Testing Phase',
            deployment: 'Deployment Phase'
        };
        
        document.getElementById('current-phase-title').textContent = phaseNames[phase] || 'Phase Tasks';
        
        // Render tasks for this phase
        this.renderTasks(phase);
        
        // Show tasks section
        this.showElement(document.getElementById('tasks-section'));
    }

    renderTasks(phase) {
        const tasksListEl = document.getElementById('tasks-list');
        const phaseTasks = this.tasks[phase] || [];
        
        // Update phase completion status
        const completedTasks = phaseTasks.filter(task => task.completed).length;
        const totalTasks = phaseTasks.length;
        
        document.getElementById('phase-completion').textContent = `${completedTasks}/${totalTasks} tasks completed`;
        
        const phaseBadge = document.getElementById('phase-badge');
        const isPhaseCompleted = completedTasks === totalTasks && totalTasks > 0;
        
        phaseBadge.textContent = isPhaseCompleted ? 'Completed' : 'In Progress';
        phaseBadge.className = `phase-badge ${isPhaseCompleted ? 'completed' : 'in-progress'}`;
        
        // Clear existing tasks
        tasksListEl.innerHTML = '';
        
        if (phaseTasks.length === 0) {
            tasksListEl.innerHTML = `
                <div class="no-tasks">
                    <p>No security tasks defined for this phase.</p>
                </div>
            `;
            return;
        }
        
        // Render each task
        phaseTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            tasksListEl.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskDiv.setAttribute('data-task-id', task.id);

        const completedDate = task.completedDate ? 
            `Completed: ${new Date(task.completedDate).toLocaleDateString()}` : 
            'Not completed';

        taskDiv.innerHTML = `
            <div class="task-header">
                <input type="checkbox" 
                       class="task-checkbox" 
                       data-task-id="${task.id}"
                       ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <div class="task-description">${this.escapeHtml(task.description)}</div>
                    <div class="task-meta">
                        <span>Phase: ${task.phase}</span>
                        <span>${completedDate}</span>
                    </div>
                </div>
            </div>
            
            <div class="task-notes">
                <label for="notes-${task.id}">Notes:</label>
                <textarea id="notes-${task.id}" 
                         class="task-notes-input"
                         data-task-id="${task.id}"
                         placeholder="Add notes about this task completion...">${this.escapeHtml(task.notes || '')}</textarea>
            </div>
            
            <div class="task-evidence">
                <label>Evidence Files:</label>
                <div class="evidence-upload">
                    <p class="evidence-note">📎 Evidence files can be attached locally or referenced in task notes</p>
                </div>
                <div class="evidence-list" id="evidence-list-${task.id}">
                    <!-- Evidence files will be listed here -->
                </div>
            </div>
        `;

        // Evidence files display removed for Netlify compatibility

        return taskDiv;
    }

    async updateTaskStatus(taskId, completed) {
        try {
            // Find the task to get current notes
            let currentNotes = '';
            for (const phase in this.tasks) {
                const task = this.tasks[phase].find(t => t.id === taskId);
                if (task) {
                    currentNotes = task.notes || '';
                    break;
                }
            }

            // Send update to server
            const response = await fetch(`/.netlify/functions/projects/${this.projectId}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    completed,
                    notes: currentNotes
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Update local data
            this.updateLocalTaskData(result.task);
            this.project.phases = result.project.phases;
            this.project.overallStatus = result.project.overallStatus;
            
            // Update UI
            this.updateTaskUI(taskId, result.task);
            this.updateProgress();
            this.renderPhaseNavigation();
            this.updatePhaseStatus();
            
            // Show success message
            const action = completed ? 'completed' : 'marked as incomplete';
            this.showSuccess(`Task ${action} successfully!`);

        } catch (error) {
            console.error('Error updating task status:', error);
            this.showError('Failed to update task status. Please try again.');
            
            // Revert checkbox state
            const checkbox = document.querySelector(`input[data-task-id="${taskId}"]`);
            if (checkbox) {
                checkbox.checked = !completed;
            }
        }
    }

    async updateTaskNotes(taskId, notes) {
        try {
            // Find the task to get current completion status
            let currentCompleted = false;
            for (const phase in this.tasks) {
                const task = this.tasks[phase].find(t => t.id === taskId);
                if (task) {
                    currentCompleted = task.completed;
                    break;
                }
            }

            // Send update to server
            const response = await fetch(`/.netlify/functions/projects/${this.projectId}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    completed: currentCompleted,
                    notes
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Update local data
            this.updateLocalTaskData(result.task);

        } catch (error) {
            console.error('Error updating task notes:', error);
            // Don't show error for notes updates as they're auto-saved
        }
    }

    updateLocalTaskData(updatedTask) {
        // Update the task in local data
        for (const phase in this.tasks) {
            const taskIndex = this.tasks[phase].findIndex(t => t.id === updatedTask.id);
            if (taskIndex !== -1) {
                this.tasks[phase][taskIndex] = updatedTask;
                break;
            }
        }
    }

    updateTaskUI(taskId, task) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskElement) return;

        // Update task item class
        if (task.completed) {
            taskElement.classList.add('completed');
        } else {
            taskElement.classList.remove('completed');
        }

        // Update completion date in meta
        const metaEl = taskElement.querySelector('.task-meta');
        if (metaEl) {
            const completedDate = task.completedDate ? 
                `Completed: ${new Date(task.completedDate).toLocaleDateString()}` : 
                'Not completed';
            
            metaEl.innerHTML = `
                <span>Phase: ${task.phase}</span>
                <span>${completedDate}</span>
            `;
        }
    }

    updateProgress() {
        let totalTasks = 0;
        let completedTasks = 0;

        // Count all tasks across all phases
        for (const phase in this.tasks) {
            const phaseTasks = this.tasks[phase] || [];
            totalTasks += phaseTasks.length;
            completedTasks += phaseTasks.filter(task => task.completed).length;
        }

        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Update progress bar
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progressPercentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${progressPercentage}% Complete (${completedTasks}/${totalTasks} tasks)`;
        }

        // Update project status display
        const statusEl = document.getElementById('project-status');
        if (statusEl) {
            statusEl.textContent = `Status: ${this.project.overallStatus}`;
        }
    }

    updatePhaseStatus() {
        const phaseTasks = this.tasks[this.currentPhase] || [];
        const completedTasks = phaseTasks.filter(task => task.completed).length;
        const totalTasks = phaseTasks.length;
        
        document.getElementById('phase-completion').textContent = `${completedTasks}/${totalTasks} tasks completed`;
        
        const phaseBadge = document.getElementById('phase-badge');
        const isPhaseCompleted = completedTasks === totalTasks && totalTasks > 0;
        
        phaseBadge.textContent = isPhaseCompleted ? 'Completed' : 'In Progress';
        phaseBadge.className = `phase-badge ${isPhaseCompleted ? 'completed' : 'in-progress'}`;
    }

    // Evidence upload functionality removed for Netlify compatibility
    // Users can reference evidence files in task notes
            
        } catch (error) {
            console.error('Error uploading evidence:', error);
            this.showError(`Failed to upload evidence: ${error.message}`);
        } finally {
            // Reset upload button
            const uploadBtn = document.querySelector(`button[data-task-id="${taskId}"]`);
            if (uploadBtn) {
                uploadBtn.textContent = 'Upload Evidence';
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('loading');
            }
        }
    }

    downloadEvidence(taskId, filename) {
        try {
            // Create download URL
            const downloadUrl = `/api/projects/${this.projectId}/tasks/${taskId}/evidence/${encodeURIComponent(filename)}`;
            
            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Error downloading evidence:', error);
            this.showError('Failed to download evidence file');
        }
    }

    renderEvidenceList(taskId, evidenceFiles) {
        const evidenceListEl = document.getElementById(`evidence-list-${taskId}`);
        if (!evidenceListEl) return;
        
        if (!evidenceFiles || evidenceFiles.length === 0) {
            evidenceListEl.innerHTML = '<p class="no-evidence">No evidence files uploaded</p>';
            return;
        }
        
        const evidenceHtml = evidenceFiles.map(filePath => {
            // Extract filename from path (last part after /)
            const filename = filePath.split('/').pop();
            const displayName = this.getDisplayFilename(filename);
            
            return `
                <div class="evidence-item">
                    <span class="evidence-filename" title="${this.escapeHtml(filename)}">${this.escapeHtml(displayName)}</span>
                    <button type="button" 
                            class="btn btn-small evidence-download" 
                            data-task-id="${taskId}" 
                            data-filename="${this.escapeHtml(filename)}"
                            title="Download ${this.escapeHtml(filename)}">
                        Download
                    </button>
                </div>
            `;
        }).join('');
        
        evidenceListEl.innerHTML = evidenceHtml;
    }

    getDisplayFilename(filename) {
        // Remove timestamp and UUID prefix for display
        // Format: YYYY-MM-DDTHH-MM-SS-sssZ_12345678_originalname.ext
        const parts = filename.split('_');
        if (parts.length >= 3) {
            // Join everything after the second underscore
            return parts.slice(2).join('_');
        }
        return filename;
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            this.showElement(errorEl);
            
            // Auto-hide after 5 seconds
            setTimeout(() => this.hideElement(errorEl), 5000);
        }
    }

    showSuccess(message) {
        const successEl = document.getElementById('success-message');
        if (successEl) {
            successEl.textContent = message;
            this.showElement(successEl);
            
            // Auto-hide after 3 seconds
            setTimeout(() => this.hideElement(successEl), 3000);
        }
    }

    showElement(element) {
        if (element) {
            element.style.display = 'block';
        }
    }

    hideElement(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize checklist when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.checklist = new Checklist();
});