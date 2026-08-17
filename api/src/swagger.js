const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AccountantsFactory Portal API',
      version: '1.0.0',
      description: 'API for AccountantsFactory client portal: auth, admin, client, and documents.',
    },
    servers: [{ url: '/api', description: 'API base' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT from login or 2FA login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'client'] },
            referral_code: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'blocked'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Health check' },
      { name: 'Auth', description: 'Login, 2FA, password reset' },
      { name: 'Admin', description: 'Admin-only endpoints' },
      { name: 'Client', description: 'Client dashboard and services' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'OK' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Success. Either { token, user } or { requires2FA, tempToken }.',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/2fa/login': {
        post: {
          tags: ['Auth'],
          summary: 'Complete login with 2FA code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tempToken', 'code'],
                  properties: {
                    tempToken: { type: 'string' },
                    code: { type: 'string', description: '6-digit TOTP code' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
            401: { description: 'Invalid or expired', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Request password reset',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', format: 'email' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Always success (no email enumeration)' },
          },
        },
      },
      '/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password with token',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'newPassword'],
                  properties: {
                    token: { type: 'string' },
                    newPassword: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password reset' },
            400: { description: 'Invalid or expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/verify': {
        get: {
          tags: ['Auth'],
          summary: 'Verify JWT',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Valid', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
            401: { description: 'Invalid or expired' },
          },
        },
      },
      '/admin/clients': {
        get: {
          tags: ['Admin'],
          summary: 'List clients',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of clients' },
            401: { description: 'Unauthorized' },
            403: { description: 'Admin required' },
          },
        },
      },
      '/admin/orders': {
        get: {
          tags: ['Admin'],
          summary: 'List service orders',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of orders' },
            401: { description: 'Unauthorized' },
            403: { description: 'Admin required' },
          },
        },
      },
      '/admin/orders/{orderId}/documents': {
        get: {
          tags: ['Admin'],
          summary: 'List documents for an order',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'List of documents' },
            404: { description: 'Order not found' },
          },
        },
      },
      '/admin/clients/{id}/status': {
        patch: {
          tags: ['Admin'],
          summary: 'Update client status',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string', enum: ['active', 'inactive', 'blocked'] } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Updated' },
            400: { description: 'Invalid status' },
            404: { description: 'Client not found' },
          },
        },
      },
      '/admin/assign-service': {
        post: {
          tags: ['Admin'],
          summary: 'Assign service to client',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId', 'serviceId'],
                  properties: {
                    userId: { type: 'string' },
                    serviceId: { type: 'string' },
                    period: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Assigned', content: { 'application/json': { schema: { type: 'object', properties: { orderId: { type: 'string' } } } } } },
            400: { description: 'Validation error' },
            404: { description: 'Client or service not found' },
          },
        },
      },
      '/client/dashboard': {
        get: {
          tags: ['Client'],
          summary: 'Client dashboard',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Dashboard data' },
            401: { description: 'Unauthorized' },
            403: { description: 'Client role required' },
          },
        },
      },
      '/client/services': {
        get: {
          tags: ['Client'],
          summary: 'Client services',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of services' },
          },
        },
      },
    },
  },
  apis: [],
};

const spec = swaggerJsdoc(options);

function setupSwagger(app, basePath = '') {
  app.use(basePath + '/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
    explorer: true,
    customSiteTitle: 'AccountantsFactory API',
  }));
  app.get(basePath + '/api-docs.json', (req, res) => res.json(spec));
  return spec;
}

module.exports = { setupSwagger, spec };
