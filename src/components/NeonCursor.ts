// 自定义发光光标特效
// 符合暗色、高级、哲学、代码风格

interface Trail {
  element: HTMLElement;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  timestamp: number;
}

interface NeonCursorConfig {
  maxTrails: number;
  trailLifetime: number;
  cursorSize: number;
  glowSize: number;
  colors: {
    primary: string;
    glow: string;
    trail: string;
  };
}

export class NeonCursor {
  private cursor!: HTMLElement;
  private trails: Trail[] = [];
  private trailPool: HTMLElement[] = [];
  private mouseX: number = 0;
  private mouseY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private isVisible: boolean = false;
  private animationId: number = 0;
  private config: NeonCursorConfig;
  private lastTrailTime: number = 0;
  private trailInterval: number = 50; // 每50ms创建一个拖尾

  constructor() {
    // 配置参数
    this.config = {
      maxTrails: 30,
      trailLifetime: 1000, // 拖尾存活时间（毫秒）
      cursorSize: 20,
      glowSize: 40,
      colors: {
        primary: 'oklch(0.93 0.195089 103.2532)', // 金色
        glow: 'oklch(0.93 0.195089 103.2532 / 0.3)', // 金色光晕
        trail: 'oklch(0.93 0.195089 103.2532 / 0.2)' // 拖尾颜色
      }
    };

    this.init();
  }

  private init(): void {
    // 创建光标容器
    this.createCursorElements();
    
    // 绑定事件
    this.bindEvents();
    
    // 开始动画循环
    this.animate();
  }

  private createCursorElements(): void {
    // 创建主光标
    this.cursor = document.createElement('div');
    this.cursor.className = 'neon-cursor';
    this.cursor.style.cssText = `
      position: fixed;
      width: ${this.config.cursorSize}px;
      height: ${this.config.cursorSize}px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, ${this.config.colors.primary} 0%, transparent 70%);
      box-shadow: 
        0 0 ${this.config.glowSize}px ${this.config.colors.glow},
        0 0 ${this.config.glowSize * 0.5}px ${this.config.colors.primary} inset;
      opacity: 0;
      transition: opacity 0.3s ease;
      mix-blend-mode: screen;
    `;
    document.body.appendChild(this.cursor);

    // 预创建拖尾元素池
    for (let i = 0; i < this.config.maxTrails; i++) {
      const trail = document.createElement('div');
      trail.className = 'neon-cursor-trail';
      trail.style.cssText = `
        position: fixed;
        width: ${this.config.cursorSize * 0.8}px;
        height: ${this.config.cursorSize * 0.8}px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 99998;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, ${this.config.colors.trail} 0%, transparent 70%);
        opacity: 0;
        mix-blend-mode: screen;
      `;
      document.body.appendChild(trail);
      this.trailPool.push(trail);
    }

    // 添加全局样式来隐藏默认光标
    const style = document.createElement('style');
    style.textContent = `
      * {
        cursor: none !important;
      }
      
      a, button, input, textarea, select, [role="button"] {
        cursor: none !important;
      }
      
      /* 移动端不显示自定义光标 */
      @media (hover: none) and (pointer: coarse) {
        * {
          cursor: auto !important;
        }
        .neon-cursor,
        .neon-cursor-trail {
          display: none !important;
        }
      }
      
      /* 减少动画模式 */
      @media (prefers-reduced-motion: reduce) {
        .neon-cursor,
        .neon-cursor-trail {
          display: none !important;
        }
        * {
          cursor: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    // 鼠标移动
    document.addEventListener('pointermove', this.handlePointerMove);
    
    // 鼠标进入/离开
    document.addEventListener('pointerenter', this.handlePointerEnter);
    document.addEventListener('pointerleave', this.handlePointerLeave);
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handlePointerMove = (e: PointerEvent): void => {
    // 只处理鼠标事件，忽略触摸
    if (e.pointerType === 'touch') return;

    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (!this.isVisible) {
      this.isVisible = true;
      this.cursor.style.opacity = '1';
    }

    // 创建拖尾
    const now = Date.now();
    if (now - this.lastTrailTime > this.trailInterval) {
      this.createTrail(e.clientX, e.clientY);
      this.lastTrailTime = now;
    }
  };

  private handlePointerEnter = (): void => {
    this.isVisible = true;
    this.cursor.style.opacity = '1';
  };

  private handlePointerLeave = (): void => {
    this.isVisible = false;
    this.cursor.style.opacity = '0';
    
    // 清理所有拖尾
    this.trails.forEach(trail => {
      trail.element.style.opacity = '0';
    });
    this.trails = [];
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.isVisible = false;
      this.cursor.style.opacity = '0';
    }
  };

  private createTrail(x: number, y: number): void {
    // 从池中获取可用的拖尾元素
    let trailElement: HTMLElement | undefined;
    
    // 查找未使用的拖尾元素
    for (const element of this.trailPool) {
      const isUsed = this.trails.some(t => t.element === element);
      if (!isUsed) {
        trailElement = element;
        break;
      }
    }

    // 如果没有可用元素，回收最旧的
    if (!trailElement && this.trails.length >= this.config.maxTrails) {
      const oldestTrail = this.trails.shift();
      if (oldestTrail) {
        trailElement = oldestTrail.element;
      }
    }

    if (trailElement) {
      const trail: Trail = {
        element: trailElement,
        x,
        y,
        opacity: 0.6,
        scale: 1,
        timestamp: Date.now()
      };

      this.trails.push(trail);
      
      // 设置初始位置和样式
      trailElement.style.left = `${x}px`;
      trailElement.style.top = `${y}px`;
      trailElement.style.opacity = '0.6';
      trailElement.style.transform = 'translate(-50%, -50%) scale(1)';
    }
  }

  private updateTrails(): void {
    const now = Date.now();
    
    // 更新每个拖尾
    this.trails = this.trails.filter(trail => {
      const age = now - trail.timestamp;
      const progress = age / this.config.trailLifetime;
      
      if (progress >= 1) {
        // 拖尾生命周期结束
        trail.element.style.opacity = '0';
        return false;
      }
      
      // 更新拖尾透明度和大小
      trail.opacity = 0.6 * (1 - progress);
      trail.scale = 1 - progress * 0.5;
      
      trail.element.style.opacity = trail.opacity.toString();
      trail.element.style.transform = `translate(-50%, -50%) scale(${trail.scale})`;
      
      return true;
    });
  }

  private animate = (): void => {
    // 平滑跟随鼠标
    const ease = 0.15;
    this.currentX += (this.mouseX - this.currentX) * ease;
    this.currentY += (this.mouseY - this.currentY) * ease;

    // 更新光标位置
    if (this.isVisible) {
      this.cursor.style.left = `${this.currentX}px`;
      this.cursor.style.top = `${this.currentY}px`;
    }

    // 更新拖尾
    this.updateTrails();

    this.animationId = requestAnimationFrame(this.animate);
  };

  public destroy(): void {
    // 取消动画
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // 移除事件监听
    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerenter', this.handlePointerEnter);
    document.removeEventListener('pointerleave', this.handlePointerLeave);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    // 移除DOM元素
    this.cursor?.remove();
    this.trailPool.forEach(trail => trail.remove());
  }
}

// 导出初始化函数
export function initNeonCursor(): NeonCursor | null {
  // 检查是否支持指针事件
  if (!window.PointerEvent) return null;
  
  // 检查是否是触摸设备
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) return null;
  
  // 检查用户是否偏好减少动画
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return null;
  
  return new NeonCursor();
} 