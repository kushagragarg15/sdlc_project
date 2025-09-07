const request = require('supertest');
const app = require('../server');

describe('Server Health and Basic Routes', () => {
    describe('GET /health', () => {
        test('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toEqual({
                status: 'OK',
                message: 'SSDLC Automation Tool is running'
            });
        });
    });

    describe('GET /', () => {
        test('should serve main dashboard page', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.headers['content-type']).toContain('text/html');
        });
    });

    describe('Static file serving', () => {
        test('should serve CSS files', async () => {
            const response = await request(app)
                .get('/styles.css')
                .expect(200);

            expect(response.headers['content-type']).toContain('text/css');
        });

        test('should serve JavaScript files', async () => {
            const response = await request(app)
                .get('/dashboard.js')
                .expect(200);

            expect(response.headers['content-type']).toContain('application/javascript');
        });
    });

    describe('Error handling', () => {
        test('should handle 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/non-existent-route')
                .expect(404);
        });

        test('should handle invalid JSON in POST requests', async () => {
            const response = await request(app)
                .post('/api/projects')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);
        });
    });
});