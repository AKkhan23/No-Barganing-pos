const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'No Bargaining POS API', version: '2.0.0', description: 'Express + TypeScript backend' },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const spec = swaggerJsdoc(options);
fs.writeFileSync(path.join(__dirname, '..', 'swagger.json'), JSON.stringify(spec, null, 2));
console.log('swagger.json generated!');
