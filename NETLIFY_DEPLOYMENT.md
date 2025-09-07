# Netlify Deployment Guide

This guide explains how to deploy the SSDLC Automation Tool to Netlify.

## 🚀 Quick Deploy

### Option 1: Deploy from GitHub (Recommended)

1. **Fork or clone** this repository to your GitHub account
2. **Login to Netlify** at https://netlify.com
3. **Click "New site from Git"**
4. **Connect your GitHub** account and select this repository
5. **Configure build settings:**
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
6. **Click "Deploy site"**

### Option 2: Manual Deploy

1. **Build the project locally:**
   ```bash
   npm install
   npm run build
   ```

2. **Drag and drop** the `public` folder to Netlify's deploy area

## ⚙️ Configuration

The following files are configured for Netlify:

- `netlify.toml` - Main Netlify configuration
- `public/_redirects` - URL redirects and API routing
- `netlify/functions/` - Serverless functions for API endpoints

## 🔧 Environment Variables

No environment variables are required for basic deployment. The application uses in-memory storage for demo purposes.

## 📋 Features Available on Netlify

✅ **Available:**
- Project creation and management
- Task tracking and completion
- Progress monitoring across SDLC phases
- PDF report generation
- Responsive web interface

❌ **Limitations:**
- File upload functionality removed (Netlify Functions limitations)
- Data is stored in memory (resets on function cold starts)
- No persistent database

## 🔄 API Endpoints

The following API endpoints are available via Netlify Functions:

- `GET /.netlify/functions/projects` - List all projects
- `POST /.netlify/functions/projects` - Create new project
- `GET /.netlify/functions/projects/{id}` - Get project details
- `PUT /.netlify/functions/projects/{id}/tasks/{taskId}` - Update task
- `GET /.netlify/functions/reports/{id}` - Generate project report
- `GET /.netlify/functions/health` - Health check

## 🎯 Production Considerations

For production use, consider:

1. **Database Integration:** Replace in-memory storage with a database (MongoDB, PostgreSQL, etc.)
2. **File Storage:** Implement cloud storage for evidence files (AWS S3, Cloudinary, etc.)
3. **Authentication:** Add user authentication and authorization
4. **Data Persistence:** Use external storage to persist data between deployments

## 🐛 Troubleshooting

### Common Issues:

1. **Functions not working:**
   - Check that `netlify/functions/` directory exists
   - Verify function files have proper exports
   - Check Netlify function logs

2. **API calls failing:**
   - Ensure `_redirects` file is in the `public` directory
   - Check that API calls use `/.netlify/functions/` prefix

3. **Build failures:**
   - Run `npm install` to ensure dependencies are installed
   - Check build logs in Netlify dashboard

## 📞 Support

For deployment issues:
1. Check Netlify documentation: https://docs.netlify.com/
2. Review function logs in Netlify dashboard
3. Test functions locally with Netlify CLI: `netlify dev`

## 🔗 Live Demo

Once deployed, your SSDLC Automation Tool will be available at:
`https://your-site-name.netlify.app`

The application provides a complete security task tracking system for software development teams, helping ensure security practices are followed throughout the SDLC process.