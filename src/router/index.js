import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'
import UserView from '../views/UserView.vue'
import ServersOverview from '../views/ServersOverview.vue'
import ServerResourcesView from '../views/ServerResourcesView.vue'
import FirstPasswordChangeView from '../views/FirstPasswordChangeView.vue'
import MainLayout from '../layouts/MainLayout.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/first-password-change',
    name: 'first-password-change',
    component: FirstPasswordChangeView,
    meta: { requiresAuth: true, requiresPasswordChange: true }
  },
  // 使用布局组件的嵌套路由
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'admin',
        name: 'admin',
        component: AdminView,
        meta: { requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'user',
        name: 'user',
        component: UserView,
        meta: { requiresAuth: true }
      },
      {
        path: 'servers',
        name: 'servers-overview',
        component: ServersOverview,
        meta: { requiresAuth: true }
      },
      {
        path: 'server/:id',
        name: 'server-detail',
        component: () => import('../views/ServerDetailView.vue'),
        props: true,
        meta: { requiresAuth: true }
      },
      {
        path: 'server/:id/resources',
        name: 'server-resources',
        component: () => import('../views/ServerResourcesView.vue'),
        props: true,
        meta: { requiresAuth: true }        
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 如果有保存的位置（比如浏览器前进后退），则返回到保存的位置
    if (savedPosition) {
      return savedPosition
    }
    // 否则滚动到页面顶部
    return { top: 0 }
  }
})

// 导航守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')
  const requiresPasswordChange = localStorage.getItem('requiresPasswordChange') === 'true'
  
  // 如果用户已登录且尝试访问登录页面
  if (to.name === 'login' && token) {
    if (requiresPasswordChange) {
      next({ name: 'first-password-change' })
    } else {
      next({ name: 'user' })
    }
    return
  }
  
  // 如果用户需要修改密码，且不在密码修改页面，重定向到密码修改页面
  if (token && requiresPasswordChange && to.name !== 'first-password-change') {
    next({ name: 'first-password-change' })
    return
  }
  
  // 如果用户在密码修改页面但不需要修改密码，重定向到用户界面
  if (to.name === 'first-password-change' && !requiresPasswordChange) {
    next({ name: 'user' })
    return
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth && !token) {
    next({ name: 'login' })
  } 
  // 检查是否需要管理员权限
  else if (to.meta.requiresAdmin && userRole !== 'admin') {
    if (token) {
      next({ name: 'user' }) // 如果已登录但不是管理员，则重定向到用户页面
    } else {
      next({ name: 'login' })
    }
  } else {
    next()
  }
})

export default router
