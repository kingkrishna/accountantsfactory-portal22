# AccountantsFactory Client Portal - Backend API

## Overview
Node.js/Express backend API for the AccountantsFactory Client Portal system. Provides secure authentication, role-based access control, and management of clients, services, documents, and referrals.

## Features
- JWT-based authentication
- Role-based access control (Admin/Client)
- Client account management
- Service order management
- Document upload/download with AWS S3
- Referral system with circular payout logic
- Secure password hashing with bcrypt
- MySQL database integration

## Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- Zoho WorkDrive account for document storage
- npm or yarn

## Installation

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Database Setup**
   - Create MySQL database
   - Run the schema file:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update the following variables:
   ```
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=accountantsfactory_portal
   
   JWT_SECRET=your-super-secret-jwt-key
   
   # Zoho WorkDrive Configuration
   ZOHO_CLIENT_ID=your-zoho-client-id
   ZOHO_CLIENT_SECRET=your-zoho-client-secret
   ZOHO_ACCESS_TOKEN=your-zoho-access-token
   ZOHO_REFRESH_TOKEN=your-zoho-refresh-token
   ZOHO_WORKSPACE_ID=your-zoho-workspace-id
   ```

4. **Start Server**
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token (protected)
- `POST /api/auth/change-password` - Change password (protected)

### Admin Routes (Admin only)
- `POST /api/admin/create-client` - Create new client
- `GET /api/admin/clients` - Get all clients
- `POST /api/admin/assign-service` - Assign service to client
- `PUT /api/admin/update-status` - Update service order status
- `GET /api/admin/services` - Get all services
- `GET /api/admin/orders` - Get all service orders
- `POST /api/admin/upload-document` - Upload document
- `POST /api/admin/approve-referral` - Approve/reject referral

### Client Routes (Client only)
- `GET /api/client/dashboard` - Get dashboard data
- `GET /api/client/services` - Get client's services
- `GET /api/client/documents` - Get client's documents
- `GET /api/client/document/:id/download` - Download document
- `GET /api/client/referrals` - Get client's referrals
- `POST /api/client/request-service` - Request new service
- `GET /api/client/service/:id/comments` - Get service comments
- `POST /api/client/service/comment` - Add comment to service

## Database Schema

### Tables
- `users` - User accounts (admin/client)
- `services` - Available services
- `service_orders` - Client service orders
- `referrals` - Referral tracking
- `documents` - Document metadata (stored in S3)
- `service_comments` - Comments on services
- `service_requests` - Client service requests

## Security Features
- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Input validation
- SQL injection protection (parameterized queries)
- File type validation
- S3 signed URLs for secure document access

## Create Admin Account
After running the schema, create admin user:

```bash
# Run the admin creation script
node scripts/createAdmin.js admin@accountantsfactory.com YourSecurePassword123!
```

**Note:** Password must meet requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## Circular Referral Payout Logic
The system enforces circular referral payouts:
- A referrer must have at least one approved referral before they can receive a payout
- OR the referrer must have been referred themselves (approved)
- This ensures a continuous referral chain

## Document Storage
Documents are stored in Zoho WorkDrive with:
- Secure folder-based organization
- Time-limited share links (1 hour expiry)
- Organized by user and service order
- File size limit: 10MB
- Allowed types: PDF, Word, Excel, Images
- Automatic token refresh

See `ZOHO_SETUP.md` for detailed setup instructions.

## Error Handling
All errors return JSON format:
```json
{
  "success": false,
  "message": "Error message"
}
```

## Development
- Uses nodemon for auto-restart during development
- Console logging for debugging
- Error logging to console

## Production Considerations
- Set strong JWT_SECRET
- Use environment variables for all secrets
- Enable HTTPS
- Set up Zoho WorkDrive credentials (see ZOHO_SETUP.md)
- Configure CORS properly
- Set up database connection pooling
- Enable logging to file
- Set up monitoring and alerts
- Create admin user using provided script

## Support
For issues or questions, contact the development team.
