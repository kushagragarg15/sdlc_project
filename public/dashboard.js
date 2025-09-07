// Dashboard functionality for SSDLC Automation Tool

class Dashboard {
    constructor() {
        this.projects = [];
        this.init();
    }

    init() {
        // Bind event listeners
        this.bindEvents();
        
        // Load projects on page load
        this.loadProjects();
    }

    bindEvents() {
        // New project form submission
        const newProjectForm = document.getElementById('new-project-form');
        if (newProjectForm) {
            newProjectForm.addEventListener('submit', (e) => this.handleNewProject(e));
        }
    }

    async loadProjects() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error-message');
        const projectsListEl = document.getElementById('projects-list');
        const noProjectsEl = document.getElementById('no-projects');

        try {
            // Show loading state
            this.showElement(loadingEl);
            this.hideElement(errorEl);
            this.hideElement(noProjectsEl);

            // Fetch projects from API
            const response = await fetch('/api/projects');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const projects = await response.json();
            this.projects = projects;

            // Hide loading
            this.hideElement(loadingEl);

            // Display projects or no projects message
            if (projects.length === 0) {
                this.showElement(noProjectsEl);
                projectsListEl.innerHTML = '';
            } else {
                this.hideElement(noProjectsEl);
                this.renderProjects(projects);
            }

        } catch (error) {
            console.error('Error loading projects:', error);
            
            // Hide loading and show error
            this.hideElement(loadingEl);
            this.showError('Failed to load projects. Please try refreshing the page.');
        }
    }

    renderProjects(projects) {
        const projectsListEl = document.getElementById('projects-list');
        
        if (!projectsListEl) {
            console.error('Projects list element not found');
            return;
        }

        // Clear existing content
        projectsListEl.innerHTML = '';

        // Render each project
        projects.forEach(project => {
            const projectCard = this.createProjectCard(project);
            projectsListEl.appendChild(projectCard);
        });
    }

    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.setAttribute('data-project-id', project.id);

        // Calculate completion status
        const completedPhases = Object.values(project.phases || {}).filter(phase => phase.completed).length;
        const totalPhases = Object.keys(project.phases || {}).length;
        const isCompleted = completedPhases === totalPhases && totalPhases > 0;

        // Format creation date
        const createdDate = new Date(project.createdDate).toLocaleDateString();

        card.innerHTML = `
            <div class="project-header">
                <h3 class="project-name">${this.escapeHtml(project.name)}</h3>
                <span class="project-status ${isCompleted ? 'status-completed' : 'status-in-progress'}">
                    ${isCompleted ? 'Completed' : 'In Progress'}
                </span>
            </div>
            
            <div class="project-meta">
                <span>Created: ${createdDate}</span>
                <span>Progress: ${completedPhases}/${totalPhases} phases</span>
            </div>
            
            <div class="project-phases">
                ${this.renderPhases(project.phases || {})}
            </div>
            
            <div class="project-actions">
                <button class="btn btn-primary btn-small" onclick="dashboard.viewProject('${project.id}')">
                    View Details
                </button>
                <button class="btn btn-secondary btn-small" onclick="dashboard.manageProject('${project.id}')">
                    Manage Tasks
                </button>
            </div>
        `;

        return card;
    }

    renderPhases(phases) {
        const phaseNames = {
            planning: 'Planning',
            design: 'Design',
            implementation: 'Implementation',
            testing: 'Testing',
            deployment: 'Deployment'
        };

        return Object.entries(phaseNames).map(([key, name]) => {
            const phase = phases[key] || { completed: false };
            const statusClass = phase.completed ? 'phase-completed' : 'phase-pending';
            
            return `
                <div class="phase-item">
                    <div class="phase-status ${statusClass}"></div>
                    <span>${name}</span>
                </div>
            `;
        }).join('');
    }

    async handleNewProject(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const projectName = formData.get('name').trim();

        if (!projectName) {
            this.showError('Project name is required');
            return;
        }

        try {
            // Disable form during submission
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="loading-spinner"></span> Creating...';
            submitButton.classList.add('loading');

            // Send request to create project
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: projectName })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const newProject = await response.json();
            
            // Show success message
            this.showSuccess(`Project "${projectName}" created successfully!`);
            
            // Clear form
            form.reset();
            
            // Reload projects to show the new one
            await this.loadProjects();

        } catch (error) {
            console.error('Error creating project:', error);
            this.showError(`Failed to create project: ${error.message}`);
        } finally {
            // Re-enable form
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Create Project';
            submitButton.classList.remove('loading');
        }
    }

    viewProject(projectId) {
        // For now, just show an alert - this will be implemented in future tasks
        alert(`View project details for project ID: ${projectId}\n\nThis functionality will be implemented in a future task.`);
    }

    manageProject(projectId) {
        // Navigate to the checklist page for this project
        window.location.href = `checklist.html?project=${projectId}`;
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
        // Create or update success message element
        let successEl = document.getElementById('success-message');
        if (!successEl) {
            successEl = document.createElement('div');
            successEl.id = 'success-message';
            successEl.className = 'success-message';
            
            // Insert after the new project form
            const newProjectSection = document.querySelector('.new-project-section');
            if (newProjectSection) {
                newProjectSection.insertAdjacentElement('afterend', successEl);
            }
        }
        
        successEl.textContent = message;
        this.showElement(successEl);
        
        // Auto-hide after 4 seconds
        setTimeout(() => this.hideElement(successEl), 4000);
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

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});