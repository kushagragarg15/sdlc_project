const { jsPDF } = require('jspdf');

// In-memory storage (same as projects function)
let projects = [];
let tasks = {};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const path = event.path.replace('/.netlify/functions/reports', '');
    const method = event.httpMethod;

    try {
        // GET /reports/:id - Generate project report
        const reportMatch = path.match(/^\/([^\/]+)$/);
        if (method === 'GET' && reportMatch) {
            const projectId = reportMatch[1];
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Project not found' })
                };
            }

            const projectTasks = tasks[projectId] || {};

            // Calculate security score and completion statistics
            let totalTasks = 0;
            let completedTasks = 0;
            const phaseStats = {};
            
            for (const phase in projectTasks) {
                const phaseTasks = projectTasks[phase];
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
            }

            // Generate PDF buffer
            const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="SSDLC_Report_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`
                },
                body: pdfBuffer.toString('base64'),
                isBase64Encoded: true
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('Error generating report:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to generate report' })
        };
    }
};