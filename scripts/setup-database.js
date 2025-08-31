const mysql = require('mysql2/promise');
const config = require('../config');

async function setupDatabase() {
  try {
    console.log('正在连接MySQL...');
    
    // 首先连接到MySQL服务器（不指定数据库）
    const connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password
    });

    console.log('已连接到MySQL服务器');

    // 创建数据库
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.database.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`数据库 ${config.database.database} 已创建或已存在`);

    // 选择数据库
    await connection.execute(`USE ${config.database.database}`);

    // 创建文件表
    const createFilesTable = `
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'Google Drive文件ID',
        file_name VARCHAR(500) NOT NULL COMMENT '文件名',
        file_path VARCHAR(1000) NOT NULL COMMENT '文件路径',
        file_size BIGINT COMMENT '文件大小（字节）',
        mime_type VARCHAR(100) COMMENT 'MIME类型',
        modified_time TIMESTAMP COMMENT '最后修改时间',
        created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_file_name (file_name),
        INDEX idx_file_path (file_path),
        INDEX idx_modified_time (modified_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Google Drive文件信息表'
    `;

    await connection.execute(createFilesTable);
    console.log('文件表已创建');

    // 创建DMM CID表
    const createCidsTable = `
      CREATE TABLE IF NOT EXISTS dmm_cids (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cid VARCHAR(50) UNIQUE NOT NULL COMMENT 'DMM CID',
        file_id VARCHAR(255) COMMENT '关联的Google Drive文件ID',
        status ENUM('found', 'not_found', 'pending') DEFAULT 'pending' COMMENT '状态',
        first_found_time TIMESTAMP NULL COMMENT '首次发现时间',
        last_checked_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后检查时间',
        created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_cid (cid),
        INDEX idx_status (status),
        INDEX idx_file_id (file_id),
        FOREIGN KEY (file_id) REFERENCES files(file_id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='DMM CID记录表'
    `;

    await connection.execute(createCidsTable);
    console.log('DMM CID表已创建');

    // 创建查询历史表
    const createQueryHistoryTable = `
      CREATE TABLE IF NOT EXISTS query_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        query_text TEXT NOT NULL COMMENT '查询的CID列表',
        total_cids INT NOT NULL COMMENT '总CID数量',
        found_cids INT NOT NULL COMMENT '已找到的CID数量',
        not_found_cids INT NOT NULL COMMENT '未找到的CID数量',
        query_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '查询时间',
        ip_address VARCHAR(45) COMMENT '查询IP地址',
        INDEX idx_query_time (query_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='查询历史表'
    `;

    await connection.execute(createQueryHistoryTable);
    console.log('查询历史表已创建');

    // 创建系统配置表
    const createConfigTable = `
      CREATE TABLE IF NOT EXISTS system_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
        config_value TEXT COMMENT '配置值',
        description VARCHAR(255) COMMENT '配置描述',
        created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表'
    `;

    await connection.execute(createConfigTable);
    console.log('系统配置表已创建');

    // 插入默认配置
    const insertDefaultConfig = `
      INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
      ('last_sync_time', NULL, '最后同步Google Drive的时间'),
      ('sync_in_progress', 'false', '是否正在同步'),
      ('total_files_synced', '0', '已同步的文件总数')
    `;

    await connection.execute(insertDefaultConfig);
    console.log('默认配置已插入');

    await connection.end();
    console.log('数据库设置完成！');

  } catch (error) {
    console.error('数据库设置失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;

