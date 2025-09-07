# Design Document

## Overview

The SSDLC Automation Tool is a simple web-based application built with a minimal tech stack to provide essential security tracking functionality. The system uses a straightforward client-server architecture with local file storage to keep complexity low while meeting all functional requirements.

## Architecture

### System Architecture
```
┌─────────────────┐    HTTP    ┌─────────────────┐    File I/O    ┌─────────────────┐
│   Web Browser   │ ◄────────► │   Express.js    │ ◄────────────► │   JSON Files    │
│   (Frontend)    │            │   (Backend)     │                │   (Storage)     │
└─────────────────┘            └─────────────────┘                └─────────────────┘
```

### Technology Stack
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js with Express.js
- **Storage**: JSON files (no database required)
- **Reporting**: jsPDF library for PDF generation
- **File Upload**: Multer middleware

## Components and Interfaces

### Frontend Components

#### 1. Dashboard Component
- **Purpose**: Main landing page showing project overview
- **Features**: Project list, status indicators, navigation
- **Files**: `index.html`, `dashboard.js`, `styles.css`

#### 2. Project Management Component
- **Purpose**: Create and manage individual projects
- **Features**: Add/edit projects, phase navigation
- **Files**: `project.html`, `project.js`

#### 3. Checklist Component
- **Purpose**: Display and manage security task checklists
- **Features**: Task completion, notes, file uploads
- **Files**: `checklist.html`, `checklist.js`

#### 4. Reports Component
- **Purpose**: Generate and download compliance reports
- **Features**: PDF generation, status summaries
- **Files**: `reports.html`, `reports.js`

### Backend API Endpoints

#### Project Management
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project

#### Task Management
- `GET /api/projects/:id/tasks` - Get project tasks
- `PUT /api/projects/:id/tasks/:taskId` - Update task status
- `POST /api/projects/:id/tasks/:taskId/evidence` - Upload evidence

#### Reporting
- `GET /api/projects/:id/report` - Generate project report

## Data Models

### Project Model
```json
{
  "id": "string",
  "name": "string",
  "createdDate": "ISO date string",
  "phases": {
    "planning": { "completed": boolean, "completedDate": "ISO date" },
    "design": { "completed": boolean, "completedDate": "ISO date" },
    "implementation": { "completed": boolean, "completedDate": "ISO date" },
    "testing": { "completed": boolean, "completedDate": "ISO date" },
    "deployment": { "completed": boolean, "completedDate": "ISO date" }
  },
  "overallStatus": "string" // "In Progress", "Completed"
}
```

### Task Model
```json
{
  "id": "string",
  "phase": "string",
  "title": "string",
  "description": "string",
  "completed": boolean,
  "completedDate": "ISO date string",
  "notes": "string",
  "evidenceFiles": ["filename1.pdf", "filename2.jpg"]
}
```

### Default Security Tasks by Phase
- **Planning**: Threat modeling, Security requirements gathering
- **Design**: Security architecture review, Data flow analysis
- **Implementation**: Secure coding review, Dependency scanning
- **Testing**: Security testing, Penetration testing
- **Deployment**: Security configuration review, Access control setup

## Error Handling

### Frontend Error Handling
- Display user-friendly error messages for failed API calls
- Validate form inputs before submission
- Handle file upload size limits and type restrictions

### Backend Error Handling
- Return appropriate HTTP status codes
- Log errors to console for debugging
- Validate all input parameters
- Handle file system errors gracefully

## Testing Strategy

### Unit Testing
- Test individual API endpoints using Jest
- Test frontend functions with simple assertions
- Mock file system operations for testing

### Integration Testing
- Test complete user workflows (create project → add tasks → generate report)
- Test file upload and download functionality
- Verify PDF report generation

### Manual Testing
- Test all user interface interactions
- Verify responsive design on different screen sizes
- Test error scenarios and edge cases