const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2/promise');

// 导入配置和路由
let config;
try {
  config = require('./config');
} catch (error) {
  console.error('配置文件未找到，请复制 config.example.js 为 config.js 并填入配置信息');
  process.exit(1);
}

const app = express();

// 中间件设置
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 数据库连接池
let dbPool;
async function initDatabase() {
  try {
    dbPool = mysql.createPool(config.database);
    console.log('数据库连接池已创建');
    
    // 测试连接
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    console.log('数据库连接测试成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
}

// 工具函数：获取数据库连接
async function getDbConnection() {
  return await dbPool.getConnection();
}

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: require('./package.json').version
  });
});

// 获取文件列表接口
app.get('/api/files', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const connection = await getDbConnection();
    
    let query = 'SELECT * FROM files';
    let countQuery = 'SELECT COUNT(*) as total FROM files';
    const params = [];
    
    if (search) {
      query += ' WHERE file_name LIKE ? OR file_path LIKE ?';
      countQuery += ' WHERE file_name LIKE ? OR file_path LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY modified_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [files] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, search ? [`%${search}%`, `%${search}%`] : []);
    
    connection.release();

    res.json({
      files,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 检查CID接口
app.post('/api/check-cids', async (req, res) => {
  try {
    const { cids } = req.body;
    
    if (!cids || !Array.isArray(cids)) {
      return res.status(400).json({ error: 'CIDs必须是数组格式' });
    }

    const connection = await getDbConnection();
    
    const results = {
      total: cids.length,
      found: [],
      notFound: [],
      foundCount: 0,
      notFoundCount: 0
    };

    for (const cid of cids) {
      const trimmedCid = cid.trim();
      if (!trimmedCid) continue;

      // 检查CID是否存在于文件名中
      const [fileResults] = await connection.execute(
        'SELECT file_id, file_name, file_path FROM files WHERE file_name LIKE ?',
        [`%${trimmedCid}%`]
      );

      if (fileResults.length > 0) {
        results.found.push({
          cid: trimmedCid,
          files: fileResults
        });
        results.foundCount++;

        // 更新或插入CID记录
        await connection.execute(
          `INSERT INTO dmm_cids (cid, file_id, status, first_found_time) 
           VALUES (?, ?, 'found', NOW()) 
           ON DUPLICATE KEY UPDATE 
           status = 'found', 
           last_checked_time = NOW(),
           first_found_time = COALESCE(first_found_time, NOW())`,
          [trimmedCid, fileResults[0].file_id]
        );
      } else {
        results.notFound.push(trimmedCid);
        results.notFoundCount++;

        // 更新或插入CID记录
        await connection.execute(
          `INSERT INTO dmm_cids (cid, status) 
           VALUES (?, 'not_found') 
           ON DUPLICATE KEY UPDATE 
           status = 'not_found', 
           last_checked_time = NOW()`,
          [trimmedCid]
        );
      }
    }

    // 记录查询历史
    await connection.execute(
      'INSERT INTO query_history (query_text, total_cids, found_cids, not_found_cids, ip_address) VALUES (?, ?, ?, ?, ?)',
      [cids.join(','), results.total, results.foundCount, results.notFoundCount, req.ip]
    );

    connection.release();

    res.json(results);
  } catch (error) {
    console.error('检查CID失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取统计信息接口
app.get('/api/stats', async (req, res) => {
  try {
    const connection = await getDbConnection();
    
    const [filesCount] = await connection.execute('SELECT COUNT(*) as count FROM files');
    const [cidsCount] = await connection.execute('SELECT COUNT(*) as count FROM dmm_cids');
    const [foundCidsCount] = await connection.execute("SELECT COUNT(*) as count FROM dmm_cids WHERE status = 'found'");
    const [lastSync] = await connection.execute("SELECT config_value FROM system_config WHERE config_key = 'last_sync_time'");
    
    connection.release();

    res.json({
      totalFiles: filesCount[0].count,
      totalCids: cidsCount[0].count,
      foundCids: foundCidsCount[0].count,
      lastSyncTime: lastSync[0]?.config_value || null
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 手动触发同步接口
app.post('/api/sync', async (req, res) => {
  try {
    // 这里将调用Google Drive同步逻辑
    const driveService = require('./services/googleDriveService');
    
    res.json({ message: '同步任务已启动，请稍后查看结果' });
    
    // 异步执行同步
    driveService.syncFiles().catch(error => {
      console.error('同步失败:', error);
    });
  } catch (error) {
    console.error('启动同步失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('未处理的错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API接口不存在' });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// 启动服务器
async function startServer() {
  await initDatabase();
  
  const port = config.server.port;
  app.listen(port, () => {
    console.log(`服务器已启动，端口: ${port}`);
    console.log(`访问地址: http://localhost:${port}`);
    console.log(`API健康检查: http://localhost:${port}/api/health`);
  });
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  if (dbPool) {
    await dbPool.end();
    console.log('数据库连接池已关闭');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  if (dbPool) {
    await dbPool.end();
    console.log('数据库连接池已关闭');
  }
  process.exit(0);
});

startServer().catch(error => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});

// 导出app用于测试
module.exports = app;
