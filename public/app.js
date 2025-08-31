// 应用状态管理
const AppState = {
    currentSection: 'checker',
    currentPage: 1,
    filesPerPage: 50,
    searchTerm: '',
    isLoading: false
};

// DOM元素引用
const elements = {
    // 导航
    navLinks: document.querySelectorAll('[data-section]'),
    
    // 统计卡片
    totalFiles: document.getElementById('totalFiles'),
    foundCids: document.getElementById('foundCids'),
    totalCids: document.getElementById('totalCids'),
    syncStatus: document.getElementById('syncStatus'),
    syncBtn: document.getElementById('syncBtn'),
    
    // CID检查器
    cidInput: document.getElementById('cidInput'),
    checkBtn: document.getElementById('checkBtn'),
    clearBtn: document.getElementById('clearBtn'),
    checkResults: document.getElementById('checkResults'),
    
    // 文件列表
    fileSearch: document.getElementById('fileSearch'),
    filesTableBody: document.getElementById('filesTableBody'),
    filesPagination: document.getElementById('filesPagination'),
    
    // 统计页面
    systemStats: document.getElementById('systemStats'),
    recentActivity: document.getElementById('recentActivity'),
    
    // 通知和模态框
    toast: document.getElementById('toast'),
    toastTitle: document.getElementById('toastTitle'),
    toastMessage: document.getElementById('toastMessage'),
    loadingModal: document.getElementById('loadingModal'),
    loadingMessage: document.getElementById('loadingMessage')
};

// 工具函数
const utils = {
    // 格式化文件大小
    formatFileSize(bytes) {
        if (!bytes) return '-';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    },
    
    // 格式化时间
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN');
    },
    
    // 显示Toast通知
    showToast(title, message, type = 'info') {
        elements.toastTitle.textContent = title;
        elements.toastMessage.textContent = message;
        
        // 设置样式
        elements.toast.className = `toast show bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} text-white`;
        
        const toast = new bootstrap.Toast(elements.toast);
        toast.show();
    },
    
    // 显示加载模态框
    showLoading(message = '正在处理中...') {
        elements.loadingMessage.textContent = message;
        const modal = new bootstrap.Modal(elements.loadingModal);
        modal.show();
        AppState.isLoading = true;
    },
    
    // 隐藏加载模态框
    hideLoading() {
        const modal = bootstrap.Modal.getInstance(elements.loadingModal);
        if (modal) modal.hide();
        AppState.isLoading = false;
    },
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// API调用函数
const api = {
    // 基础请求函数
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },
    
    // 获取统计信息
    async getStats() {
        return await this.request('/api/stats');
    },
    
    // 检查CID
    async checkCids(cids) {
        return await this.request('/api/check-cids', {
            method: 'POST',
            body: JSON.stringify({ cids })
        });
    },
    
    // 获取文件列表
    async getFiles(page = 1, limit = 50, search = '') {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search
        });
        return await this.request(`/api/files?${params}`);
    },
    
    // 触发同步
    async triggerSync() {
        return await this.request('/api/sync', {
            method: 'POST'
        });
    },
    
    // 健康检查
    async healthCheck() {
        return await this.request('/api/health');
    }
};

// 页面功能模块
const modules = {
    // 导航管理
    navigation: {
        init() {
            elements.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = link.dataset.section;
                    this.switchSection(section);
                });
            });
        },
        
        switchSection(section) {
            // 更新导航状态
            elements.navLinks.forEach(link => {
                link.classList.toggle('active', link.dataset.section === section);
            });
            
            // 显示/隐藏内容区域
            document.querySelectorAll('.content-section').forEach(el => {
                el.style.display = el.id === section ? 'block' : 'none';
            });
            
            AppState.currentSection = section;
            
            // 加载对应内容
            switch (section) {
                case 'files':
                    this.loadFiles();
                    break;
                case 'stats':
                    this.loadStats();
                    break;
            }
        },
        
        async loadFiles() {
            try {
                const data = await api.getFiles(AppState.currentPage, AppState.filesPerPage, AppState.searchTerm);
                modules.filesList.renderFiles(data.files);
                modules.filesList.renderPagination(data.pagination);
            } catch (error) {
                utils.showToast('错误', '加载文件列表失败', 'error');
            }
        },
        
        async loadStats() {
            try {
                const stats = await api.getStats();
                modules.statistics.renderSystemStats(stats);
            } catch (error) {
                utils.showToast('错误', '加载统计信息失败', 'error');
            }
        }
    },
    
    // CID检查器
    cidChecker: {
        init() {
            elements.checkBtn.addEventListener('click', () => this.checkCids());
            elements.clearBtn.addEventListener('click', () => this.clearInput());
            
            // 添加快捷键支持
            elements.cidInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.checkCids();
                }
            });
        },
        
        async checkCids() {
            const input = elements.cidInput.value.trim();
            if (!input) {
                utils.showToast('提示', '请输入要检查的CID', 'warning');
                return;
            }
            
            const cids = input.split('\n')
                             .map(line => line.trim())
                             .filter(line => line.length > 0);
            
            if (cids.length === 0) {
                utils.showToast('提示', '请输入有效的CID', 'warning');
                return;
            }
            
            try {
                elements.checkBtn.disabled = true;
                elements.checkBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-1"></i>检查中...';
                
                const results = await api.checkCids(cids);
                this.renderResults(results);
                
                utils.showToast('成功', `检查完成！找到 ${results.foundCount} 个，未找到 ${results.notFoundCount} 个`, 'success');
            } catch (error) {
                utils.showToast('错误', '检查失败，请重试', 'error');
            } finally {
                elements.checkBtn.disabled = false;
                elements.checkBtn.innerHTML = '<i class="bi bi-search me-1"></i>检查CID';
            }
        },
        
        renderResults(results) {
            let html = `
                <div class="mb-3">
                    <div class="row">
                        <div class="col-sm-4">
                            <div class="text-center">
                                <div class="h5 text-primary">${results.total}</div>
                                <div class="text-muted">总数</div>
                            </div>
                        </div>
                        <div class="col-sm-4">
                            <div class="text-center">
                                <div class="h5 text-success">${results.foundCount}</div>
                                <div class="text-muted">已找到</div>
                            </div>
                        </div>
                        <div class="col-sm-4">
                            <div class="text-center">
                                <div class="h5 text-danger">${results.notFoundCount}</div>
                                <div class="text-muted">未找到</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 已找到的CID
            if (results.found.length > 0) {
                html += '<h6 class="text-success">✓ 已找到的CID:</h6>';
                results.found.forEach(item => {
                    html += `
                        <div class="result-item found">
                            <div class="cid-text">${item.cid}</div>
                            <div class="file-info">
                                找到 ${item.files.length} 个匹配文件:
                                ${item.files.map(file => `<br>📁 ${file.file_name}`).join('')}
                            </div>
                        </div>
                    `;
                });
            }
            
            // 未找到的CID
            if (results.notFound.length > 0) {
                html += '<h6 class="text-danger mt-3">✗ 未找到的CID:</h6>';
                results.notFound.forEach(cid => {
                    html += `
                        <div class="result-item not-found">
                            <div class="cid-text">${cid}</div>
                        </div>
                    `;
                });
            }
            
            elements.checkResults.innerHTML = html;
        },
        
        clearInput() {
            elements.cidInput.value = '';
            elements.checkResults.innerHTML = `
                <div class="text-muted text-center">
                    <i class="bi bi-info-circle fs-1"></i>
                    <p class="mt-2">在左侧输入CID并点击检查按钮</p>
                </div>
            `;
        }
    },
    
    // 文件列表管理
    filesList: {
        init() {
            // 搜索功能
            elements.fileSearch.addEventListener('input', 
                utils.debounce((e) => {
                    AppState.searchTerm = e.target.value;
                    AppState.currentPage = 1;
                    modules.navigation.loadFiles();
                }, 300)
            );
        },
        
        renderFiles(files) {
            if (files.length === 0) {
                elements.filesTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            <i class="bi bi-inbox fs-2"></i>
                            <p class="mt-2">暂无文件数据</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            const html = files.map(file => `
                <tr>
                    <td>
                        <div class="file-name">${file.file_name}</div>
                    </td>
                    <td>
                        <div class="file-path">${file.file_path}</div>
                    </td>
                    <td>
                        <div class="file-size">${utils.formatFileSize(file.file_size)}</div>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${file.mime_type || '未知'}</span>
                    </td>
                    <td>${utils.formatDateTime(file.modified_time)}</td>
                </tr>
            `).join('');
            
            elements.filesTableBody.innerHTML = html;
        },
        
        renderPagination(pagination) {
            const { page, totalPages } = pagination;
            
            if (totalPages <= 1) {
                elements.filesPagination.innerHTML = '';
                return;
            }
            
            let html = '';
            
            // 上一页
            html += `
                <li class="page-item ${page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${page - 1}">上一页</a>
                </li>
            `;
            
            // 页码
            const startPage = Math.max(1, page - 2);
            const endPage = Math.min(totalPages, page + 2);
            
            if (startPage > 1) {
                html += '<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>';
                if (startPage > 2) {
                    html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `
                    <li class="page-item ${i === page ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                }
                html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
            }
            
            // 下一页
            html += `
                <li class="page-item ${page === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${page + 1}">下一页</a>
                </li>
            `;
            
            elements.filesPagination.innerHTML = html;
            
            // 添加点击事件
            elements.filesPagination.querySelectorAll('a[data-page]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const pageNum = parseInt(link.dataset.page);
                    if (pageNum && pageNum !== AppState.currentPage) {
                        AppState.currentPage = pageNum;
                        modules.navigation.loadFiles();
                    }
                });
            });
        }
    },
    
    // 统计信息
    statistics: {
        renderSystemStats(stats) {
            const html = `
                <div class="stat-item">
                    <div class="d-flex justify-content-between">
                        <span class="stat-label">文件总数:</span>
                        <span class="stat-value">${stats.totalFiles.toLocaleString()}</span>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="d-flex justify-content-between">
                        <span class="stat-label">CID总数:</span>
                        <span class="stat-value">${stats.totalCids.toLocaleString()}</span>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="d-flex justify-content-between">
                        <span class="stat-label">已找到CID:</span>
                        <span class="stat-value text-success">${stats.foundCids.toLocaleString()}</span>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="d-flex justify-content-between">
                        <span class="stat-label">最后同步:</span>
                        <span class="stat-value">${stats.lastSyncTime ? utils.formatDateTime(stats.lastSyncTime) : '从未同步'}</span>
                    </div>
                </div>
            `;
            elements.systemStats.innerHTML = html;
        }
    },
    
    // 同步功能
    sync: {
        init() {
            elements.syncBtn.addEventListener('click', () => this.triggerSync());
        },
        
        async triggerSync() {
            if (AppState.isLoading) return;
            
            try {
                utils.showLoading('正在同步Google Drive文件...');
                const result = await api.triggerSync();
                utils.hideLoading();
                utils.showToast('成功', result.message, 'success');
                
                // 刷新统计信息
                this.updateStats();
            } catch (error) {
                utils.hideLoading();
                utils.showToast('错误', '同步失败，请重试', 'error');
            }
        },
        
        async updateStats() {
            try {
                const stats = await api.getStats();
                elements.totalFiles.textContent = stats.totalFiles.toLocaleString();
                elements.foundCids.textContent = stats.foundCids.toLocaleString();
                elements.totalCids.textContent = stats.totalCids.toLocaleString();
                elements.syncStatus.textContent = stats.lastSyncTime ? 
                    utils.formatDateTime(stats.lastSyncTime) : '从未同步';
            } catch (error) {
                console.error('更新统计信息失败:', error);
            }
        }
    }
};

// 应用初始化
class App {
    async init() {
        try {
            // 检查API连接
            await api.healthCheck();
            
            // 初始化各模块
            modules.navigation.init();
            modules.cidChecker.init();
            modules.filesList.init();
            modules.sync.init();
            
            // 加载初始统计数据
            await modules.sync.updateStats();
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
            utils.showToast('错误', '应用初始化失败，请检查服务器连接', 'error');
        }
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});

// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    utils.showToast('错误', '发生未知错误，请刷新页面', 'error');
});

// 网络状态监测
window.addEventListener('online', () => {
    utils.showToast('网络', '网络连接已恢复', 'success');
});

window.addEventListener('offline', () => {
    utils.showToast('网络', '网络连接已断开', 'warning');
});
