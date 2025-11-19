// ============================================
// C1 3D 渲染器 - 完全照搬实例代码
// ============================================

class C1Renderer {
    constructor() {
        this.canvas = document.getElementById('c1-canvas');
        this.isActive = false;
        this.animationId = null;
        
        // 完全照搬实例代码的变量
        this.useQuiltMode = true;
        this.lastQuiltUpdate = 0;
        this.quiltUpdateInterval = 100;
        
        // 初始化
        this.init();
    }
    
    init() {
        // 强制重置为实例代码的默认值（清除之前的错误设置）
        if (!localStorage.getItem('viewCone')) {
            localStorage.setItem('viewCone', '5');  // 固定视角5度
        }
        if (!localStorage.getItem('camDist')) {
            localStorage.setItem('camDist', '650');  // 固定距离650
        }
        // X固定为0，不允许修改
        localStorage.setItem('posX', '0');
        
        // 流光圆盘默认位置（用户调整后的最佳值）
        if (!localStorage.getItem('posY')) {
            localStorage.setItem('posY', '0');
        }
        if (!localStorage.getItem('posZ')) {
            localStorage.setItem('posZ', '300');
        }
        if (!localStorage.getItem('discScale')) {
            localStorage.setItem('discScale', '1.6');
        }
        
        // 任务名默认位置（用户调整后的最佳值）
        if (!localStorage.getItem('taskNameY')) {
            localStorage.setItem('taskNameY', '180');
        }
        if (!localStorage.getItem('taskNameZ')) {
            localStorage.setItem('taskNameZ', '90');
        }
        if (!localStorage.getItem('taskNameScale')) {
            localStorage.setItem('taskNameScale', '0.7');
        }
        
        // 计时器默认位置（用户调整后的最佳值）
        if (!localStorage.getItem('timerY')) {
            localStorage.setItem('timerY', '0');
        }
        if (!localStorage.getItem('timerZ')) {
            localStorage.setItem('timerZ', '-110');
        }
        if (!localStorage.getItem('timerScale')) {
            localStorage.setItem('timerScale', '1');
        }
        
        // 中心偏移默认值
        if (!localStorage.getItem('centerOffset')) {
            localStorage.setItem('centerOffset', '-0.489');  // 用户测试的最佳值
        }
        
        console.log('初始参数 - viewCone:', localStorage.getItem('viewCone'), 'camDist:', localStorage.getItem('camDist'), 'centerOffset:', localStorage.getItem('centerOffset'));
        
        this.setupRenderers();
        this.createQuiltScene();
        this.setupShader();
        this.setupDebugPanel();
        console.log('✓ C1渲染器初始化完成');
    }
    
    setupRenderers() {
        // Quilt 渲染器（完全参考实例代码）
        this.quiltRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.quiltRenderer.setSize(450, 800);  // 单视图大小
        
        // 主显示渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: false
        });
        
        const pixelRatio = window.devicePixelRatio || 1;
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // 监听窗口尺寸变化（参考实例代码的resize处理）
        window.addEventListener('resize', () => this.onWindowResize());
        
        console.log('✓ C1 渲染器初始化');
    }
    
    onWindowResize() {
        // 完全照搬实例代码 C1-B.html 第394-399行
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        const physicalWidth = window.innerWidth * window.devicePixelRatio;
        const physicalHeight = window.innerHeight * window.devicePixelRatio;
        this.shaderMaterial.uniforms.iResolution.value.set(physicalWidth, physicalHeight);
        
        console.log('窗口尺寸变化:', window.innerWidth, 'x', window.innerHeight);
        console.log('物理分辨率:', physicalWidth, 'x', physicalHeight);
    }
    
    setupShader() {
        // C1光栅参数（固定值，照搬实例代码）
        this.c1Params = {
            lineNumber: 19.6153,
            obliquity: 0.10255,
            deviation: 0.14808
        };
        
        // C1 光栅 Shader（完整实现）
        const fragmentShader = `
            precision highp float;
            
            uniform sampler2D iChannel0;
            uniform vec2 iResolution;
            uniform float lineNumber;
            uniform float obliquity;
            uniform float center;
            
            const vec2 quiltSize = vec2(8.0, 5.0);
            const float numViews = 40.0;
            const float screenWidth = 1440.0;
            const float screenHeight = 2560.0;
            const float invView = 0.0;
            
            vec2 texArr(vec3 uvz) {
                float z = floor((1.0 - uvz.z) * numViews);
                float x = (mod(z, quiltSize.x) + uvz.x) / quiltSize.x;
                float y = mod((quiltSize.y - floor(z / quiltSize.x) + uvz.y) / quiltSize.y, 1.0);
                return vec2(x, y);
            }
            
            void main() {
                float pitch = (screenWidth * 3.0) / lineNumber;
                float slope = -obliquity * (screenHeight / screenWidth);
                float subp = 1.0 / (screenWidth * 3.0);
                
                vec3 rgb;
                vec2 uv = gl_FragCoord.xy / iResolution.xy;
                
                for (int chan = 0; chan < 3; ++chan) {
                    float z = (uv.x + float(chan) * subp + uv.y * slope) * pitch - center;
                    z = mod(z + ceil(abs(z)), 1.0);
                    z = (1.0 - invView) * z + invView * (1.0 - z);
                    
                    vec2 iuv = texArr(vec3(uv, z));
                    vec4 color = texture2D(iChannel0, iuv);
                    rgb[chan] = color[chan];
                }
                
                gl_FragColor = vec4(rgb, 1.0);
            }
        `;
        
        const vertexShader = `
            void main() {
                gl_Position = vec4(position, 1.0);
            }
        `;
        
        // 创建显示场景（用于应用 Shader）
        this.displayScene = new THREE.Scene();
        this.displayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // Shader 材质
        const pixelRatio = window.devicePixelRatio || 1;
        const physicalWidth = window.innerWidth * pixelRatio;
        const physicalHeight = window.innerHeight * pixelRatio;
        
        console.log('=== Shader初始化 ===');
        console.log('window.innerWidth:', window.innerWidth);
        console.log('window.innerHeight:', window.innerHeight);
        console.log('devicePixelRatio:', pixelRatio);
        console.log('物理分辨率:', physicalWidth, 'x', physicalHeight);
        
        // 生成初始Quilt纹理（参考实例代码）
        const initialQuilt = this.generateQuilt();
        const texture = new THREE.CanvasTexture(initialQuilt);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        
        // 从localStorage读取centerOffset（参考实例代码）
        const centerOffset = parseFloat(localStorage.getItem('centerOffset') || -0.489);
        
        this.shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                iChannel0: { value: texture },  // 设置初始纹理
                iResolution: { value: new THREE.Vector2(physicalWidth, physicalHeight) },
                lineNumber: { value: this.c1Params.lineNumber },
                obliquity: { value: this.c1Params.obliquity },
                center: { value: centerOffset }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader
        });
        
        const plane = new THREE.PlaneGeometry(2, 2);
        const quad = new THREE.Mesh(plane, this.shaderMaterial);
        this.displayScene.add(quad);
        
        console.log('✓ C1 Shader 初始化完成');
    }
    
    createQuiltScene() {
        // 完全照搬实例代码 C1-B.html 第269-304行
        this.quiltScene = new THREE.Scene();
        this.quiltScene.background = new THREE.Color(0x000000);
        
        // 相机设置（会在generateQuilt时重新设置位置）
        this.quiltCamera = new THREE.PerspectiveCamera(40, 450/800, 0.1, 2000);
        
        // 灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.quiltScene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(100, 100, 200);
        this.quiltScene.add(pointLight);
        
        // 创建流光圆环（中间透明，只有边缘彩虹圆环+发光晕染）
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const centerX = 256;
        const centerY = 256;
        const radius = 240;
        const numSegments = 360;
        
        // 中间完全透明，只绘制彩色流光边缘
        for (let i = 0; i < numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;
            const nextAngle = ((i + 1) / numSegments) * Math.PI * 2;
            
            // HSL色相循环（0-360度）
            const hue = (i / numSegments) * 360;
            
            // 绘制发光晕染（更粗的半透明层）
            ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.3)`;
            ctx.lineWidth = 20;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, angle, nextAngle);
            ctx.stroke();
            
            // 绘制清晰的彩色边缘
            ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, angle, nextAngle);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        
        const disc = new THREE.Mesh(
            new THREE.CircleGeometry(100, 64),
            new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide
            })
        );
        
        // 从localStorage读取位置和缩放（X固定为0）
        const posY = parseFloat(localStorage.getItem('posY') || 0);
        const posZ = parseFloat(localStorage.getItem('posZ') || 0);
        const scale = parseFloat(localStorage.getItem('discScale') || 1);
        disc.position.set(0, posY, -posZ);  // X固定为0，Z反转
        disc.scale.set(scale, scale, scale);
        disc.name = 'disc';
        this.quiltScene.add(disc);
        this.disc = disc;
        
        // 创建任务名卡片
        this.createTaskNameCard();
        
        // 创建计时器
        this.createTimer();
        
        console.log('流光圆盘已创建:', disc.position);
        console.log('场景物体数:', this.quiltScene.children.length);
    }
    
    createTaskNameCard() {
        // 创建Canvas纹理
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // 透明背景
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 使用更精致的字体渲染
        ctx.font = '42px "Segoe UI", "SF Pro Display", system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 添加发光效果
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 6;
        
        // 绘制白色文字
        ctx.fillStyle = '#ffffff';
        ctx.fillText('任务名称', canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // 使用平面几何体（纯文字片）
        const cardGeometry = new THREE.PlaneGeometry(250, 64);
        
        // 平面材质（双面渲染，透明）
        const cardMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            emissive: 0x2a3550,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,  // 双面可见
            depthWrite: false         // 禁用深度写入，避免透明问题
        });
        
        const card = new THREE.Mesh(cardGeometry, cardMaterial);
        
        // 从localStorage读取位置和缩放（X固定为0）
        const posY = parseFloat(localStorage.getItem('taskNameY') || 120);
        const posZ = parseFloat(localStorage.getItem('taskNameZ') || 0);
        const scale = parseFloat(localStorage.getItem('taskNameScale') || 1);
        card.position.set(0, posY, -posZ);  // Z反转
        card.scale.set(scale, scale, scale);
        
        // 轻微旋转，避免完全垂直（减少光栅莫尔纹）
        card.rotation.y = 0.01;  // 约0.57度，几乎看不出但能减少莫尔纹
        
        card.name = 'taskNameCard';
        
        this.quiltScene.add(card);
        this.taskNameCard = card;
        this.taskNameCanvas = canvas;
        this.taskNameTexture = texture;
        
        console.log('任务名卡片已创建:', card.position);
    }
    
    // 更新任务名文字
    updateTaskNameText(text) {
        if (!this.taskNameCanvas) return;
        
        const ctx = this.taskNameCanvas.getContext('2d');
        
        // 清空并重绘（透明背景）
        ctx.clearRect(0, 0, this.taskNameCanvas.width, this.taskNameCanvas.height);
        
        // 使用更精致的字体渲染
        ctx.font = '42px "Segoe UI", "SF Pro Display", system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 添加发光效果
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 6;
        
        // 绘制白色文字
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, this.taskNameCanvas.width / 2, this.taskNameCanvas.height / 2);
        
        this.taskNameTexture.needsUpdate = true;
    }
    
    createTimer() {
        // 创建计时器组（6个数字 + 2个冒号）
        this.timerGroup = new THREE.Group();
        
        // 从localStorage读取位置和缩放（X固定为0）
        const posY = parseFloat(localStorage.getItem('timerY') || 0);
        const posZ = parseFloat(localStorage.getItem('timerZ') || 0);
        const scale = parseFloat(localStorage.getItem('timerScale') || 1);
        this.timerGroup.position.set(0, posY, -posZ);  // Z反转
        this.timerGroup.scale.set(scale, scale, scale);
        this.timerGroup.name = 'timerGroup';
        
        // 创建6个数字平面（00:00:00），每组00间距一致
        this.timerDigits = [];
        const digitPositions = [-63, -45, -9, 9, 45, 63];  // 所有三组00间距都是18
        
        for (let i = 0; i < 6; i++) {
            // 创建更高分辨率的Canvas纹理（减少锯齿）
            const canvas = document.createElement('canvas');
            canvas.width = 256;  // 从128提高到256
            canvas.height = 512; // 从256提高到512
            const ctx = canvas.getContext('2d');
            
            // 透明背景
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 使用更精致的字体渲染（配合256x512分辨率）
            ctx.font = '280px "Segoe UI", "SF Pro Display", system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 添加发光效果
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 16;  // 配合分辨率增加
            
            // 绘制白色数字
            ctx.fillStyle = '#ffffff';
            ctx.fillText('0', canvas.width / 2, canvas.height / 2);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            // 使用平面几何体（纯文字片，更窄一些）
            const planeGeometry = new THREE.PlaneGeometry(25, 50);  // 从40x70改为25x50
            const planeMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                opacity: 0.95,
                side: THREE.DoubleSide,
                depthWrite: false,
                emissive: 0x4488ff,
                emissiveIntensity: 0.2
            });
            
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.position.x = digitPositions[i];
            plane.rotation.y = 0.01;  // 轻微旋转减少莫尔纹
            
            // 保存引用
            plane.userData = { canvas, texture };
            
            this.timerDigits.push(plane);
            this.timerGroup.add(plane);
        }
        
        // 添加冒号（更小更精致的发光球）
        const colonMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.9
        });
        
        const colonPositions = [-27, 27];  // 冒号在两组00之间
        colonPositions.forEach(x => {
            const colonGeometry = new THREE.SphereGeometry(1.5, 16, 16);
            const colonMesh = new THREE.Mesh(colonGeometry, colonMaterial);
            colonMesh.position.set(x, 6, 0);  // 上面的点
            this.timerGroup.add(colonMesh);
            
            const colonMesh2 = colonMesh.clone();
            colonMesh2.position.y = -6;  // 下面的点，更接近中心
            this.timerGroup.add(colonMesh2);
        });
        
        this.quiltScene.add(this.timerGroup);
        
        console.log('计时器已创建:', this.timerGroup.position);
    }
    
    // 更新计时器显示
    updateTimerDisplay(timeString) {
        if (!this.timerDigits) return;
        
        // 移除冒号，获取纯数字
        const digits = timeString.replace(/:/g, '');
        
        this.timerDigits.forEach((plane, index) => {
            const char = digits[index] || '0';
            const canvas = plane.userData.canvas;
            const texture = plane.userData.texture;
            
            if (!canvas || !texture) return;
            
            const ctx = canvas.getContext('2d');
            
            // 清空并重绘（透明背景）
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 使用更精致的字体渲染（配合256x512分辨率）
            ctx.font = '280px "Segoe UI", "SF Pro Display", system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 添加发光效果
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 16;
            
            // 绘制白色数字
            ctx.fillStyle = '#ffffff';
            ctx.fillText(char, canvas.width / 2, canvas.height / 2);
            
            texture.needsUpdate = true;
        });
    }
    
    generateQuilt() {
        // 完全照搬实例代码 C1-B.html 第306-345行
        const quiltCanvas = document.createElement('canvas');
        quiltCanvas.width = 3600;  // 8列 × 450
        quiltCanvas.height = 4000; // 5行 × 800
        const ctx = quiltCanvas.getContext('2d');
        
        const tempCamera = this.quiltCamera.clone();
        // 固定相机参数（用户测试后的最佳值）
        const viewConeDegrees = 5;    // 固定视角5度
        const viewCone = viewConeDegrees * (Math.PI / 180); // 度数转弧度
        const cameraDistance = 650;   // 固定距离650
        
        console.log('生成Quilt - viewCone:', viewConeDegrees, 'camDist:', cameraDistance);
        
        // 检查任务名卡片的旋转（调试）
        if (this.taskNameCard) {
            console.log('任务名卡片 - rotation:', this.taskNameCard.rotation);
            console.log('任务名卡片 - position:', this.taskNameCard.position);
        }
        
        // 渲染40个视角
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 8; col++) {
                const viewIndex = row * 8 + col;
                // 从-0.5到+0.5的范围，计算角度
                const normalizedIndex = (viewIndex / (40 - 1)) - 0.5;
                const angle = normalizedIndex * viewCone; // -viewCone/2 到 +viewCone/2
                
                // 相机围绕焦点(0,0,0)旋转，形成弧形
                const camX = Math.sin(angle) * cameraDistance;
                const camZ = Math.cos(angle) * cameraDistance;
                
                tempCamera.position.set(camX, 0, camZ);
                // 相机看向焦点(0,0,0)
                tempCamera.lookAt(0, 0, 0);
                
                this.quiltRenderer.render(this.quiltScene, tempCamera);
                
                ctx.drawImage(
                    this.quiltRenderer.domElement,
                    col * 450,
                    row * 800
                );
            }
        }
        
        return quiltCanvas;
    }
    
    setupDebugPanel() {
        // 独立调试窗口控制
        const debugWindow = document.getElementById('c1-debug-window');
        const debugToggleBtn = document.getElementById('debug-panel-toggle');
        const debugCloseBtn = document.getElementById('debug-close-btn');
        const debugSaveBtn = document.getElementById('debug-save-btn');
        
        // 切换显示/隐藏
        if (debugToggleBtn) {
            debugToggleBtn.addEventListener('click', () => {
                debugWindow.classList.toggle('hidden');
            });
        }
        
        // 关闭按钮
        if (debugCloseBtn) {
            debugCloseBtn.addEventListener('click', () => {
                debugWindow.classList.add('hidden');
            });
        }
        
        // 保存配置按钮
        if (debugSaveBtn) {
            debugSaveBtn.addEventListener('click', () => {
                // 所有配置已经实时保存到localStorage了
                // 这里只是给用户一个确认提示
                const originalText = debugSaveBtn.textContent;
                debugSaveBtn.textContent = '✓ 已保存';
                debugSaveBtn.style.background = 'rgba(16, 185, 129, 0.8)';
                
                setTimeout(() => {
                    debugSaveBtn.textContent = originalText;
                    debugSaveBtn.style.background = '';
                }, 1500);
                
                console.log('配置已保存到localStorage');
            });
        }
        
        // 流光圆盘位置 YZ（X固定为0）
        this.setupDebugControl('torus-y', (value) => {
            localStorage.setItem('posY', value);
            if (this.disc) {
                this.disc.position.y = parseFloat(value);
            }
        }, 'posY');
        this.setupDebugControl('torus-z', (value) => {
            localStorage.setItem('posZ', value);
            if (this.disc) {
                this.disc.position.z = -parseFloat(value);  // 反转Z轴，负值=出屏，正值=进屏
            }
        }, 'posZ');
        this.setupDebugControl('disc-scale', (value) => {
            localStorage.setItem('discScale', value);
            if (this.disc) {
                const s = parseFloat(value);
                this.disc.scale.set(s, s, s);
            }
        }, 'discScale');
        
        // 任务名位置 YZ（X固定为0）
        this.setupDebugControl('taskname-y', (value) => {
            localStorage.setItem('taskNameY', value);
            if (this.taskNameCard) {
                this.taskNameCard.position.y = parseFloat(value);
            }
        }, 'taskNameY');
        this.setupDebugControl('taskname-z', (value) => {
            localStorage.setItem('taskNameZ', value);
            if (this.taskNameCard) {
                this.taskNameCard.position.z = -parseFloat(value);  // 反转Z轴
            }
        }, 'taskNameZ');
        this.setupDebugControl('taskname-scale', (value) => {
            localStorage.setItem('taskNameScale', value);
            if (this.taskNameCard) {
                const s = parseFloat(value);
                this.taskNameCard.scale.set(s, s, s);
            }
        }, 'taskNameScale');
        
        // 计时器位置 YZ（X固定为0）
        this.setupDebugControl('timer-y', (value) => {
            localStorage.setItem('timerY', value);
            if (this.timerGroup) {
                this.timerGroup.position.y = parseFloat(value);
            }
        }, 'timerY');
        this.setupDebugControl('timer-z', (value) => {
            localStorage.setItem('timerZ', value);
            if (this.timerGroup) {
                this.timerGroup.position.z = -parseFloat(value);  // 反转Z轴
            }
        }, 'timerZ');
        this.setupDebugControl('timer-scale', (value) => {
            localStorage.setItem('timerScale', value);
            if (this.timerGroup) {
                const s = parseFloat(value);
                this.timerGroup.scale.set(s, s, s);
            }
        }, 'timerScale');
        
        // 视角范围（使用localStorage）
        this.setupDebugControl('view-cone', (value) => {
            localStorage.setItem('viewCone', value);
            console.log('✓ 视角已更新并保存:', value);
        }, 'viewCone');
        
        // 相机距离（使用localStorage）
        this.setupDebugControl('cam-dist', (value) => {
            localStorage.setItem('camDist', value);
            console.log('✓ 距离已更新并保存:', value);
        }, 'camDist');
        
        // 中心偏移（可调整，参考实例代码）
        this.setupDebugControl('center-offset', (value) => {
            localStorage.setItem('centerOffset', value);
            if (this.shaderMaterial) {
                this.shaderMaterial.uniforms.center.value = parseFloat(value);
                console.log('✓ 中心偏移已更新并保存:', value);
            }
        }, 'centerOffset');
    }
    
    setupDebugControl(id, callback, localStorageKey) {
        const input = document.getElementById(id);
        const valueSpan = document.getElementById(id + '-value');
        
        if (!input) return;
        
        // 从localStorage恢复值（如果存在）
        if (localStorageKey) {
            const savedValue = localStorage.getItem(localStorageKey);
            if (savedValue !== null) {
                input.value = savedValue;
                if (valueSpan) {
                    if (id.includes('cone')) {
                        valueSpan.textContent = savedValue + '°';
                    } else {
                        valueSpan.textContent = savedValue;
                    }
                }
                // 重要：恢复值后也要调用callback，确保实际参数被更新
                console.log(`📥 从localStorage恢复 ${id}:`, savedValue);
                callback(savedValue);
            }
        }
        
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            if (valueSpan) {
                // 视角范围加度数符号
                if (id.includes('cone')) {
                    valueSpan.textContent = value + '°';
                } else {
                    valueSpan.textContent = value;
                }
            }
            callback(value);
        });
    }
    
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.lastQuiltUpdate = 0;
        this.animate();
        
        console.log('✓ C1 3D 渲染器已启动');
    }
    
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log('✓ C1 3D 渲染器已停止');
    }
    
    animate() {
        // 完全照搬实例代码 C1-B.html 第404-430行
        if (!this.isActive) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // 只在Quilt模式下更新
        if (this.useQuiltMode) {
            // 更新流光圆盘旋转（加快旋转速度）
            const disc = this.quiltScene.getObjectByName('disc');
            if (disc) {
                disc.rotation.z += 0.03;  // 从0.01加快到0.03，流光更快
            }
            
            // 定期更新Quilt
            const now = Date.now();
            if (now - this.lastQuiltUpdate > this.quiltUpdateInterval) {
                const quiltCanvas = this.generateQuilt();
                const texture = new THREE.CanvasTexture(quiltCanvas);
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                this.shaderMaterial.uniforms.iChannel0.value = texture;
                this.lastQuiltUpdate = now;
                
                // 每秒输出一次
                if (now % 1000 < 150) {
                    const vc = localStorage.getItem('viewCone');
                    const cd = localStorage.getItem('camDist');
                    console.log('Quilt已更新 - viewCone:', vc, 'camDist:', cd);
                }
            }
        }
        
        this.renderer.render(this.displayScene, this.displayCamera);
    }
}

// 导出到全局
window.C1Renderer = C1Renderer;
