# Zoho WorkDrive Setup Guide

## Quick start

1. Create a Zoho API client at [Zoho API Console](https://api-console.zoho.com/) (Server-based Application).
2. Get **Access Token** and **Refresh Token** (OAuth flow or Self Client for dev).
3. Get your **Workspace ID** from Zoho WorkDrive URL: `https://workdrive.zoho.com/workspace/{WORKSPACE_ID}/files`.
4. Add to `backend/.env`:
   ```env
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ZOHO_ACCESS_TOKEN=your_access_token
   ZOHO_REFRESH_TOKEN=your_refresh_token
   ZOHO_WORKSPACE_ID=your_workspace_id
   ```
5. Restart the backend. Document upload/download will use WorkDrive.

---

## Overview
This application uses Zoho WorkDrive for secure document storage instead of AWS S3. Documents are stored in Zoho WorkDrive and accessed via secure share links.

## Prerequisites
- Zoho account with WorkDrive access
- Zoho API credentials (Client ID, Client Secret)

## Setup Steps

### 1. Create Zoho API Application

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Click "Add Client"
3. Select "Server-based Applications"
4. Fill in the details:
   - Client Name: AccountantsFactory Portal
   - Homepage URL: Your application URL
   - Authorized Redirect URIs: `http://localhost:3000/auth/zoho/callback` (for development)
5. Save and note down:
   - Client ID
   - Client Secret

### 2. Get Access Token

#### Option A: Using OAuth Flow (Recommended for Production)

1. Redirect user to authorization URL:
   ```
   https://accounts.zoho.com/oauth/v2/auth?scope=WorkDrive.files.READ,WorkDrive.files.CREATE,WorkDrive.files.DELETE,WorkDrive.folders.CREATE&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=YOUR_REDIRECT_URI
   ```

2. User authorizes and you get authorization code
3. Exchange code for tokens:
   ```bash
   curl -X POST https://accounts.zoho.com/oauth/v2/token \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=YOUR_REDIRECT_URI" \
     -d "code=AUTHORIZATION_CODE"
   ```

4. Save the `access_token` and `refresh_token`

#### Option B: Self Client (For Development)

1. Go to [Zoho Self Client](https://api-console.zoho.com/selfclient)
2. Create self client
3. Generate tokens with required scopes
4. Use the generated tokens directly

### 3. Get Workspace ID

1. Go to Zoho WorkDrive
2. Navigate to your workspace
3. The workspace ID is in the URL: `https://workdrive.zoho.com/workspace/{WORKSPACE_ID}/files`
4. Copy the WORKSPACE_ID

### 4. Configure Environment Variables

Add these to your `.env` file:

```env
# Zoho WorkDrive Configuration
ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_ACCESS_TOKEN=your_access_token_here
ZOHO_REFRESH_TOKEN=your_refresh_token_here
ZOHO_WORKSPACE_ID=your_workspace_id_here
```

### 5. API Scopes Required

Your Zoho application needs these scopes:
- `WorkDrive.files.READ` - Read files
- `WorkDrive.files.CREATE` - Upload files
- `WorkDrive.files.DELETE` - Delete files
- `WorkDrive.folders.CREATE` - Create folders

### 6. Token Refresh

Access tokens expire after 1 hour. The system will automatically refresh using the refresh token. Make sure to:
- Store refresh token securely
- Update the stored access token when it's refreshed
- Handle token refresh failures gracefully

## Folder Structure

Documents are organized in WorkDrive as:
```
documents/
  ├── {user_id}/
  │   ├── {service_order_id}/
  │   │   ├── {uuid}.pdf
  │   │   └── {uuid}.doc
```

## API Endpoints Used

- `POST /api/v1/files` - Upload file
- `GET /api/v1/files/{file_id}` - Get file details
- `POST /api/v1/files/{file_id}/share` - Create share link
- `GET /api/v1/folders` - List folders
- `POST /api/v1/folders` - Create folder
- `DELETE /api/v1/files/{file_id}` - Delete file

## Troubleshooting

### Token Expired
- Refresh token automatically
- If refresh fails, regenerate tokens via OAuth flow

### Upload Fails
- Check file size limits (default: 10MB)
- Verify file type is allowed
- Check workspace permissions

### Folder Creation Fails
- Ensure workspace exists
- Verify user has folder creation permissions

## Security Notes

- Access tokens should be stored securely (use environment variables)
- Share links are set to expire after 1 hour
- Documents are organized by user and service order for easy access control
- File IDs are stored in database, not file paths

## Alternative: Using Zoho Catalyst

If you're using Zoho Catalyst, you can use Catalyst's built-in storage:

1. Enable Catalyst Storage in your Catalyst project
2. Use Catalyst SDK instead of direct API calls
3. Update `zohoWorkDrive.js` to use Catalyst APIs

```javascript
const catalyst = require('zcatalyst-sdk-node');

const app = catalyst.initialize();
const filestore = app.filestore();

// Upload
const file = filestore.folder({ id: folderId }).uploadFile({
  file: fileBuffer,
  name: fileName
});

// Get download URL
const downloadUrl = filestore.file({ id: fileId }).getDownloadUrl();
```
