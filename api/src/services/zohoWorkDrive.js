const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

/**
 * Zoho WorkDrive API Integration
 * Handles document upload and download using Zoho WorkDrive
 */

class ZohoWorkDrive {
  constructor() {
    this.apiBaseUrl = process.env.ZOHO_API_BASE_URL || 'https://workdrive.zoho.com/api/v1';
    this.accessToken = process.env.ZOHO_ACCESS_TOKEN;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
    this.workspaceId = process.env.ZOHO_WORKSPACE_ID || 'default';

    if (!this.accessToken || !this.clientId || !this.clientSecret) {
      console.warn('Zoho WorkDrive credentials not configured. Document features will not work.');
    }
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('Zoho refresh token not configured');
    }

    try {
      const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
      const response = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
        params: {
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token'
        }
      });

      this.accessToken = response.data.access_token;
      // In production, you should update the stored token
      return this.accessToken;
    } catch (error) {
      console.error('Failed to refresh Zoho token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders() {
    return {
      'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Upload file to Zoho WorkDrive
   * @param {Buffer} fileBuffer - File buffer
   * @param {String} fileName - File name
   * @param {String} folderPath - Folder path in WorkDrive (e.g., 'documents/user_id/service_order_id')
   * @param {String} mimeType - File MIME type
   * @returns {Object} - { fileId, fileUrl, fileKey }
   */
  async uploadFile(fileBuffer, fileName, folderPath, mimeType, retryCount = 0) {
    const MAX_RETRIES = 2;

    try {
      // Validate file content
      const { default: fileType } = await import('file-type');
      const detectedType = await fileType.fromBuffer(fileBuffer);
      if (detectedType && detectedType.mime !== mimeType) {
        throw new Error('File content does not match declared MIME type');
      }

      // Ensure folder exists and get folder ID
      const folderId = await this.ensureFolderExists(folderPath, retryCount);

      // Upload file to WorkDrive
      const uploadUrl = `${this.apiBaseUrl}/files`;
      const formData = new FormData();

      // Append file buffer to form data
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: mimeType
      });
      formData.append('folder_id', folderId);
      formData.append('workspace_id', this.workspaceId);

      const response = await axios.post(uploadUrl, formData, {
        headers: {
          ...this.getAuthHeaders(),
          ...formData.getHeaders() // Get proper multipart/form-data headers
        }
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        const fileData = response.data.data[0];
        return {
          fileId: fileData.id,
          fileUrl: fileData.web_url,
          fileKey: `${folderPath}/${fileData.name}`,
          fileName: fileData.name
        };
      }

      throw new Error('Invalid or empty response from Zoho WorkDrive');
    } catch (error) {
      if (error.response && error.response.status === 401 && retryCount < MAX_RETRIES) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        // Retry upload with incremented retry count
        return this.uploadFile(fileBuffer, fileName, folderPath, mimeType, retryCount + 1);
      }
      console.error('Zoho WorkDrive upload error:', error);
      throw error;
    }
  }

  /**
   * Ensure folder exists, create if not
   * @param {String} folderPath - Path like 'documents/user_id/service_id'
   * @returns {String} - Folder ID
   */
  async ensureFolderExists(folderPath, retryCount = 0) {
    const MAX_RETRIES = 2;

    try {
      const parts = folderPath.split('/').filter(p => p);
      let currentFolderId = 'root';

      for (const part of parts) {
        // Sanitize folder name to prevent path traversal
        const sanitizedPart = part.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim();
        if (!sanitizedPart || sanitizedPart.length === 0) {
          throw new Error('Invalid folder path component');
        }

        // Check if folder exists
        const checkResponse = await axios.get(`${this.apiBaseUrl}/folders`, {
          headers: this.getAuthHeaders(),
          params: {
            folder_id: currentFolderId,
            workspace_id: this.workspaceId
          }
        });

        const existingFolder = checkResponse.data.data?.find(f => f.name === sanitizedPart);

        if (existingFolder) {
          currentFolderId = existingFolder.id;
        } else {
          // Create folder
          const createResponse = await axios.post(`${this.apiBaseUrl}/folders`, {
            name: sanitizedPart,
            parent_id: currentFolderId,
            workspace_id: this.workspaceId
          }, {
            headers: this.getAuthHeaders()
          });

          if (createResponse.data && createResponse.data.data && createResponse.data.data.length > 0) {
            currentFolderId = createResponse.data.data[0].id;
          } else {
            throw new Error('Failed to create folder - invalid response');
          }
        }
      }

      return currentFolderId;
    } catch (error) {
      if (error.response && error.response.status === 401 && retryCount < MAX_RETRIES) {
        await this.refreshAccessToken();
        return this.ensureFolderExists(folderPath, retryCount + 1);
      }
      console.error('Zoho WorkDrive folder creation error:', error);
      throw error;
    }
  }

  /**
   * Generate download URL for a file
   * @param {String} fileId - Zoho WorkDrive file ID
   * @param {Number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns {String} - Download URL
   */
  async getDownloadUrl(fileId, expiresIn = 3600, retryCount = 0) {
    const MAX_RETRIES = 2;

    try {
      // Validate fileId
      if (!fileId || typeof fileId !== 'string' || fileId.trim().length === 0) {
        throw new Error('Invalid file ID');
      }

      // Validate expiresIn
      if (typeof expiresIn !== 'number' || expiresIn < 60 || expiresIn > 86400) {
        expiresIn = 3600; // Default to 1 hour if invalid
      }

      // Get file details
      const fileResponse = await axios.get(`${this.apiBaseUrl}/files/${fileId}`, {
        headers: this.getAuthHeaders(),
        params: {
          workspace_id: this.workspaceId
        }
      });

      if (fileResponse.data && fileResponse.data.data && fileResponse.data.data.length > 0) {
        const file = fileResponse.data.data[0];

        // Generate a share link with expiration
        const shareResponse = await axios.post(`${this.apiBaseUrl}/files/${fileId}/share`, {
          workspace_id: this.workspaceId,
          expiry_date: new Date(Date.now() + expiresIn * 1000).toISOString(),
          permission: 'read'
        }, {
          headers: this.getAuthHeaders()
        });

        if (shareResponse.data && shareResponse.data.data && shareResponse.data.data.share_url) {
          return shareResponse.data.data.share_url;
        }

        // Fallback to download URL
        if (file.download_url) {
          return file.download_url;
        }

        throw new Error('No download URL available');
      }

      throw new Error('File not found in Zoho WorkDrive');
    } catch (error) {
      if (error.response && error.response.status === 401 && retryCount < MAX_RETRIES) {
        await this.refreshAccessToken();
        return this.getDownloadUrl(fileId, expiresIn, retryCount + 1);
      }
      console.error('Zoho WorkDrive download URL error:', error);
      throw error;
    }
  }

  /**
   * Delete file from WorkDrive
   * @param {String} fileId - Zoho WorkDrive file ID
   */
  async deleteFile(fileId, retryCount = 0) {
    const MAX_RETRIES = 2;

    try {
      // Validate fileId
      if (!fileId || typeof fileId !== 'string' || fileId.trim().length === 0) {
        throw new Error('Invalid file ID');
      }

      await axios.delete(`${this.apiBaseUrl}/files/${fileId}`, {
        headers: this.getAuthHeaders(),
        params: {
          workspace_id: this.workspaceId
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 401 && retryCount < MAX_RETRIES) {
        await this.refreshAccessToken();
        return this.deleteFile(fileId, retryCount + 1);
      }
      console.error('Zoho WorkDrive delete error:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ZohoWorkDrive();
