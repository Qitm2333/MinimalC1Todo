# MinimalC1Todo

一个支持 **Looking Glass Companion C1** 裸眼3D显示器的极简待办事项应用，带有沉浸式3D专注模式。

## ✨ 特性

### 核心功能
- 📝 **任务管理**：创建、编辑、删除待办事项
- ⏱️ **专注计时**：番茄钟式计时器
- 🌓 **深色模式**：舒适的夜间使用体验
- 💾 **本地存储**：数据保存在浏览器 localStorage

### 🎮 3D 专注模式 (C1 设备)
- 🌈 **流光圆盘**：彩虹渐变旋转效果
- 📛 **3D任务名**：悬浮显示当前任务
- ⏰ **3D计时器**：立体数字显示
- 🎛️ **实时调试**：可调整物体位置、缩放和相机参数

## 🚀 快速开始

### 在线使用
直接在浏览器中打开 `index.html` 即可使用。

### 本地运行
```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/MinimalC1Todo.git

# 打开项目
cd MinimalC1Todo

# 使用任意 HTTP 服务器运行，例如：
python -m http.server 8000
# 或
npx serve
```

然后访问 `http://localhost:8000`

## 🎯 使用说明

### 基础功能
1. **添加任务**：点击 "+" 按钮或底部输入框
2. **完成任务**：点击任务前的圆圈
3. **专注模式**：点击任务右侧的 "🎯" 按钮

### C1 3D 模式
1. 点击右上角的 **C1 按钮**启用3D模式
2. 进入专注模式后会自动显示3D场景
3. 点击 **🎮 调试按钮**打开参数面板
4. 可调整：
   - 流光圆盘：位置 (Y/Z)、缩放
   - 任务名：位置 (Y/Z)、缩放
   - 计时器：位置 (Y/Z)、缩放
   - 中心偏移：调整最佳观看位置

### 最佳参数（推荐）
```
视角: 5° (固定)
距离: 650 (固定)
中心偏移: -0.489

流光圆盘: Y=0, Z=300, 缩放=1.6
任务名: Y=180, Z=90, 缩放=0.7
计时器: Y=0, Z=-110, 缩放=1.0
```

## 🛠️ 技术栈

- **前端**: 纯 HTML/CSS/JavaScript (无框架依赖)
- **3D渲染**: Three.js r149
- **3D显示**: Looking Glass Companion C1 Lenticular Quilt 渲染
- **存储**: localStorage API

## 📁 项目结构

```
MinimalC1Todo/
├── index.html          # 主页面
├── style.css           # 样式文件
├── script.js           # 主要逻辑
├── c1-renderer.js      # C1 3D渲染器
├── .gitignore          # Git 忽略文件
└── README.md           # 项目说明
```

## 🎨 C1 参数说明

### Z 轴说明
- **负值 (如 -110)**：物体向外凸出屏幕（更近）
- **正值 (如 300)**：物体向内进入屏幕（更远）
- **0**：物体在屏幕平面上（最清晰）

### 中心偏移
- **数值越小**：右侧观看效果更好
- **数值越大**：左侧观看效果更好
- **推荐值**：-0.489（平衡左右观看）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🙏 致谢

本项目的 C1 3D 渲染功能参考了 **二手的艺术家** 在 [threejs-c1.netlify.app/examples/c1-a](https://threejs-c1.netlify.app/examples/c1-a) 提供的示例代码。

感谢 Looking Glass Factory 提供的 Companion C1 设备和开发文档。

## 📄 开源协议

MIT License

## 🔗 相关链接

- [Looking Glass Companion C1](https://lookingglassfactory.com/looking-glass-companion-c1)
- [Three.js](https://threejs.org/)

---

⭐ 如果这个项目对你有帮助，请给个 Star！
