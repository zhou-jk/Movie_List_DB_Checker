const { google } = require('googleapis');
const mysql = require('mysql2/promise');
const config = require('../config');

class GoogleDriveService {
  constructor() {
    this.auth = new google.auth.OAuth2(
      config.googleDrive.clientId,
      config.googleDrive.clientSecret,
      config.googleDrive.redirectUri
    );

    // 设置刷新令牌
    this.auth.setCredentials({
      refresh_token: config.googleDrive.refreshToken
    });

    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.dbPool = null;
  }

  // 初始化数据库连接
  async initDatabase() {
    if (!this.dbPool) {
      this.dbPool = mysql.createPool(config.database);
    }
  }

  // 获取目标文件夹ID
  async getFolderId(folderPath) {
    try {
      if (!folderPath || folderPath === '/') {
        return config.driveSettings.sharedDriveId;
      }

      const pathParts = folderPath.split('/').filter(part => part.length > 0);
      let currentFolderId = config.driveSettings.sharedDriveId;

      for (const folderName of pathParts) {
        const response = await this.drive.files.list({
          q: `name='${folderName}' and parents in '${currentFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          fields: 'files(id, name)'
        });

        if (response.data.files.length === 0) {
          throw new Error(`文件夹 '${folderName}' 未找到`);
        }

        currentFolderId = response.data.files[0].id;
      }

      return currentFolderId;
    } catch (error) {
      console.error('获取文件夹ID失败:', error);
      throw error;
    }
  }

  // 递归获取所有文件
  async getAllFiles(folderId, path = '', allFiles = []) {
    try {
      let nextPageToken = null;

      do {
        const response = await this.drive.files.list({
          q: `parents in '${folderId}' and trashed=false`,
          pageSize: 100,
          pageToken: nextPageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          fields: 'nextPageToken, files(id, name, size, mimeType, modifiedTime, parents)'
        });

        for (const file of response.data.files) {
          const filePath = path ? `${path}/${file.name}` : file.name;
          
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            // 递归获取子文件夹中的文件
            await this.getAllFiles(file.id, filePath, allFiles);
          } else {
            allFiles.push({
              id: file.id,
              name: file.name,
              path: filePath,
              size: file.size ? parseInt(file.size) : null,
              mimeType: file.mimeType,
              modifiedTime: file.modifiedTime
            });
          }
        }

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      return allFiles;
    } catch (error) {
      console.error('获取文件列表失败:', error);
      throw error;
    }
  }

  // 同步文件到数据库
  async syncFilesToDatabase(files) {
    await this.initDatabase();
    const connection = await this.dbPool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 更新同步状态
      await connection.execute(
        "UPDATE system_config SET config_value = 'true' WHERE config_key = 'sync_in_progress'"
      );

      let syncedCount = 0;
      
      for (const file of files) {
        try {
          await connection.execute(
            `INSERT INTO files (file_id, file_name, file_path, file_size, mime_type, modified_time) 
             VALUES (?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             file_name = VALUES(file_name),
             file_path = VALUES(file_path),
             file_size = VALUES(file_size),
             mime_type = VALUES(mime_type),
             modified_time = VALUES(modified_time),
             updated_time = NOW()`,
            [
              file.id,
              file.name,
              file.path,
              file.size,
              file.mimeType,
              new Date(file.modifiedTime)
            ]
          );
          syncedCount++;
          
          if (syncedCount % 100 === 0) {
            console.log(`已同步 ${syncedCount} 个文件...`);
          }
        } catch (fileError) {
          console.error(`同步文件失败: ${file.name}`, fileError);
        }
      }

      // 更新系统配置
      await connection.execute(
        "UPDATE system_config SET config_value = NOW() WHERE config_key = 'last_sync_time'"
      );
      
      await connection.execute(
        "UPDATE system_config SET config_value = ? WHERE config_key = 'total_files_synced'",
        [syncedCount.toString()]
      );

      await connection.execute(
        "UPDATE system_config SET config_value = 'false' WHERE config_key = 'sync_in_progress'"
      );

      await connection.commit();
      console.log(`同步完成，共同步 ${syncedCount} 个文件`);
      
      return syncedCount;
    } catch (error) {
      await connection.rollback();
      
      // 重置同步状态
      await connection.execute(
        "UPDATE system_config SET config_value = 'false' WHERE config_key = 'sync_in_progress'"
      );
      
      throw error;
    } finally {
      connection.release();
    }
  }

  // 执行完整同步
  async syncFiles() {
    try {
      console.log('开始同步Google Drive文件...');
      
      // 获取目标文件夹ID
      const folderId = await this.getFolderId(config.driveSettings.targetFolderPath);
      console.log(`目标文件夹ID: ${folderId}`);

      // 获取所有文件
      console.log('正在获取文件列表...');
      const files = await this.getAllFiles(folderId);
      console.log(`发现 ${files.length} 个文件`);

      // 同步到数据库
      console.log('正在同步到数据库...');
      const syncedCount = await this.syncFilesToDatabase(files);
      
      return {
        success: true,
        totalFiles: files.length,
        syncedFiles: syncedCount,
        message: '同步完成'
      };
    } catch (error) {
      console.error('同步失败:', error);
      
      // 确保重置同步状态
      if (this.dbPool) {
        try {
          const connection = await this.dbPool.getConnection();
          await connection.execute(
            "UPDATE system_config SET config_value = 'false' WHERE config_key = 'sync_in_progress'"
          );
          connection.release();
        } catch (resetError) {
          console.error('重置同步状态失败:', resetError);
        }
      }
      
      return {
        success: false,
        error: error.message,
        message: '同步失败'
      };
    }
  }

  // 检查同步状态
  async getSyncStatus() {
    await this.initDatabase();
    const connection = await this.dbPool.getConnection();
    
    try {
      const [result] = await connection.execute(
        "SELECT config_value FROM system_config WHERE config_key = 'sync_in_progress'"
      );
      
      return result[0]?.config_value === 'true';
    } catch (error) {
      console.error('获取同步状态失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  // 获取认证URL（用于首次设置）
  getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
    
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  // 通过授权码获取刷新令牌
  async getTokenFromCode(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      return tokens;
    } catch (error) {
      console.error('获取token失败:', error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();
