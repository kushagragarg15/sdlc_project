# SSDLC Automation Tool

A lightweight web application designed to help development teams track and manage security practices throughout their software development process. The tool provides a simple dashboard to monitor security checkpoints, generate basic reports, and maintain compliance documentation in a streamlined manner.

## Features

- **Project Management**: Create and manage multiple security projects
- **Security Task Tracking**: Pre-defined security tasks for each SDLC phase
- **Evidence Management**: Upload and manage evidence files for completed tasks
- **Progress Monitoring**: Track completion status across all project phases
- **Report Generation**: Generate PDF compliance reports
- **Simple Interface**: Clean, responsive web interface

## Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Storage**: JSON files (no database required)
- **Reporting**: jsPDF library for PDF generation
- **File Upload**: Multer middleware

## Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

## Installation

### Local Development

1. Clone or download the project files
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Netlify Deployment

For cloud deployment on Netlify, see [NETLIFY_DEPLOYMENT.md](NETLIFY_DEPLOYMENT.md) for detailed instructions.

**Quick Deploy to Netlify:**
1. Fork this repository
2. Connect to Netlify from GitHub
3. Deploy with build command: `npm run build` and publish directory: `public`

## Usage

### Starting the Application

1. Start the server:
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

### Using the Application

#### Creating a New Project

1. Click "New Project" on the dashboard
2. Enter a project name
3. Click "Create Project"
4. The system automatically creates default security tasks for all SDLC phases

#### Managing Security Tasks

1. Click on a project to view its details
2. Navigate through different phases (Planning, Design, Implementation, Testing, Deployment)
3. Check off completed tasks
4. Add notes and upload evidence files as needed
5. Phase completion is automatically tracked when all tasks are done

#### Generating Reports

1. Go to the Reports page
2. Select a project
3. Click "Generate Report" to download a PDF compliance report
4. The report includes completion status, security scores, and task details

### SDLC Phases and Default Tasks

#### Planning Phase
- Threat Modeling
- Security Requirements Gathering

#### Design Phase
- Security Architecture Review
- Data Flow Analysis

#### Implementation Phase
- Secure Coding Review
- Dependency Scanning

#### Testing Phase
- Security Testing
- Penetration Testing

#### Deployment Phase
- Security Configuration Review
- Access Control Setup

## File Structure

```
ssdlc-automation-tool/
├── data/                   # JSON data storage
│   ├── projects.json      # Project data
│   └── tasks.json         # Task data
├── models/                # Data models
│   ├── Project.js         # Project model
│   └── Task.js            # Task model
├── public/                # Frontend files
│   ├── index.html         # Main dashboard
│   ├── checklist.html     # Task management
│   ├── reports.html       # Report generation
│   ├── dashboard.js       # Dashboard functionality
│   ├── checklist.js       # Task management functionality
│   ├── reports.js         # Report functionality
│   └── styles.css         # Application styles
├── tests/                 # Test files
├── uploads/               # Uploaded evidence files
├── utils/                 # Utility functions
│   └── storage.js         # File storage utilities
├── server.js              # Main server file
└── package.json           # Dependencies and scripts
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details

### Tasks
- `PUT /api/projects/:id/tasks/:taskId` - Update task status

### Evidence Management
- `POST /api/projects/:projectId/tasks/:taskId/evidence` - Upload evidence files
- `GET /api/projects/:projectId/tasks/:taskId/evidence/:filename` - Download evidence file

### Reports
- `GET /api/projects/:id/report` - Generate project report (PDF)

## Testing

Run the test suite:
```bash
npm test
```

The test suite includes:
- Unit tests for models and utilities
- API endpoint tests
- Integration tests for complete workflows
- Error handling tests

## Configuration

### File Upload Limits
- Maximum file size: 10MB per file
- Maximum files per upload: 5 files
- Allowed file types: Images, PDFs, documents

### Supported File Types
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, TXT, CSV, Word, Excel

## Security Considerations

- File uploads are validated for type and size
- Uploaded files are stored with secure naming conventions
- File access is restricted to authorized tasks only
- Input validation is performed on all API endpoints

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if port 3000 is available
   - Ensure all dependencies are installed (`npm install`)

2. **File uploads failing**
   - Check file size (must be under 10MB)
   - Verify file type is supported
   - Ensure uploads directory has write permissions

3. **Reports not generating**
   - Verify project exists and has tasks
   - Check server logs for PDF generation errors

### Error Messages

- `Project name is required` - Provide a valid project name
- `File type not allowed` - Use supported file formats only
- `File size too large` - Reduce file size to under 10MB
- `Project not found` - Verify project ID is correct

## Development

### Adding New Security Tasks

1. Edit `models/Task.js`
2. Modify the `getDefaultTasks()` method
3. Add new tasks to the appropriate phase

### Customizing Reports

1. Edit the report generation logic in `server.js`
2. Modify the PDF generation section in the `/api/projects/:id/report` endpoint

### Extending File Support

1. Update the `fileFilter` function in `server.js`
2. Add new MIME types to the `allowedTypes` array

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Ensure all prerequisites are met
4. Verify file permissions for data and uploads directories