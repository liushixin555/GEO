import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Input, Select, Switch, Tag, Spin, Pagination, Breadcrumb, Button, Table, Tooltip, Popconfirm, Empty } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, ROLE_COLORS, ROLE_OPTIONS } from '../constants/roles';
import { useUserList } from './hooks/useUserList';
import { useUserActions } from './hooks/useUserActions';
import UserForm from './UserForm';
import type { UserItem } from '../types/user';

const UserPage: React.FC = () => {
  const { user } = useAuth();
  const {
    data, total, page, pageSize, loading,
    searchInput, setSearchInput,
    filterRole, changeRole,
    filterStatus, changeStatus,
    setPage, fetchData,
  } = useUserList();

  const { toggleStatus, togglingId } = useUserActions(fetchData);

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<UserItem | null>(null);
  const [isWide, setIsWide] = useState(() => window.matchMedia('(min-width: 1280px)').matches);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1280px)');
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const renderStatusSwitch = (item: UserItem) => {
    if (item.role === 'sysadmin') return <Tag color="green">启用</Tag>;
    return (
      <Popconfirm
        title={item.status ? '确定禁用该用户？' : '确定启用该用户？'}
        okText="确定"
        cancelText="取消"
        onConfirm={() => toggleStatus(item)}
      >
        <Switch
          size="small"
          checked={item.status}
          loading={togglingId === item.id}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      </Popconfirm>
    );
  };

  const renderEditButton = (item: UserItem) => (
    <Tooltip title={item.role === 'sysadmin' ? '系统管理员不可编辑' : '编辑用户'}>
      <Button
        type="text"
        size="small"
        icon={<EditOutlined />}
        disabled={item.role === 'sysadmin'}
        onClick={() => { setEditItem(item); setShowForm(true); }}
        style={{ color: item.role !== 'sysadmin' ? 'var(--color-primary, #0f62fe)' : undefined }}
      />
    </Tooltip>
  );

  const tableColumns: ColumnsType<UserItem> = [
    {
      title: '姓名',
      dataIndex: 'cn_name',
      key: 'cn_name',
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => <span style={{ color: 'var(--color-ink-muted, #525252)' }}>@{text}</span>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => <Tag color={ROLE_COLORS[role] || 'default'}>{ROLE_LABELS[role] || role}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (_: boolean, record: UserItem) => renderStatusSwitch(record),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: UserItem) => renderEditButton(record),
    },
  ];

  if (!user) return null;

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '用户管理' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12}>
          <Input.Search
            placeholder="搜索用户名/姓名..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={4}>
          <Select
            value={filterRole || undefined}
            onChange={changeRole}
            allowClear
            placeholder="全部角色"
            style={{ width: '100%' }}
            options={ROLE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          />
        </Col>
        <Col xs={24} sm={4}>
          <Select
            value={filterStatus || undefined}
            onChange={changeStatus}
            allowClear
            placeholder="全部状态"
            style={{ width: '100%' }}
            options={[
              { value: 'true', label: '启用' },
              { value: 'false', label: '禁用' },
            ]}
          />
        </Col>
        <Col xs={24} sm={4} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {user.role === 'sysadmin' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); setShowForm(true); }}>添加用户</Button>
          )}
        </Col>
      </Row>

      <Spin spinning={loading}>
        {isWide ? (
          <div className="user-table-wrapper">
            <Table
              columns={tableColumns}
              dataSource={data}
              rowKey="id"
              size="middle"
              pagination={false}
              locale={{ emptyText: <Empty description="暂无用户数据" /> }}
            />
          </div>
        ) : (
          <div className="user-cards">
            {data.length === 0 && !loading && (
              <Empty description="暂无用户数据" />
            )}
            {data.map((item) => (
              <Card key={item.id} size="small" title={item.cn_name} extra={<Tag color={ROLE_COLORS[item.role] || 'default'}>{ROLE_LABELS[item.role] || item.role}</Tag>}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-ink-muted, #525252)' }}>@{item.username}</span>
                  {renderStatusSwitch(item)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-hairline, #e0e0e0)' }}>
                  {renderEditButton(item)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Spin>

      {total > pageSize && (
        <div className="item-card-pagination">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            showTotal={(t) => `共 ${t} 条`}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}

      {showForm && (
        <UserForm
          item={editItem}
          isSysadmin={user.role === 'sysadmin'}
          onClose={() => setShowForm(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
};

export default UserPage;
