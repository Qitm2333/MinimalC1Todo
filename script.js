// ============================================
// 数据管理
// ============================================
class TodoApp {
    constructor() {
        this.tasks = this.loadTasks();
        this.editingTaskId = null;
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.selectedDate.setHours(0, 0, 0, 0);
        this.draggedTaskId = null;
        this.focusRecords = this.loadFocusRecords();
        this.currentFocusTask = null;
        this.focusTimer = null;
        this.focusSeconds = 0;
        this.focusStartTime = null;
        this.selectedColor = '#2563eb'; // 默认蓝色
        
        // C1 3D 渲染器
        this.c1Renderer = null;
        this.initC1Renderer();
        
        this.init();
    }

    init() {
        this.renderTasks();
        this.setupEventListeners();
        this.updateDate();
        this.renderCalendar();
        this.setupResizer();
        this.setupFocusListeners();
        this.renderFocusStats();
        this.setupConfirmModal();
        this.setupThemeToggle();
        this.setupC1Toggle();
    }

    // 自定义确认弹窗
    showConfirm(message, title = '确认') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const messageEl = document.getElementById('confirm-message');
            const okBtn = document.getElementById('confirm-ok-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.classList.add('show');
            
            const handleOk = () => {
                modal.classList.remove('show');
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                resolve(true);
            };
            
            const handleCancel = () => {
                modal.classList.remove('show');
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                resolve(false);
            };
            
            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            
            // 点击背景关闭
            modal.onclick = (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            };
        });
    }

    setupConfirmModal() {
        // 模态框背景点击关闭
        const modal = document.getElementById('confirm-modal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }

    // 本地存储
    loadTasks() {
        const tasks = localStorage.getItem('minimalTodoTasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    saveTasks() {
        localStorage.setItem('minimalTodoTasks', JSON.stringify(this.tasks));
    }

    // 加载专注记录
    loadFocusRecords() {
        const records = localStorage.getItem('minimalTodoFocusRecords');
        return records ? JSON.parse(records) : [];
    }

    // 保存专注记录
    saveFocusRecords() {
        localStorage.setItem('minimalTodoFocusRecords', JSON.stringify(this.focusRecords));
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 添加任务
    addTask(text, priority = 'low', color = null) {
        if (!text.trim()) return;

        const task = {
            id: this.generateId(),
            text: text.trim(),
            completed: false,
            priority: priority,
            color: color || this.selectedColor,
            createdAt: new Date().toISOString(),
            dueDates: [], // 支持多个日期
            isToday: true
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.renderCalendar();

        // 清空输入框
        document.getElementById('task-input').value = '';
        
        // 重置颜色选择
        this.selectedColor = '#2563eb';
        this.updateColorPicker();
        
        // 添加成功动画
        this.showNotification('任务已添加');
    }

    // 删除任务
    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.renderCalendar();
        this.showNotification('任务已删除');
    }

    // 切换完成状态
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.renderCalendar();
        }
    }

    // 编辑任务
    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            this.editingTaskId = id;
            document.getElementById('edit-task-input').value = task.text;
            document.getElementById('edit-priority-select').value = task.priority;
            this.selectedColor = task.color || '#2563eb';
            this.updateColorPicker(true);
            this.showModal();
        }
    }

    // 保存编辑
    saveEdit() {
        const task = this.tasks.find(t => t.id === this.editingTaskId);
        const newText = document.getElementById('edit-task-input').value.trim();
        const newPriority = document.getElementById('edit-priority-select').value;

        if (task && newText) {
            task.text = newText;
            task.priority = newPriority;
            task.color = this.selectedColor;
            this.saveTasks();
            this.renderTasks();
            this.renderCalendar();
            this.hideModal();
            this.showNotification('任务已更新');
        }
    }

    // 获取所有任务
    getFilteredTasks() {
        return this.tasks;
    }

    // 计算任务的总专注时长（秒）
    getTaskTotalFocusTime(taskId) {
        return this.focusRecords
            .filter(record => record.taskId === taskId)
            .reduce((total, record) => total + (record.duration || 0), 0);
    }

    // 渲染任务列表
    renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        const emptyState = document.getElementById('empty-state');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = '';
            emptyState.classList.add('show');
            return;
        }

        emptyState.classList.remove('show');
        
        tasksList.innerHTML = filteredTasks.map(task => {
            // 处理多个日期显示
            const dueDates = task.dueDates || (task.dueDate ? [task.dueDate] : []); // 兼容旧数据
            let dueDateText = '';
            if (dueDates.length > 0) {
                dueDateText = `${dueDates.length}个日期`;
            }
            
            // 计算总专注时长
            const totalFocusSeconds = this.getTaskTotalFocusTime(task.id);
            const focusTimeText = totalFocusSeconds > 0 ? `已专注${this.formatDuration(totalFocusSeconds)}` : '';
            
            // 组合元数据，用 · 分隔
            const metaParts = [dueDateText, focusTimeText].filter(text => text);
            const metaText = metaParts.join(' · ');
            
            const taskColor = task.color || '#2563eb';
            return `
            <div class="task-card ${task.completed ? 'completed' : ''}" 
                 data-id="${task.id}" 
                 draggable="true"
                 style="border-left-color: ${taskColor};">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="app.toggleTask('${task.id}')"></div>
                <div class="priority-indicator ${task.priority}" style="background-color: ${taskColor};"></div>
                <div class="task-content">
                    <div class="task-text">${this.escapeHtml(task.text)}</div>
                    ${metaText ? `<div class="task-meta">${metaText}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="task-btn focus" onclick="app.startFocus('${task.id}')">专注</button>
                    <button class="task-btn edit" onclick="app.editTask('${task.id}')">编辑</button>
                    <button class="task-btn delete" onclick="app.deleteTask('${task.id}')">删除</button>
                </div>
            </div>
        `}).join('');

        // 添加拖拽事件监听
        this.setupDragEvents();
    }

    // 更新日期显示
    updateDate() {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        const dateStr = now.toLocaleDateString('zh-CN', options);
        document.getElementById('current-date').textContent = dateStr;
    }

    // 格式化创建时间（显示过去的时间）
    formatCreatedDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        
        // 设置为当天0点进行比较，避免时分秒影响
        const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.floor((nowDay - dateDay) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays < 7) return `${diffDays}天前`;
        
        return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    }
    
    // 格式化截止日期（显示未来或过期的时间）
    formatDueDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        
        // 设置为当天0点进行比较
        const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.floor((dateDay - nowDay) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return '今天到期';
        if (diffDays === 1) return '明天到期';
        if (diffDays === -1) return '昨天已过期';
        if (diffDays > 0 && diffDays < 7) return `${diffDays}天后`;
        if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)}天前已过期`;
        
        if (diffDays >= 0) {
            return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
        } else {
            return `${date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} 已过期`;
        }
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示通知
    showNotification(message) {
        // 简单的控制台通知，可以扩展为Toast通知
        console.log('✓', message);
    }

    // 模态框控制
    showModal() {
        document.getElementById('edit-modal').classList.add('show');
    }

    hideModal() {
        document.getElementById('edit-modal').classList.remove('show');
        this.editingTaskId = null;
    }

    // 事件监听器
    setupEventListeners() {
        // 添加任务
        document.getElementById('add-task-btn').addEventListener('click', () => {
            const text = document.getElementById('task-input').value;
            const priority = document.getElementById('priority-select').value;
            this.addTask(text, priority);
        });

        // 回车添加任务
        document.getElementById('task-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = e.target.value;
                const priority = document.getElementById('priority-select').value;
                this.addTask(text, priority);
            }
        });

        // 模态框关闭
        document.getElementById('modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            this.hideModal();
        });

        // 保存编辑
        document.getElementById('save-edit-btn').addEventListener('click', () => {
            this.saveEdit();
        });

        // 点击模态框外部关闭
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal') {
                this.hideModal();
            }
        });

        // 编辑框回车保存
        document.getElementById('edit-task-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveEdit();
            }
        });

        // 日历导航
        document.getElementById('prev-month').addEventListener('click', () => {
            this.changeMonth(-1);
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.changeMonth(1);
        });

        // 收起/展开任务列表
        document.getElementById('collapse-btn').addEventListener('click', () => {
            this.toggleTaskList();
        });

        // 颜色选择器
        this.setupColorPickers();

        // 数据备份
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file-input').click();
        });

        document.getElementById('import-file-input').addEventListener('change', (e) => {
            this.importData(e);
        });

        // Tab键快捷键切换任务列表
        document.addEventListener('keydown', (e) => {
            // 只在Tab键且没有焦点在输入框时触发
            if (e.key === 'Tab' && !this.isInputFocused()) {
                e.preventDefault();
                this.toggleTaskList();
            }
        });
    }

    // 检查是否有输入框被聚焦
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable
        );
    }

    // 设置颜色选择器
    setupColorPickers() {
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.selectedColor = option.dataset.color;
                this.updateColorPicker();
            });
        });
        
        // 初始化选中状态
        this.updateColorPicker();
    }

    // 更新颜色选择器选中状态
    updateColorPicker(isModal = false) {
        const selector = isModal ? '.modal-body .color-option' : '.add-task-section .color-option, .modal-body .color-option';
        const colorOptions = document.querySelectorAll(selector);
        colorOptions.forEach(option => {
            if (option.dataset.color === this.selectedColor) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    // 收起/展开任务列表
    toggleTaskList() {
        const container = document.querySelector('.container');
        const mainContent = document.querySelector('.main-content');
        const isCollapsed = container.classList.toggle('sidebar-collapsed');
        
        if (isCollapsed) {
            mainContent.classList.add('collapsed');
        } else {
            mainContent.classList.remove('collapsed');
        }
    }

    // ============================================
    // 日历功能
    // ============================================
    
    // 渲染日历
    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 更新月份标题
        document.getElementById('calendar-month-year').textContent = 
            `${year}年${month + 1}月`;
        
        // 获取当月第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 获取第一天是星期几（0=周日，1=周一...）
        const firstDayOfWeek = firstDay.getDay();
        
        // 获取当月天数
        const daysInMonth = lastDay.getDate();
        
        // 获取上个月的最后几天
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        
        const calendarGrid = document.getElementById('calendar-grid');
        calendarGrid.innerHTML = '';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 渲染上月日期
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const dayElement = this.createDayElement(day, true, null);
            calendarGrid.appendChild(dayElement);
        }
        
        // 渲染当月日期
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = date.getTime() === today.getTime();
            const dayElement = this.createDayElement(day, false, date, isToday);
            calendarGrid.appendChild(dayElement);
        }
        
        // 渲染下月日期
        const remainingDays = 42 - (firstDayOfWeek + daysInMonth); // 6行 x 7列
        for (let day = 1; day <= remainingDays; day++) {
            const dayElement = this.createDayElement(day, true, null);
            calendarGrid.appendChild(dayElement);
        }
    }
    
    // 创建日期元素
    createDayElement(day, isOtherMonth, date, isToday = false) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        
        if (isToday) {
            dayElement.classList.add('today');
        }
        
        // 检查是否为选中日期
        if (!isOtherMonth && date && date.getTime() === this.selectedDate.getTime()) {
            dayElement.classList.add('selected');
        }
        
        // 添加日期数字
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        
        // 如果不是其他月份，添加任务列表和拖拽功能
        if (!isOtherMonth && date) {
            // 添加点击事件来选择日期
            dayElement.addEventListener('click', (e) => {
                // 如果点击的是复选框、任务文本或删除按钮，不触发日期选择
                if (e.target.classList.contains('calendar-task-checkbox') || 
                    e.target.classList.contains('calendar-task-text') ||
                    e.target.classList.contains('calendar-task-remove')) {
                    return;
                }
                this.selectDate(date);
            });
            const dateStr = this.formatDateStr(date);
            // 支持多日期：检查任务的dueDates数组中是否包含当前日期
            const tasksOnDate = this.tasks.filter(t => {
                const dueDates = t.dueDates || (t.dueDate ? [t.dueDate] : []); // 兼容旧数据
                return dueDates.includes(dateStr);
            });
            
            // 创建任务列表容器
            const taskListContainer = document.createElement('div');
            taskListContainer.className = 'calendar-task-list';
            
            // 显示所有任务
            tasksOnDate.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = `calendar-task-item ${task.priority} ${task.completed ? 'completed' : ''}`;
                taskItem.dataset.taskId = task.id;
                
                // 复选框
                const checkbox = document.createElement('div');
                checkbox.className = `calendar-task-checkbox ${task.completed ? 'checked' : ''}`;
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleTask(task.id);
                };
                
                // 任务文本
                const taskText = document.createElement('div');
                taskText.className = 'calendar-task-text';
                taskText.textContent = task.text;
                taskText.onclick = (e) => {
                    e.stopPropagation();
                    this.editTask(task.id);
                };
                
                // 移除按钮（仅在任务有多个日期时显示）
                const dueDates = task.dueDates || (task.dueDate ? [task.dueDate] : []);
                if (dueDates.length > 1) {
                    const removeBtn = document.createElement('div');
                    removeBtn.className = 'calendar-task-remove';
                    removeBtn.textContent = '×';
                    removeBtn.title = '从此日期移除';
                    removeBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.removeTaskFromDate(task.id, dateStr);
                    };
                    taskItem.appendChild(removeBtn);
                }
                
                taskItem.appendChild(checkbox);
                taskItem.appendChild(taskText);
                taskListContainer.appendChild(taskItem);
            });
            
            dayElement.appendChild(taskListContainer);
            
            // 拖放事件
            dayElement.addEventListener('dragover', (e) => {
                e.preventDefault();
                dayElement.classList.add('drag-over');
            });
            
            dayElement.addEventListener('dragleave', () => {
                dayElement.classList.remove('drag-over');
            });
            
            dayElement.addEventListener('drop', (e) => {
                e.preventDefault();
                dayElement.classList.remove('drag-over');
                this.assignTaskToDate(this.draggedTaskId, dateStr);
            });
        }
        
        return dayElement;
    }
    
    // 切换月份
    changeMonth(offset) {
        this.currentDate = new Date(
            this.currentDate.getFullYear(),
            this.currentDate.getMonth() + offset,
            1
        );
        this.renderCalendar();
    }
    
    // 选择日期
    selectDate(date) {
        this.selectedDate = new Date(date);
        this.selectedDate.setHours(0, 0, 0, 0);
        this.renderCalendar();
        this.renderFocusStats();
    }
    
    // 格式化日期字符串（用于存储）
    formatDateStr(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // 格式化日期标签（用于显示）
    formatDateLabel(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()];
        return `${month}月${day}日 ${weekday}`;
    }
    
    // 分配任务到日期（支持多日期）
    assignTaskToDate(taskId, dateStr) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            // 兼容旧数据：如果有dueDate但没有dueDates，先迁移
            if (!task.dueDates && task.dueDate) {
                task.dueDates = [task.dueDate];
                delete task.dueDate;
            } else if (!task.dueDates) {
                task.dueDates = [];
            }
            
            // 如果日期不存在，则添加
            if (!task.dueDates.includes(dateStr)) {
                task.dueDates.push(dateStr);
                task.dueDates.sort(); // 保持日期排序
                this.saveTasks();
                this.renderTasks();
                this.renderCalendar();
                this.showNotification(`任务已添加到 ${dateStr}`);
            } else {
                this.showNotification(`任务已在 ${dateStr}`);
            }
        }
    }
    
    // 从日期中移除任务
    removeTaskFromDate(taskId, dateStr) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.dueDates) {
            task.dueDates = task.dueDates.filter(d => d !== dateStr);
            this.saveTasks();
            this.renderTasks();
            this.renderCalendar();
            this.showNotification(`任务已从 ${dateStr} 移除`);
        }
    }
    
    
    // 设置拖拽事件
    setupDragEvents() {
        const taskCards = document.querySelectorAll('.task-card');
        
        taskCards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.draggedTaskId = card.dataset.id;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
                this.draggedTaskId = null;
            });
        });
    }

    // ============================================
    // 分隔条拖动调整功能
    // ============================================
    setupResizer() {
        const resizer = document.getElementById('resizer');
        const calendar = document.querySelector('.calendar-panel');
        
        if (!resizer || !calendar) return;
        
        // 从localStorage恢复上次的宽度
        const savedWidth = localStorage.getItem('calendarWidth');
        if (savedWidth) {
            calendar.style.width = savedWidth + 'px';
        }
        
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = calendar.offsetWidth;
            resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            // 从右向左拖动，宽度增加
            const diff = startX - e.clientX;
            const newWidth = startWidth + diff;
            
            // 限制最小和最大宽度
            if (newWidth >= 400 && newWidth <= 1000) {
                calendar.style.width = newWidth + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizer.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // 保存当前宽度到localStorage
                const currentWidth = calendar.offsetWidth;
                localStorage.setItem('calendarWidth', currentWidth);
            }
        });
    }

    // ============================================
    // 专注功能
    // ============================================
    
    // 开始专注某个任务
    startFocus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.currentFocusTask = task;
        this.focusSeconds = 0;
        this.focusStartTime = Date.now();
        
        // 显示专注页面（覆盖在main-content上）
        document.getElementById('focus-page').classList.add('active');
        
        // 更新专注页面的任务名称
        document.getElementById('focus-task-name').textContent = task.text;
        document.getElementById('focus-timer').textContent = '00:00:00';
        
        // 启动 C1 3D 渲染器（仅在 C1 模式下）
        if (this.c1Renderer && document.body.classList.contains('c1-mode')) {
            this.c1Renderer.updateTaskNameText(task.text);
            this.c1Renderer.start();
            console.log('✓ C1 3D 渲染已启动');
        }
        
        // 隐藏模态框
        this.hideModal();
    }
    
    // 开始计时
    startTimer() {
        if (this.focusTimer) return;
        
        document.getElementById('focus-start-btn').style.display = 'none';
        document.getElementById('focus-pause-btn').style.display = 'inline-block';
        
        this.focusTimer = setInterval(() => {
            this.focusSeconds++;
            this.updateTimerDisplay();
        }, 1000);
    }
    
    // 暂停计时
    pauseTimer() {
        if (!this.focusTimer) return;
        
        clearInterval(this.focusTimer);
        this.focusTimer = null;
        
        document.getElementById('focus-start-btn').style.display = 'inline-block';
        document.getElementById('focus-pause-btn').style.display = 'none';
    }
    
    // 停止专注并保存记录
    stopFocus() {
        if (this.focusTimer) {
            clearInterval(this.focusTimer);
            this.focusTimer = null;
        }
        
        // 只有专注时间大于10秒才保存记录
        if (this.focusSeconds >= 10 && this.currentFocusTask) {
            const record = {
                id: this.generateId(),
                taskId: this.currentFocusTask.id,
                taskName: this.currentFocusTask.text,
                duration: this.focusSeconds,
                startTime: this.focusStartTime,
                endTime: Date.now(),
                date: new Date().toISOString().split('T')[0]
            };
            
            this.focusRecords.push(record);
            this.saveFocusRecords();
            this.renderFocusStats();
            this.showNotification(`专注记录已保存：${this.formatDuration(this.focusSeconds)}`);
        }
        
        this.exitFocus();
    }
    
    // 退出专注模式
    exitFocus() {
        document.getElementById('focus-page').classList.remove('active');
        
        // 停止 C1 3D 渲染器
        if (this.c1Renderer) {
            this.c1Renderer.stop();
            console.log('✓ C1 3D 渲染已停止');
        }
        
        this.currentFocusTask = null;
        this.focusSeconds = 0;
        this.focusStartTime = null;
        
        if (this.focusTimer) {
            clearInterval(this.focusTimer);
            this.focusTimer = null;
        }
        
        // 重置按钮状态
        document.getElementById('focus-start-btn').style.display = 'inline-block';
        document.getElementById('focus-pause-btn').style.display = 'none';
    }
    
    // 更新计时器显示
    updateTimerDisplay() {
        const hours = Math.floor(this.focusSeconds / 3600);
        const minutes = Math.floor((this.focusSeconds % 3600) / 60);
        const seconds = this.focusSeconds % 60;
        
        const display = [hours, minutes, seconds]
            .map(n => n.toString().padStart(2, '0'))
            .join(':');
        
        document.getElementById('focus-timer').textContent = display;
        
        // 更新 C1 3D 计时器显示
        if (this.c1Renderer && document.body.classList.contains('c1-mode')) {
            this.c1Renderer.updateTimerDisplay(display);
        }
    }
    
    // 格式化时长
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h${minutes}m`;
        }
        if (minutes > 0) {
            return `${minutes}分钟`;
        }
        return `${secs}秒`;
    }
    
    // 渲染专注统计 - 24小时横向时间轴
    renderFocusStats() {
        const selectedDateStr = this.formatDateStr(this.selectedDate);
        
        // 获取当天的开始和结束时间戳
        const dayStart = new Date(this.selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(this.selectedDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        // 筛选出与当前日期有交集的所有记录（包括跨天的）
        const selectedRecords = this.focusRecords.filter(r => {
            const recordStart = new Date(r.startTime);
            const recordEnd = new Date(r.endTime);
            // 记录的结束时间 > 当天开始 且 记录的开始时间 < 当天结束
            return recordEnd > dayStart && recordStart < dayEnd;
        });
        
        console.log('选中日期专注记录:', selectedRecords.length, '条');
        console.log('所有专注记录:', this.focusRecords);
        
        const timelineContainer = document.getElementById('focus-timeline');
        const titleElement = document.getElementById('focus-stats-title');
        
        // 显示选中的日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = this.selectedDate.getTime() === today.getTime();
        const dateLabel = isToday ? '今天' : this.formatDateLabel(this.selectedDate);
        
        // 更新标题
        titleElement.textContent = `${dateLabel}专注`;
        
        if (selectedRecords.length === 0) {
            timelineContainer.innerHTML = `<div class="timeline-empty">${dateLabel}还没有专注记录</div>`;
            return;
        }
        
        // 生成24小时刻度
        const hours = [];
        for (let i = 0; i <= 24; i += 4) {
            hours.push(`<div class="timeline-hour">${i}:00</div>`);
        }
        
        // 计算当天的总专注时长（只计算在当天范围内的部分）
        let totalSeconds = 0;
        selectedRecords.forEach(record => {
            const recordStart = new Date(record.startTime);
            const recordEnd = new Date(record.endTime);
            const effectiveStart = recordStart < dayStart ? dayStart : recordStart;
            const effectiveEnd = recordEnd > dayEnd ? dayEnd : recordEnd;
            totalSeconds += Math.floor((effectiveEnd - effectiveStart) / 1000);
        });
        
        // 生成时间轴上的专注线段
        const segments = selectedRecords.map(record => {
            const recordStart = new Date(record.startTime);
            const recordEnd = new Date(record.endTime);
            
            // 计算在当天显示的有效时间范围
            const effectiveStart = recordStart < dayStart ? dayStart : recordStart;
            const effectiveEnd = recordEnd > dayEnd ? dayEnd : recordEnd;
            
            // 计算显示的开始和结束时间（在当天中的位置）
            const displayStartMinutes = effectiveStart.getHours() * 60 + effectiveStart.getMinutes();
            const displayEndMinutes = effectiveEnd.getHours() * 60 + effectiveEnd.getMinutes();
            const startPercent = (displayStartMinutes / 1440) * 100;
            const widthPercent = ((displayEndMinutes - displayStartMinutes) / 1440) * 100;
            
            // 计算在当天的时长
            const dayDuration = Math.floor((effectiveEnd - effectiveStart) / 1000);
            const duration = this.formatDuration(dayDuration);
            
            // 时间范围显示
            const timeRange = `${effectiveStart.getHours().toString().padStart(2, '0')}:${effectiveStart.getMinutes().toString().padStart(2, '0')} - ${effectiveEnd.getHours().toString().padStart(2, '0')}:${effectiveEnd.getMinutes().toString().padStart(2, '0')}`;
            
            // 跨天标记
            const isCrossDay = recordStart.toDateString() !== recordEnd.toDateString();
            const crossDayLabel = isCrossDay ? ' (跨天)' : '';
            
            // 查找任务获取颜色
            const task = this.tasks.find(t => t.id === record.taskId);
            const segmentColor = task ? task.color : '#2563eb';
            
            return `
                <div class="timeline-segment" 
                     style="left: ${startPercent}%; width: ${widthPercent}%; background-color: ${segmentColor};"
                     data-record-id="${record.id}">
                    <div class="timeline-segment-tooltip">
                        <div class="tooltip-task">${this.escapeHtml(record.taskName)}${crossDayLabel}</div>
                        <div class="tooltip-time">${timeRange}</div>
                        <div class="tooltip-duration">时长：${duration}</div>
                        <div class="tooltip-delete">
                            <button class="tooltip-delete-btn" onclick="event.stopPropagation(); app.deleteFocusRecord('${record.id}')">
                                删除记录
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        timelineContainer.innerHTML = `
            <div class="timeline-axis">
                <div class="timeline-hours">
                    ${hours.join('')}
                </div>
                <div class="timeline-track">
                    ${segments}
                </div>
            </div>
            <div class="timeline-summary">
                <div class="timeline-total">
                    ${dateLabel}专注总时长：<span class="timeline-total-value">${this.formatDuration(totalSeconds)}</span>
                </div>
            </div>
        `;
    }
    
    // 删除专注记录
    async deleteFocusRecord(recordId) {
        const confirmed = await this.showConfirm('确定要删除这条专注记录吗？', '删除记录');
        if (!confirmed) return;
        
        this.focusRecords = this.focusRecords.filter(r => r.id !== recordId);
        this.saveFocusRecords();
        this.renderFocusStats();
        this.showNotification('专注记录已删除');
    }

    // ============================================
    // 数据备份功能
    // ============================================
    
    // 导出数据
    exportData() {
        const data = {
            tasks: this.tasks,
            focusRecords: this.focusRecords,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showNotification('数据已导出');
    }
    
    // 暗黑模式切换
    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        
        // 从localStorage读取主题设置
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
    
    // 初始化 C1 渲染器
    initC1Renderer() {
        // 等待 Three.js 加载完成
        if (typeof THREE === 'undefined') {
            setTimeout(() => this.initC1Renderer(), 100);
            return;
        }
        
        // 等待 C1Renderer 类加载完成
        if (typeof C1Renderer === 'undefined') {
            setTimeout(() => this.initC1Renderer(), 100);
            return;
        }
        
        try {
            this.c1Renderer = new C1Renderer();
            console.log('✓ C1 渲染器初始化成功');
        } catch (error) {
            console.error('✗ C1 渲染器初始化失败:', error);
        }
    }
    
    // C1模式切换
    setupC1Toggle() {
        const c1Toggle = document.getElementById('c1-toggle');
        
        // 从localStorage读取C1模式设置
        const savedC1Mode = localStorage.getItem('c1Mode');
        if (savedC1Mode === 'enabled') {
            document.body.classList.add('c1-mode');
        }
        
        c1Toggle.addEventListener('click', () => {
            document.body.classList.toggle('c1-mode');
            const isC1 = document.body.classList.contains('c1-mode');
            localStorage.setItem('c1Mode', isC1 ? 'enabled' : 'disabled');
            
            if (isC1) {
                this.showNotification('C1模式已启用 - 准备使用HoloPlay Capture');
                console.log('====================================');
                console.log('✅ C1模式已启用！');
                console.log('📋 下一步：');
                console.log('1. 确保Looking Glass Bridge正在运行');
                console.log('2. 打开C1上的"HoloPlay Studio"或浏览器');
                console.log('3. 布局已优化为深度层级');
                console.log('4. 元素会在C1上显示为不同深度');
                console.log('====================================');
            } else {
                this.showNotification('已切换到普通模式');
            }
        });
    }

    // 导入数据
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // 验证数据格式
                if (!data.tasks || !Array.isArray(data.tasks)) {
                    throw new Error('无效的数据格式');
                }
                
                const confirmed = await this.showConfirm(
                    `确定要导入数据吗？这将替换当前所有数据。\n\n导出时间：${new Date(data.exportDate).toLocaleString()}\n任务数量：${data.tasks.length}\n专注记录：${data.focusRecords?.length || 0}`,
                    '导入数据'
                );
                
                if (!confirmed) return;
                
                // 导入数据
                this.tasks = data.tasks;
                this.focusRecords = data.focusRecords || [];
                
                // 保存到localStorage
                this.saveTasks();
                this.saveFocusRecords();
                
                // 刷新界面
                this.renderTasks();
                this.renderCalendar();
                this.renderFocusStats();
                
                this.showNotification('数据导入成功');
            } catch (error) {
                alert('导入失败：' + error.message);
            }
            
            // 清空文件输入
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }
    
    // 设置专注相关的事件监听
    setupFocusListeners() {
        // 模态框中的开始专注按钮
        document.getElementById('start-focus-btn').addEventListener('click', () => {
            if (this.editingTaskId) {
                this.startFocus(this.editingTaskId);
            }
        });
        
        // 专注页面的返回按钮
        document.getElementById('focus-back-btn').addEventListener('click', async () => {
            const confirmed = await this.showConfirm('确定要退出专注模式吗？当前进度将不会保存。', '退出专注');
            if (confirmed) {
                this.stopFocus();
            }
        });
        
        // 开始按钮
        document.getElementById('focus-start-btn').addEventListener('click', () => {
            this.startTimer();
        });
        
        // 暂停按钮
        document.getElementById('focus-pause-btn').addEventListener('click', () => {
            this.pauseTimer();
        });
        
        // 结束按钮
        document.getElementById('focus-stop-btn').addEventListener('click', async () => {
            const confirmed = await this.showConfirm('确定要结束专注吗？', '结束专注');
            if (confirmed) {
                this.stopFocus();
            }
        });
    }
}

// ============================================
// 初始化应用
// ============================================
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();
    console.log('✓ 极简待办应用已启动');
});
