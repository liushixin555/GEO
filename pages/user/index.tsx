import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Row, Col, Card, Input, Select, Switch, Tag, Spin, Pagination, Breadcrumb, Button, App, Table, Tooltip, Popconfirm, Empty } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/error';
import UserForm from './UserForm';
import type { UserItem } from '../types/user';

interface ListUsersParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  status?: string;
}

const roleLabels: Record<string, string> = {
  sysadmin: '系统管理员',
  admin: '运营者',
  view: '查看者',
};

const UserPage: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();

  const [data, setData] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<UserItem | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListUsersParams = { page, pageSize };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterStatus !== '') params.status = filterStatus;

      const res = await apiClient.get('/users', { params });
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '获取用户列表失败'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterRole, filterStatus, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async (item: UserItem) => {
    setTogglingId(item.id);
    try {
      await apiClient.put(`/users/${item.id}`, { status: !item.status });
      message.success(item.status ? '用户已禁用' : '用户已启用');
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '操作失败'));
    } finally {
      setTogglingId(null);
    }
  };

  const renderStatusSwitch = (item: UserItem) => {
    if (item.role === 'sysadmin') return <Tag color="green">启用</Tag>;
    return (
      <Popconfirm
        title={item.status ? '确定禁用该用户？' : '确定启用该用户？'}
        okText="确定"
        cancelText="取消"
        onConfirm={() => handleToggleStatus(item)}
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
      render: (role: string) => <Tag color={role === 'sysadmin' ? 'blue' : role === 'admin' ? 'default' : 'default'}>{roleLabels[role] || role}</Tag>,
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
            onChange={(val) => { setFilterRole(val || ''); setPage(1); }}
            allowClear
            placeholder="全部角色"
            style={{ width: '100%' }}
            options={[
              { value: 'sysadmin', label: '系统管理员' },
              { value: 'admin', label: '运营者' },
              { value: 'view', label: '查看者' },
            ]}
          />
        </Col>
        <Col xs={24} sm={4}>
          <Select
            value={filterStatus || undefined}
            onChange={(val) => { setFilterStatus(val || ''); setPage(1); }}
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
        {/* 卡片视图：<1280px */}
        <div className="user-cards">
          {data.length === 0 && !loading && (
            <Empty description="暂无用户数据" />
          )}
          {data.map((item) => (
            <Card key={item.id} size="small" title={item.cn_name} extra={<Tag color={item.role === 'sysadmin' ? 'blue' : 'default'}>{roleLabels[item.role] || item.role}</Tag>}>
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

        {/* 表格视图：>=1280px */}
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
