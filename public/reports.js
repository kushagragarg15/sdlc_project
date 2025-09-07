// Reports page functionality
class ReportsManager {
    constructor() {
        this.projects = [];
        this.selectedProject = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProjects();
    }

    bindEvents() {
        const projectSelect = document.getElementById('projectSelect');
        const generateReportBtn = document.getElementById('generateReportBtn');
        const downloadReportBtn = document.getElementById('downloadReportBtn');
        const refreshPreviewBtn = document.getElementById('refreshPreviewBtn');

        projectSelect.addEventListener('change', (e) => {
            this.onProjectSelect(e.target.value);
        });

        generateReportBtn.addEventListener('click', () => {
            this.generateReportPreview();
        });

        downloadReportBtn.addEventListener('click', () => {
            this.downloadReport();
        });

        refreshPreviewBtn.addEventListener('click', () => {
            this.generateReportPreview();
        });
    }

    async loadProjects() {
        try {
            const response = await fetch('/.netlify/functions/projects');
            if (!response.ok) {
                throw new Error('Failed to fetch projects');
            }

            this.projects = await response.json();
            this.populateProjectSelect();
        } catch (error) {
            console.error('Error loading projects:', error);
            this.showError('Failed to load projects. Please try again.');
        }
    }

    populateProjectSelect() {
        const projectSelect = document.getElementById('projectSelect');
        
        if (this.projects.length === 0) {
            projectSelect.innerHTML = '<option value="">No projects available</option>';
            return;
        }

        projectSelect.innerHTML = '<option value="">Select a project...</option>';
        
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = `${project.name} (${project.overallStatus})`;
            projectSelect.appendChild(option);
        });
    }

    onProjectSelect(projectId) {
        const generateReportBtn = document.getElementById('generateReportBtn');
        const reportPreview = document.getElementById('reportPreview');

        if (projectId) {
            this.selectedProject = this.projects.find(p => p.id === projectId);
            generateReportBtn.disabled = false;
        } else {
            this.selectedProject = null;
            generateReportBtn.disabled = true;
            reportPreview.style.display = 'none';
        }
    }

    async generateReportPreview() {
        if (!this.selectedProject) {
            this.showError('Please select a project first.');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            // Fetch detailed project data including tasks
            const response = await fetch(`/.netlify/functions/projects/${this.selectedProject.id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch project details');
            }

            const projectData = await response.json();
            this.displayReportPreview(projectData);
            
        } catch (error) {
            console.error('Error generating report preview:', error);
            this.showError('Failed to generate report preview. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    displayReportPreview(projectData) {
        // Calculate statistics
        const stats = this.calculateProjectStats(projectData);
        
        // Update preview elements
        document.getElementById('previewProjectName').textContent = projectData.name;
        document.getElementById('previewSecurityScore').textContent = `${stats.overallScore}%`;
        document.getElementById('previewStatus').textContent = projectData.overallStatus;

        // Display phase summary
        this.displayPhaseSummary(stats.phaseStats, projectData.phases);
        
        // Display task summary
        this.displayTaskSummary(stats.taskStats);

        // Show the preview section
        document.getElementById('reportPreview').style.display = 'block';
    }

    calculateProjectStats(projectData) {
        let totalTasks = 0;
        let completedTasks = 0;
        const phaseStats = {};
        const taskStats = {
            completed: [],
            outstanding: []
        };

        for (const phase in projectData.tasks) {
            const phaseTasks = projectData.tasks[phase];
            const phaseCompleted = phaseTasks.filter(task => task.completed);
            
            phaseStats[phase] = {
                total: phaseTasks.length,
                completed: phaseCompleted.length,
                percentage: phaseTasks.length > 0 ? Math.round((phaseCompleted.length / phaseTasks.length) * 100) : 0
            };
            
            totalTasks += phaseTasks.length;
            completedTasks += phaseCompleted.length;

            // Collect completed and outstanding tasks
            phaseCompleted.forEach(task => {
                taskStats.completed.push({ ...task, phase });
            });

            phaseTasks.filter(task => !task.completed).forEach(task => {
                taskStats.outstanding.push({ ...task, phase });
            });
        }

        const overallScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            overallScore,
            phaseStats,
            taskStats,
            totalTasks,
            completedTasks
        };
    }

    displayPhaseSummary(phaseStats, projectPhases) {
        const container = document.getElementById('phaseSummaryList');
        container.innerHTML = '';

        for (const phase in phaseStats) {
            const stats = phaseStats[phase];
            const phaseTitle = phase.charAt(0).toUpperCase() + phase.slice(1);
            const isPhaseComplete = projectPhases[phase] && projectPhases[phase].completed;
            
            const phaseDiv = document.createElement('div');
            phaseDiv.className = 'phase-summary-item';
            
            let statusIcon = '○'; // Not started
            let statusClass = 'not-started';
            
            if (isPhaseComplete) {
                statusIcon = '✓';
                statusClass = 'completed';
            } else if (stats.completed > 0) {
                statusIcon = '⚠';
                statusClass = 'in-progress';
            }
            
            phaseDiv.innerHTML = `
                <div class="phase-header">
                    <span class="status-icon ${statusClass}">${statusIcon}</span>
                    <strong>${phaseTitle} Phase</strong>
                </div>
                <div class="phase-details">
                    <span>${stats.completed}/${stats.total} tasks completed (${stats.percentage}%)</span>
                    ${isPhaseComplete ? '<span class="phase-complete-badge">Phase Complete</span>' : ''}
                </div>
            `;
            
            container.appendChild(phaseDiv);
        }
    }

    displayTaskSummary(taskStats) {
        const container = document.getElementById('taskSummaryList');
        container.innerHTML = '';

        // Completed tasks section
        if (taskStats.completed.length > 0) {
            const completedSection = document.createElement('div');
            completedSection.className = 'task-section';
            completedSection.innerHTML = `
                <h5>Completed Tasks (${taskStats.completed.length})</h5>
                <div class="task-list completed-tasks"></div>
            `;
            
            const completedList = completedSection.querySelector('.task-list');
            taskStats.completed.slice(0, 5).forEach(task => { // Show first 5
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-item';
                taskDiv.innerHTML = `
                    <span class="task-title">✓ ${task.title}</span>
                    <span class="task-phase">${task.phase.charAt(0).toUpperCase() + task.phase.slice(1)}</span>
                `;
                completedList.appendChild(taskDiv);
            });

            if (taskStats.completed.length > 5) {
                const moreDiv = document.createElement('div');
                moreDiv.className = 'task-item more-tasks';
                moreDiv.textContent = `... and ${taskStats.completed.length - 5} more completed tasks`;
                completedList.appendChild(moreDiv);
            }

            container.appendChild(completedSection);
        }

        // Outstanding tasks section
        if (taskStats.outstanding.length > 0) {
            const outstandingSection = document.createElement('div');
            outstandingSection.className = 'task-section';
            outstandingSection.innerHTML = `
                <h5>Outstanding Tasks (${taskStats.outstanding.length})</h5>
                <div class="task-list outstanding-tasks"></div>
            `;
            
            const outstandingList = outstandingSection.querySelector('.task-list');
            taskStats.outstanding.slice(0, 5).forEach(task => { // Show first 5
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-item';
                taskDiv.innerHTML = `
                    <span class="task-title">○ ${task.title}</span>
                    <span class="task-phase">${task.phase.charAt(0).toUpperCase() + task.phase.slice(1)}</span>
                `;
                outstandingList.appendChild(taskDiv);
            });

            if (taskStats.outstanding.length > 5) {
                const moreDiv = document.createElement('div');
                moreDiv.className = 'task-item more-tasks';
                moreDiv.textContent = `... and ${taskStats.outstanding.length - 5} more outstanding tasks`;
                outstandingList.appendChild(moreDiv);
            }

            container.appendChild(outstandingSection);
        }

        if (taskStats.completed.length === 0 && taskStats.outstanding.length === 0) {
            container.innerHTML = '<p>No tasks found for this project.</p>';
        }
    }

    async downloadReport() {
        if (!this.selectedProject) {
            this.showError('Please select a project first.');
            return;
        }

        const downloadBtn = document.getElementById('downloadReportBtn');
        const originalText = downloadBtn.textContent;
        
        this.showLoading(true);
        this.hideError();
        
        // Update button state
        downloadBtn.innerHTML = '<span class="loading-spinner"></span> Generating PDF...';
        downloadBtn.disabled = true;
        downloadBtn.classList.add('loading');

        try {
            const response = await fetch(`/.netlify/functions/reports/${this.selectedProject.id}`);
            
            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            // Get the PDF blob
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SSDLC_Report_${this.selectedProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up
            window.URL.revokeObjectURL(url);
            
            this.showSuccess('Report downloaded successfully!');
            
        } catch (error) {
            console.error('Error downloading report:', error);
            this.showError('Failed to download report. Please try again.');
        } finally {
            this.showLoading(false);
            
            // Reset button state
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('loading');
        }
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'error-message';
    }

    showSuccess(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'success-message';
        
        // Hide success message after 3 seconds
        setTimeout(() => {
            this.hideError();
        }, 3000);
    }

    hideError() {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';
    }
}

// Initialize the reports manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ReportsManager();
});