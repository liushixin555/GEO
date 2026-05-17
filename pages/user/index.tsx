import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Input, Select, Switch, Tag, Typography, Spin, Pagination, Breadcrumb } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import UserForm from './UserForm';

interface UserItem {
  id: number;
  username: string;
  cn_name: string;
  role: string;
  status: boolean;
}

const roleLabels: Record<string, string> = {
  sysadmin: '系统管理员',
  admin: '运营者',
  view: '查看者',
};

const roleColors: Record<string, string> = {
  sysadmin: '#0f62fe',
  admin: '#525252',
  view: '#8c8c8c',
};

const UserPage: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [data, setData] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<UserItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page, pageSize };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterStatus !== '') params.status = filterStatus;

      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterRole, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async (item: UserItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/users/${item.id}`, {
        status: !item.status,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '用户管理' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={8}>
          <Input.Search
            placeholder="搜索用户名/姓名..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            value={filterRole || undefined}
            onChange={(val) => { setFilterRole(val || ''); setPage(1); }}
            allowClear
            placeholder="全部角色"
            options={[
              { value: 'sysadmin', label: '系统管理员' },
              { value: 'admin', label: '运营者' },
              { value: 'view', label: '查看者' },
            ]}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            value={filterStatus || undefined}
            onChange={(val) => { setFilterStatus(val || ''); setPage(1); }}
            allowClear
            placeholder="全部状态"
            options={[
              { value: 'true', label: '启用' },
              { value: 'false', label: '禁用' },
            ]}
          />
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {data.map((item) => (
            <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
              <Card hoverable styles={{ body: { padding: 24 } }} style={{ height: '100%' }}>
                <div className="item-card-header">
                  <Typography.Title level={3} className="item-card-title">{item.cn_name}</Typography.Title>
                  {item.role !== 'sysadmin' && <EditOutlined className="item-card-edit" onClick={() => { setEditItem(item); setShowForm(true); }} />}
                </div>
                <div className="item-card-row">
                  <span className="item-card-username">@{item.username}</span>
                  <Tag color={roleColors[item.role]}>{roleLabels[item.role] || item.role}</Tag>
                  {item.role !== 'sysadmin' && <Switch size="small" checked={item.status} onChange={() => handleToggleStatus(item)} checkedChildren="启用" unCheckedChildren="禁用" />}
                </div>
              </Card>
            </Col>
          ))}
          <Col xs={24} sm={12} lg={8} xl={6}>
            <Card hoverable onClick={() => { setEditItem(null); setShowForm(true); }} className="company-add-card">
              <PlusOutlined className="company-add-icon" />
              <Typography.Text className="company-add-text">添加用户</Typography.Text>
            </Card>
          </Col>
        </Row>
      </Spin>

      {total > pageSize && (
        <div className="item-card-pagination">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
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
