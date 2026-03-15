<template>
  <div class="login-container">
    <canvas id="earth-background"></canvas>
    <div class="login-card">
      <div class="login-header">
        <div class="logo-container">
          <img :src="siteSettings.logo" class="logo" alt="Logo" />
        </div>
        <h1 class="title">首次登录修改密码</h1>
        <div class="subtitle">{{ siteSettings.name }}</div>
      </div>
      <el-form :model="passwordForm" :rules="rules" ref="passwordFormRef" label-position="top" class="login-form" @keyup.enter="handlePasswordChange">
        <el-form-item label="新密码" prop="newPassword">
          <el-input 
            v-model="passwordForm.newPassword" 
            type="password" 
            placeholder="请输入新密码（至少6位，需包含字母和数字）" 
            show-password
            class="custom-input"
          >
            <template #prefix>
              <el-icon class="input-icon"><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input 
            v-model="passwordForm.confirmPassword" 
            type="password" 
            placeholder="请再次输入新密码" 
            show-password
            class="custom-input"
          >
            <template #prefix>
              <el-icon class="input-icon"><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handlePasswordChange" class="login-button">
            <span>确认修改</span>
            <el-icon class="button-icon"><Right /></el-icon>
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-footer">
        <p class="login-tip">
          <span class="text-warning">首次登录</span>需要修改密码以确保账户安全。新密码要求：<span class="text-highlight">至少6位字符</span>，必须同时包含<span class="text-highlight">字母和数字</span>，支持特殊符号。请确认两次密码输入一致，修改完成后将自动跳转登录页面。
        </p>
        <p class="copyright">&copy; 2025 MYZR</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import axios from '../utils/axios'
import { User, Lock, Right } from '@element-plus/icons-vue'
import * as THREE from 'three'

const router = useRouter()
const authStore = useAuthStore()
const passwordFormRef = ref(null)
const loading = ref(false)
const siteSettings = reactive({
  name: 'GPU共享服务平台',
  logo: 'https://lank.myzr.org:88/i/2024/05/29/66571d8de15ea.png',
  subtitle: '高效、安全的资源管理平台'
})

// 地球背景相关变量
let scene, camera, renderer, earthMesh, cloudMesh
let animationFrameId
let targetRotationX = 0.0005
let targetRotationY = 0.0002
let mouseX = 0, mouseXOnMouseDown = 0, mouseY = 0, mouseYOnMouseDown = 0
const windowHalfX = window.innerWidth / 2
const windowHalfY = window.innerHeight / 2
const dragFactor = 0.00005

// 获取站点设置
const fetchSiteSettings = async () => {
  try {
    const response = await axios.get('/api/settings/site')
    siteSettings.name = response.data.site_name
    siteSettings.logo = response.data.site_logo
    siteSettings.subtitle = response.data.site_subtitle
  } catch (error) {
    console.error('获取站点设置失败:', error)
  }
}

// 初始化Three.js场景
const initEarthBackground = () => {
  // 创建场景
  scene = new THREE.Scene()
  
  // 获取canvas元素
  const canvas = document.getElementById('earth-background')
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true,
    alpha: true 
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  
  // 设置背景色为深蓝黑色渐变
  scene.background = new THREE.Color(0x030508)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 2.70 // 相机距离
  camera.position.x = 0.20 // 相机水平居中
  camera.position.y = 0.25 // 相机向上移动一些（负值是向上）
  
  // 创建地球
  const earthGeometry = new THREE.SphereGeometry(0.8, 64, 64)
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('/assets/earth/earthmap.jpg'),
    bumpMap: new THREE.TextureLoader().load('/assets/earth/earthbump.jpg'),
    bumpScale: 0.1,
    specular: new THREE.Color('#2d4ea3'),
    shininess: 5
  })
  earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
  earthMesh.rotation.y = Math.PI * 1.5
  earthMesh.position.x = 0 // 地球水平居中
  earthMesh.position.y = 0.3 // 地球向上移动
  earthMesh.rotation.x = 0.1 // 稍微倾斜地球
  scene.add(earthMesh)
  
  // 创建云层
  const cloudGeometry = new THREE.SphereGeometry(0.82, 64, 64)
  const cloudMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('/assets/earth/earthclouds.jpg'),
    transparent: true,
    opacity: 0.4
  })
  cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial)
  cloudMesh.position.x = 0 // 云层水平居中
  cloudMesh.position.y = 0.3 // 云层与地球同步上移
  cloudMesh.rotation.x = 0.1 // 与地球保持一致的倾斜角度
  scene.add(cloudMesh)
  
  // 创建星星粒子效果
  const starsGeometry = new THREE.BufferGeometry()
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.025,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
    map: createCircleTexture(32, '#ffffff'),
    alphaTest: 0.1,
    blending: THREE.AdditiveBlending
  })
  
  // 辅助函数：创建圆形纹理，用于星星
  function createCircleTexture(size, color) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    // 绘制径向渐变的圆点
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2;
    
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
  
  // 创建10000个随机位置的星星（增加数量）
  const starsVertices = []
  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 100
    const y = (Math.random() - 0.5) * 100
    const z = (Math.random() - 0.5) * 100
    
    const distance = Math.sqrt(x*x + y*y + z*z)
    if (distance > 5) {
      starsVertices.push(x, y, z)
    }
  }
  
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3))
  const stars = new THREE.Points(starsGeometry, starsMaterial)
  scene.add(stars)
  
  // 添加几个更大、更亮的星星点缀
  const brightStarsGeometry = new THREE.BufferGeometry()
  const brightStarsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,  // 更大的亮星
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: true,
    map: createCircleTexture(64, '#ffffff'),
    alphaTest: 0.1,
    blending: THREE.AdditiveBlending
  })
  
  // 增加亮星星数量
  const brightStarsVertices = []
  for (let i = 0; i < 300; i++) {
    const x = (Math.random() - 0.5) * 100
    const y = (Math.random() - 0.5) * 100
    const z = (Math.random() - 0.5) * 100
    
    const distance = Math.sqrt(x*x + y*y + z*z)
    if (distance > 5) {
      brightStarsVertices.push(x, y, z)
    }
  }
  
  brightStarsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(brightStarsVertices, 3))
  const brightStars = new THREE.Points(brightStarsGeometry, brightStarsMaterial)
  scene.add(brightStars)
  
  // 添加第三种更大的星星，作为点缀
  const specialStarsGeometry = new THREE.BufferGeometry()
  const specialStarsMaterial = new THREE.PointsMaterial({
    color: 0xccf5ff, // 略带蓝色的白光
    size: 0.25,  // 特大星星
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: true,
    map: createCircleTexture(128, '#ccf5ff'),
    alphaTest: 0.1,
    blending: THREE.AdditiveBlending
  })
  
  // 添加少量特大星星
  const specialStarsVertices = []
  for (let i = 0; i < 50; i++) {
    const x = (Math.random() - 0.5) * 100
    const y = (Math.random() - 0.5) * 100
    const z = (Math.random() - 0.5) * 100
    
    const distance = Math.sqrt(x*x + y*y + z*z)
    if (distance > 10) { // 更远的距离
      specialStarsVertices.push(x, y, z)
    }
  }
  
  specialStarsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(specialStarsVertices, 3))
  const specialStars = new THREE.Points(specialStarsGeometry, specialStarsMaterial)
  scene.add(specialStars)
  
  // 添加光源
  const sunLight = new THREE.DirectionalLight(0xffffff, 2)
  sunLight.position.set(5, 2, 5)
  scene.add(sunLight)
  
  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0x333333)
  scene.add(ambientLight)
  
  // 添加点光源
  const pointLight = new THREE.PointLight(0x3366ff, 1, 10)
  pointLight.position.set(-3, 2, -3)
  scene.add(pointLight)
  
  // 添加事件监听
  document.addEventListener('mousedown', onDocumentMouseDown, false)
  window.addEventListener('resize', onWindowResize, false)
}

// 渲染函数
const render = () => {
  earthMesh.rotation.y += 0.0005
  cloudMesh.rotation.y += 0.0007
  
  earthMesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), targetRotationX)
  earthMesh.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), targetRotationY)
  cloudMesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), targetRotationX)
  cloudMesh.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), targetRotationY)
  
  renderer.render(scene, camera)
}

// 动画循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  render()
}

// 窗口大小调整事件
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// 鼠标按下事件
function onDocumentMouseDown(event) {
  // 检查点击的是否为login-card或其子元素
  const loginCard = document.querySelector('.login-card')
  if (loginCard && (event.target === loginCard || loginCard.contains(event.target))) {
    // 如果点击的是登录卡片区域，不处理地球旋转
    return
  }
  
  event.preventDefault()
  document.addEventListener('mousemove', onDocumentMouseMove, false)
  document.addEventListener('mouseup', onDocumentMouseUp, false)
  mouseXOnMouseDown = event.clientX - windowHalfX
  mouseYOnMouseDown = event.clientY - windowHalfY
}

// 鼠标移动事件
function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX
  targetRotationX = (mouseX - mouseXOnMouseDown) * dragFactor
  mouseY = event.clientY - windowHalfY
  targetRotationY = (mouseY - mouseYOnMouseDown) * dragFactor
}

// 鼠标抬起事件
function onDocumentMouseUp(event) {
  document.removeEventListener('mousemove', onDocumentMouseMove, false)
  document.removeEventListener('mouseup', onDocumentMouseUp, false)
}

// 组件挂载时获取站点设置和初始化背景
onMounted(() => {
  fetchSiteSettings()
  initEarthBackground()
  animate()
})

// 组件卸载时清理资源
onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  document.removeEventListener('mousedown', onDocumentMouseDown)
  window.removeEventListener('resize', onWindowResize)
  
  if (renderer) {
    renderer.dispose()
  }
  if (earthMesh && earthMesh.geometry) {
    earthMesh.geometry.dispose()
    if (earthMesh.material) {
      if (Array.isArray(earthMesh.material)) {
        earthMesh.material.forEach(material => material.dispose())
      } else {
        earthMesh.material.dispose()
      }
    }
  }
  if (cloudMesh && cloudMesh.geometry) {
    cloudMesh.geometry.dispose()
    if (cloudMesh.material) {
      if (Array.isArray(cloudMesh.material)) {
        cloudMesh.material.forEach(material => material.dispose())
      } else {
        cloudMesh.material.dispose()
      }
    }
  }
  
  // 清理所有场景资源
  if (scene) {
    scene.traverse(object => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
    scene = null
  }
})

const passwordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入新密码'))
  } else if (value.length < 6) {
    callback(new Error('密码长度至少为6位'))
  } else if (!/[a-zA-Z]/.test(value)) {
    callback(new Error('密码必须包含至少一个字母'))
  } else if (!/\d/.test(value)) {
    callback(new Error('密码必须包含至少一个数字'))
  } else {
    callback()
    // 如果密码有效且确认密码已填写，重新验证确认密码
    if (passwordForm.confirmPassword) {
      passwordFormRef.value.validateField('confirmPassword', () => {})
    }
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入密码进行确认'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致，请重新输入'))
  } else {
    callback()
  }
}

const rules = {
  newPassword: [
    { validator: validatePassword, trigger: 'blur' }
  ],
  confirmPassword: [
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handlePasswordChange = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const response = await axios.post('/api/auth/first-time-password-change', {
          new_password: passwordForm.newPassword
        })
        
        // 后端返回 200 状态码表示成功
        if (response.status === 200) {
          ElMessage.success('密码修改成功，请重新登录')
          
          // 清除首次登录相关的标识
          localStorage.removeItem('requiresPasswordChange')
          localStorage.removeItem('isFirstLogin')
          authStore.logout()
          
          // 跳转回登录页
          router.push('/login')
        } else {
          ElMessage.error(response.data.msg || '密码修改失败')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.msg || '密码修改失败')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
  position: relative;
  overflow: hidden;
  background-color: #000;
}

#earth-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.login-card {
  width: 450px;
  padding: 2.5rem;
  border-radius: 15px;
  background-color: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 10;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-right: 8%;
}

.login-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 30, 0.5);
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.5rem;
}

.logo-container {
  width: 150px;
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
  background-color: rgba(59, 130, 246, 0.1);
  border-radius: 50%;
  padding: 15px;
  box-shadow: 0 5px 15px rgba(59, 130, 246, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.logo-container:hover {
  transform: rotate(5deg) scale(1.05);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

.logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.title {
  text-align: center;
  font-size: 2.2rem;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: #fff;
  text-shadow: 0 0 10px rgba(59, 130, 246, 0.7);
  animation: glow 2s ease-in-out infinite alternate;
  white-space: nowrap;
}

@keyframes glow {
  from {
    text-shadow: 0 0 5px rgba(59, 130, 246, 0.7);
  }
  to {
    text-shadow: 0 0 20px rgba(59, 130, 246, 0.9);
  }
}

.subtitle {
  text-align: center;
  color: #cbd5e1;
  font-size: 1rem;
  margin-bottom: 10px;
}

.login-form {
  margin-bottom: 1.5rem;
}

.login-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #cbd5e1;
  font-size: 0.95rem;
  padding-bottom: 5px;
}

.custom-input {
  margin-bottom: 10px;
}

.login-form :deep(.el-input__wrapper) {
  background-color: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(59, 130, 246, 0.3);
  box-shadow: none;
  padding: 0 15px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.login-form :deep(.el-input__inner) {
  color: #fff;
}

.input-icon {
  font-size: 18px;
  color: #3b82f6;
}

.login-button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  border-radius: 8px;
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  background: linear-gradient(to right, #1e40af, #3b82f6);
  border: none;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4);
  background: linear-gradient(to right, #2563eb, #60a5fa);
}

.button-icon {
  margin-left: 5px;
  font-size: 16px;
  transition: transform 0.3s ease;
}

.login-button:hover .button-icon {
  transform: translateX(3px);
}

.login-footer {
  text-align: center;
}

.login-tip {
  text-align: center;
  font-size: 0.9rem;
  color: #94a3b8;
  margin-top: 1rem;
  background-color: rgba(30, 41, 59, 0.5);
  padding: 10px;
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.text-warning {
  color: #ff6b6b;
  font-weight: bold;
}

.text-highlight {
  color: #4dabf7;
  font-weight: bold;
}

.copyright {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 15px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .login-container {
    padding: 0.5rem;
    align-items: center;
    justify-content: center;
    padding-top: 0;
  }
  
  .login-card {
    width: 100%;
    max-width: 450px;
    padding: 1.8rem;
    border-radius: 12px;
    margin-right: 0;
  }
  
  .logo-container {
    width: 120px;
    height: 120px;
    margin-bottom: 1.2rem;
  }
  
  .title {
    font-size: 1.8rem;
    white-space: normal;
  }
  
  .subtitle {
    font-size: 0.9rem;
  }
}

/* 小屏幕手机适配 */
@media (max-width: 375px) {
  .login-container {
    padding-top: 3vh;
  }
  
  .login-card {
    padding: 1.5rem;
  }
  
  .logo-container {
    width: 90px;
    height: 90px;
  }
  
  .title {
    font-size: 1.6rem;
  }
  
  .subtitle {
    font-size: 0.8rem;
  }
  
  .login-button {
    padding: 10px;
  }
}

/* 横屏适配 */
@media (max-height: 500px) and (orientation: landscape) {
  .login-container {
    align-items: center;
    padding-top: 0;
  }
  
  .login-card {
    padding: 1.2rem;
    display: flex;
    flex-direction: row;
    max-width: 90%;
    align-items: center;
  }
  
  .login-header {
    margin-bottom: 0;
    margin-right: 2rem;
    width: 40%;
  }
  
  .login-form {
    width: 60%;
    margin-bottom: 0;
  }
  
  .login-footer {
    display: none;
  }
  
  .logo-container {
    width: 80px;
    height: 80px;
    margin-bottom: 0.8rem;
  }
  
  .title {
    font-size: 1.4rem;
  }
  
  .subtitle {
    font-size: 0.8rem;
  }
}
</style>