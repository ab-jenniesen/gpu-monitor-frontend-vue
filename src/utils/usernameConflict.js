/**
 * 用户名冲突检测工具
 * 用于检测容器名称是否与现有用户名产生模糊匹配冲突
 */

/**
 * 检查容器名称是否与其他用户名产生冲突
 * @param {string} containerName - 容器名称
 * @param {string} currentUsername - 当前用户名（自己的用户名允许匹配）
 * @param {Array} allUsers - 所有用户列表
 * @returns {Array} 冲突信息数组，如果无冲突则返回空数组
 */
export function checkContainerNameConflicts(containerName, currentUsername, allUsers) {
  if (!containerName || !allUsers) {
    return []
  }

  const containerNameLower = containerName.toLowerCase().trim()
  const currentUsernameLower = currentUsername ? currentUsername.toLowerCase().trim() : ''
  const conflicts = []

  for (const user of allUsers) {
    const usernameLower = user.username.toLowerCase().trim()

    // 跳过当前用户（自己的用户名允许匹配）
    if (usernameLower === currentUsernameLower) {
      continue
    }

    // 检查双向包含关系，但排除完全相同的情况
    if (containerNameLower !== usernameLower) {
      if (containerNameLower.includes(usernameLower)) {
        conflicts.push(`容器名称 '${containerName}' 包含其他用户名 '${user.username}'`)
      } else if (usernameLower.includes(containerNameLower)) {
        conflicts.push(`容器名称 '${containerName}' 被其他用户名 '${user.username}' 包含`)
      }
    }
  }

  return conflicts
}

/**
 * 创建容器名称验证规则
 * @param {string} currentUsername - 当前用户名
 * @param {Array} allUsers - 所有用户列表
 * @returns {Object} Element Plus 表单验证规则
 */
export function createContainerNameValidationRule(currentUsername, allUsers) {
  return {
    validator: (rule, value, callback) => {
      if (!value) {
        callback(new Error('请输入容器名称'))
        return
      }

      if (value.length < 2 || value.length > 50) {
        callback(new Error('容器名称长度在 2 到 50 个字符'))
        return
      }

      // 如果用户数据还没加载或当前用户名为空，暂时跳过冲突检测
      if (!allUsers || !Array.isArray(allUsers) || allUsers.length === 0 || !currentUsername) {
        callback()
        return
      }

      // 特殊处理：如果容器名称就是当前用户名（不区分大小写），直接允许
      if (value.toLowerCase() === currentUsername.toLowerCase()) {
        callback()
        return
      }

      // 检查用户名冲突
      const conflicts = checkContainerNameConflicts(value, currentUsername, allUsers)
      if (conflicts.length > 0) {
        callback(new Error(`名称冲突：${conflicts[0]}`)) // 显示第一个冲突，添加前缀方便识别
        return
      }

      callback() // 验证通过
    },
    trigger: ['blur']
  }
}