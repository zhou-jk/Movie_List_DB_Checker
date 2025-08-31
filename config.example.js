// 配置文件示例 - 请复制为 config.js 并填入真实值
module.exports = {
  // 数据库配置
  database: {
    host: 'localhost',
    port: 3306,
    user: 'your_mysql_username',
    password: 'your_mysql_password',
    database: 'movie_list_checker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },

  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // Google Drive API配置
  googleDrive: {
    clientId: 'your_google_client_id',
    clientSecret: 'your_google_client_secret',
    redirectUri: 'http://localhost:3000/auth/google/callback',
    refreshToken: 'your_refresh_token'
  },

  // Google Drive设置
  driveSettings: {
    sharedDriveId: 'your_shared_drive_id',
    targetFolderPath: '/path/to/your/folder'
  }
};
