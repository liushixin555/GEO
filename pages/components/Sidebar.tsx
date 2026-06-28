import React, { useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Button, Tooltip, Space, Typography, message } from 'antd';
import {
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BookOutlined,
  FileTextOutlined,
  TrophyOutlined,
  ProjectOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  CheckSquareOutlined,
  ApiOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import CompanyProjectSwitcher from './CompanyProjectSwitcher';
import { useAuth } from '../context/AuthContext';

const ROLES = {
  SYSADMIN: 'sysadmin',
  ADMIN: 'admin',
  VIEW: 'view',
} as const;

type Role = typeof ROLES[keyof typeof ROLES];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobile?: boolean;
}

interface MenuItemDef {
  label: string;
  path: string;
  roles: Role[];
  icon: ReactNode;
}

const menuItems: MenuItemDef[] = [
  { label: '今日待办', path: '/todo', roles: [ROLES.SYSADMIN, ROLES.ADMIN], icon: <CheckSquareOutlined /> },
  { label: 'AI知识库', path: '/knowledge', roles: [ROLES.SYSADMIN, ROLES.ADMIN], icon: <BookOutlined /> },
  { label: '文章管理', path: '/article', roles: [ROLES.SYSADMIN, ROLES.ADMIN], icon: <FileTextOutlined /> },
  { label: '发布管理', path: '/publish', roles: [ROLES.SYSADMIN, ROLES.ADMIN], icon: <TrophyOutlined /> },
  { label: '项目管理', path: '/project', roles: [ROLES.SYSADMIN, ROLES.ADMIN], icon: <ProjectOutlined /> },
  { label: '技能管理', path: '/skills', roles: [ROLES.SYSADMIN, ROLES.ADMIN], icon: <ThunderboltOutlined /> },
  { label: '用户管理', path: '/users', roles: [ROLES.SYSADMIN], icon: <UserOutlined /> },
  { label: '公司管理', path: '/company', roles: [ROLES.SYSADMIN], icon: <HomeOutlined /> },
  { label: '系统管理', path: '/sysadmin', roles: [ROLES.SYSADMIN], icon: <SettingOutlined /> },
  { label: 'API 文档', path: '/swagger', roles: [ROLES.SYSADMIN], icon: <ApiOutlined /> },
  { label: '日志管理', path: '/audit-log', roles: [ROLES.SYSADMIN], icon: <FileSearchOutlined /> },
];

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onCollapse,
  isMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const userRole = user?.role ?? '';
  const cnName = user?.cn_name ?? '';
  const hiddenAdminClickCountRef = useRef(0);
  const hiddenAdminClickTimerRef = useRef<number | null>(null);

  const businessPaths = ['/todo', '/knowledge', '/article', '/publish', '/project', '/skills'];
  const systemPaths = ['/users', '/company', '/sysadmin', '/swagger', '/audit-log'];

  const visibleMenuItems = menuItems.filter((item) => item.roles.includes(userRole as Role));

  const clearHiddenAdminClickTimer = useCallback(() => {
    if (hiddenAdminClickTimerRef.current !== null) {
      window.clearTimeout(hiddenAdminClickTimerRef.current);
      hiddenAdminClickTimerRef.current = null;
    }
  }, []);

  const handleHiddenAdminClick = useCallback(() => {
    clearHiddenAdminClickTimer();
    hiddenAdminClickCountRef.current += 1;

    if (hiddenAdminClickCountRef.current >= 3) {
      hiddenAdminClickCountRef.current = 0;
      navigate('/citation-diagnosis');
      message.success('已进入引用诊断隐藏后台');
      if (isMobile) onCollapse(true);
      return;
    }

    hiddenAdminClickTimerRef.current = window.setTimeout(() => {
      hiddenAdminClickCountRef.current = 0;
      hiddenAdminClickTimerRef.current = null;
    }, 1200);
  }, [clearHiddenAdminClickTimer, isMobile, navigate, onCollapse]);

  const brandPressProps = {
    onClick: handleHiddenAdminClick,
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    try {
      navigate(key);
      if (isMobile) onCollapse(true);
    } catch {
      message.error('页面跳转失败，请重试');
    }
  };

  const toMenuItem = (item: MenuItemDef) => ({
    key: item.path,
    icon: item.icon,
    label: item.label,
  });

  const businessItems = visibleMenuItems.filter((item) => businessPaths.includes(item.path));
  const systemItems = visibleMenuItems.filter((item) => systemPaths.includes(item.path));

  const antdMenuItems: Array<ReturnType<typeof toMenuItem> | { type: 'group'; label: string; key: string; children: ReturnType<typeof toMenuItem>[] }> = [];

  if (businessItems.length > 0) {
    antdMenuItems.push({
      type: 'group',
      label: '业务管理',
      key: 'group-business',
      children: businessItems.map(toMenuItem),
    });
  }
  if (systemItems.length > 0) {
    antdMenuItems.push({
      type: 'group',
      label: '系统管理',
      key: 'group-system',
      children: systemItems.map(toMenuItem),
    });
  }

  const selectedKey = visibleMenuItems
    .filter((item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(item.path + '/')
    )
    .sort((a, b) => b.path.length - a.path.length)[0]?.path || '';

  return (
    <div className="sidebar-container">
      <div className={collapsed ? 'sidebar-header-collapsed' : 'sidebar-header'}>
        {!collapsed ? (
          <Typography.Text className="sidebar-brand" {...brandPressProps}>
            薄云商机倍增服务
          </Typography.Text>
        ) : (
          <Typography.Text style={{ fontSize: 16, fontWeight: 400 }} {...brandPressProps}>
            薄
          </Typography.Text>
        )}
        <Button
          type="text"
          size="small"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => onCollapse(!collapsed)}
          className="sidebar-toggle-btn"
          aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        />
      </div>

      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={[selectedKey]}
        onClick={handleMenuClick}
        items={antdMenuItems}
        className="sidebar-menu-area"
      />

      {!collapsed ? (
        <div className="sidebar-footer">
          <Space orientation="vertical" size={4} className="sidebar-footer-full-width">
            <div className="sidebar-footer-row">
              <Typography.Text className="sidebar-footer-name">
                <UserOutlined className="sidebar-icon-margin" />
                {cnName}
              </Typography.Text>
              <Tooltip title="登出">
                <Button type="text" size="small" danger icon={<LogoutOutlined />} onClick={logout} aria-label="登出" />
              </Tooltip>
            </div>
            <CompanyProjectSwitcher />
          </Space>
        </div>
      ) : (
        <div className="sidebar-footer-collapsed">
          <Tooltip title={cnName}>
            <Button type="text" size="small" icon={<UserOutlined />} aria-label={cnName} />
          </Tooltip>
          <CompanyProjectSwitcher collapsed />
          <Tooltip title="登出">
            <Button type="text" size="small" danger icon={<LogoutOutlined />} onClick={logout} aria-label="登出" />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
