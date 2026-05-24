import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Button, Tooltip, Space, Typography } from 'antd';
import {
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BookOutlined,
  FileTextOutlined,
  TrophyOutlined,
  ToolOutlined,
  ProjectOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  CheckSquareOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import CompanyProjectSwitcher from './CompanyProjectSwitcher';

interface SidebarProps {
  userRole: string;
  cnName: string;
  onLogout: () => void;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobile?: boolean;
}

interface MenuItemDef {
  label: string;
  path: string;
  roles: string[];
  icon: ReactNode;
}

const menuItems: MenuItemDef[] = [
  { label: '今日待办', path: '/todo', roles: ['sysadmin', 'admin'], icon: <CheckSquareOutlined /> },
  { label: 'AI知识库', path: '/knowledge', roles: ['sysadmin', 'admin'], icon: <BookOutlined /> },
  { label: '文章管理', path: '/article', roles: ['sysadmin', 'admin'], icon: <FileTextOutlined /> },
  { label: '发布管理', path: '/publish', roles: ['sysadmin', 'admin', 'view'], icon: <TrophyOutlined /> },
  { label: '常用工具', path: '/tools', roles: ['sysadmin', 'admin'], icon: <ToolOutlined /> },
  { label: '项目管理', path: '/project', roles: ['sysadmin', 'admin'], icon: <ProjectOutlined /> },
  { label: '技能管理', path: '/skills', roles: ['sysadmin', 'admin'], icon: <ThunderboltOutlined /> },
  { label: '用户管理', path: '/users', roles: ['sysadmin'], icon: <UserOutlined /> },
  { label: '公司管理', path: '/company', roles: ['sysadmin'], icon: <HomeOutlined /> },
  { label: '系统管理', path: '/sysadmin', roles: ['sysadmin'], icon: <SettingOutlined /> },
  { label: 'API 文档', path: '/swagger', roles: ['sysadmin'], icon: <ApiOutlined /> },
];

const Sidebar: React.FC<SidebarProps> = ({
  userRole,
  cnName,
  onLogout,
  collapsed,
  onCollapse,
  isMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const visibleMenuItems = menuItems.filter((item) => item.roles.includes(userRole));

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) onCollapse(true);
  };

  const antdMenuItems = visibleMenuItems.map((item) => ({
    key: item.path,
    icon: item.icon,
    label: item.label,
  }));

  const selectedKey = visibleMenuItems
    .filter((item) => location.pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path || '';

  const showFull = !collapsed;

  return (
    <div className="sidebar-container">
      <div className={collapsed ? 'sidebar-header-collapsed' : 'sidebar-header'}>
        {showFull && (
          <Typography.Text strong className="sidebar-brand">薄云商机倍增服务</Typography.Text>
        )}
        <Button
          type="text"
          size="small"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => onCollapse(!collapsed)}
          className="sidebar-toggle-btn"
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

      {showFull ? (
        <div className="sidebar-footer">
          <Space orientation="vertical" size={4} className="sidebar-footer-full-width">
            <div className="sidebar-footer-row">
              <Typography.Text className="sidebar-footer-name">
                <UserOutlined className="sidebar-icon-margin" />
                {cnName}
              </Typography.Text>
              <Tooltip title="登出">
                <Button type="text" size="small" icon={<LogoutOutlined />} onClick={onLogout} />
              </Tooltip>
            </div>
            <CompanyProjectSwitcher />
          </Space>
        </div>
      ) : (
        <div className="sidebar-footer-collapsed">
          <Tooltip title="登出">
            <Button type="text" size="small" icon={<LogoutOutlined />} onClick={onLogout} />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
