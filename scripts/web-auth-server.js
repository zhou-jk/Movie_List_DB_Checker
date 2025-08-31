// VPS Web认证服务器
// 在VPS上临时启动web服务器进行Google Drive API认证

const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class WebAuthServer {
  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.oauth2Client = null;
    this.server = null;
  }

  async initialize() {
    console.log('🔧 初始化Web认证服务器...');
    
    // 获取配置
    const config = await this.getConfig();
    
    // 设置OAuth客户端
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      `http://localhost:${this.port}/callback`
    );

    this.setupRoutes();
  }

  async getConfig() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('请输入Google Drive API配置信息：');
    
    const clientId = await new Promise((resolve) => {
      rl.question('Client ID: ', (answer) => {
        resolve(answer.trim());
      });
    });

    const clientSecret = await new Promise((resolve) => {
      rl.question('Client Secret: ', (answer) => {
        resolve(answer.trim());
      });
    });

    rl.close();

    if (!clientId || !clientSecret) {
      throw new Error('配置信息不能为空');
    }

    return { clientId, clientSecret };
  }

  setupRoutes() {
    // 主页 - 开始认证
    this.app.get('/', (req, res) => {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.readonly'],
        prompt: 'consent'
      });

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Google Drive API认证</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .btn {
                    display: inline-block;
                    background-color: #4285f4;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    transition: background-color 0.3s;
                }
                .btn:hover {
                    background-color: #3367d6;
                }
                .warning {
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .step {
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #f8f9fa;
                    border-left: 4px solid #007bff;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Google Drive API认证</h1>
                <p>欢迎使用Movie List DB Checker认证工具！</p>
                
                <div class="warning">
                    <strong>⚠️ 注意:</strong> 这是一个临时认证服务器，仅用于获取API令牌。认证完成后请立即关闭此服务器。
                </div>

                <div class="step">
                    <h3>📋 认证步骤:</h3>
                    <ol>
                        <li>点击下方按钮进行Google授权</li>
                        <li>授权成功后会自动跳转回来</li>
                        <li>复制生成的配置信息到config.js</li>
                        <li>关闭此认证服务器</li>
                    </ol>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${authUrl}" class="btn">🔗 开始Google授权</a>
                </div>

                <div style="font-size: 14px; color: #666;">
                    <p><strong>服务器信息:</strong></p>
                    <ul>
                        <li>端口: ${this.port}</li>
                        <li>回调地址: http://localhost:${this.port}/callback</li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
      `);
    });

    // OAuth回调处理
    this.app.get('/callback', async (req, res) => {
      try {
        const { code, error } = req.query;

        if (error) {
          throw new Error(`授权错误: ${error}`);
        }

        if (!code) {
          throw new Error('未获取到授权码');
        }

        console.log('🔄 正在处理授权回调...');

        // 获取访问令牌
        const { tokens } = await this.oauth2Client.getToken(code);
        
        console.log('✅ 令牌获取成功');

        // 测试API访问
        this.oauth2Client.setCredentials(tokens);
        const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        const userInfo = await drive.about.get({ fields: 'user' });

        // 生成配置
        const config = {
          googleDrive: {
            clientId: this.oauth2Client._clientId,
            clientSecret: this.oauth2Client._clientSecret,
            redirectUri: 'http://localhost:3000/auth/google/callback',
            refreshToken: tokens.refresh_token
          }
        };

        // 保存到文件
        const configPath = path.join(__dirname, '../google-drive-tokens.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        console.log(`💾 令牌已保存到: ${configPath}`);
        console.log(`👤 授权用户: ${userInfo.data.user.displayName} (${userInfo.data.user.emailAddress})`);

        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>认证成功</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                  body {
                      font-family: Arial, sans-serif;
                      max-width: 800px;
                      margin: 50px auto;
                      padding: 20px;
                      background-color: #f5f5f5;
                  }
                  .container {
                      background: white;
                      padding: 30px;
                      border-radius: 10px;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  }
                  .success {
                      background-color: #d4edda;
                      border: 1px solid #c3e6cb;
                      color: #155724;
                      padding: 15px;
                      border-radius: 5px;
                      margin: 20px 0;
                  }
                  .code-block {
                      background-color: #f8f9fa;
                      border: 1px solid #e9ecef;
                      padding: 15px;
                      border-radius: 5px;
                      font-family: 'Courier New', monospace;
                      font-size: 14px;
                      margin: 15px 0;
                      white-space: pre-wrap;
                      overflow-x: auto;
                  }
                  .btn {
                      display: inline-block;
                      background-color: #28a745;
                      color: white;
                      padding: 10px 20px;
                      text-decoration: none;
                      border-radius: 5px;
                      margin: 10px 5px;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <h1>✅ 认证成功！</h1>
                  
                  <div class="success">
                      <strong>🎉 Google Drive API令牌获取成功！</strong><br>
                      授权用户: ${userInfo.data.user.displayName} (${userInfo.data.user.emailAddress})
                  </div>

                  <h3>📋 配置信息 (复制到config.js):</h3>
                  <div class="code-block">googleDrive: {
  clientId: '${this.oauth2Client._clientId}',
  clientSecret: '${this.oauth2Client._clientSecret}',
  redirectUri: 'http://localhost:3000/auth/google/callback',
  refreshToken: '${tokens.refresh_token}'
}</div>

                  <h3>📁 文件保存位置:</h3>
                  <p>配置信息已保存到: <code>google-drive-tokens.json</code></p>

                  <h3>🚀 下一步:</h3>
                  <ol>
                      <li>复制上述配置信息到你的config.js文件</li>
                      <li>关闭此认证服务器</li>
                      <li>启动你的应用程序</li>
                  </ol>

                  <div style="text-align: center; margin: 30px 0;">
                      <a href="/shutdown" class="btn">🛑 关闭认证服务器</a>
                  </div>
              </div>
          </body>
          </html>
        `);

      } catch (error) {
        console.error('❌ 回调处理失败:', error);
        
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>认证失败</title>
              <meta charset="utf-8">
              <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  .error { color: red; }
              </style>
          </head>
          <body>
              <h2 class="error">❌ 认证失败</h2>
              <p>错误信息: ${error.message}</p>
              <p><a href="/">返回重试</a></p>
          </body>
          </html>
        `);
      }
    });

    // 关闭服务器
    this.app.get('/shutdown', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>服务器关闭</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            </style>
        </head>
        <body>
            <h2>🛑 服务器正在关闭...</h2>
            <p>感谢使用！服务器将在3秒后关闭。</p>
        </body>
        </html>
      `);
      
      setTimeout(() => {
        console.log('🛑 认证服务器关闭');
        process.exit(0);
      }, 3000);
    });
  }

  start() {
    this.server = this.app.listen(this.port, '0.0.0.0', () => {
      console.log('🌐 Web认证服务器启动成功！');
      console.log('================================');
      console.log(`📍 本地访问: http://localhost:${this.port}`);
      console.log(`📍 远程访问: http://your-vps-ip:${this.port}`);
      console.log('📋 请在浏览器中访问上述地址进行认证');
      console.log('⚠️  认证完成后请立即关闭此服务器\n');
    });

    // 优雅关闭
    process.on('SIGINT', () => {
      console.log('\n🛑 收到关闭信号...');
      if (this.server) {
        this.server.close(() => {
          console.log('✅ 服务器已关闭');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  }
}

// 主函数
async function main() {
  const port = process.argv[2] || 8080;
  
  console.log('🔐 VPS Google Drive API Web认证工具');
  console.log('=====================================\n');
  
  try {
    const server = new WebAuthServer(port);
    await server.initialize();
    server.start();
  } catch (error) {
    console.error('❌ 服务器启动失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = WebAuthServer;

