import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Input, Select, Switch, Tag, Spin, Pagination, Breadcrumb, Button, Descriptions } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
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
        <Col xs={24} sm={12}>
          <Input.Search
            placeholder="搜索用户名/姓名..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
        {/* 卡片视图：小于1280px时显示 */}
        <div className="user-cards">
          {data.length === 0 && (
            <Card>
              <div className="user-cards-empty">暂无数据</div>
            </Card>
          )}
          {data.map((item) => (
            <Card key={item.id} size="small" title={item.cn_name} extra={<Tag color={roleColors[item.role]}>{roleLabels[item.role] || item.role}</Tag>}>
              <Descriptions column={2} size="small" colon={false}>
                <Descriptions.Item label="用户名">@{item.username}</Descriptions.Item>
                <Descriptions.Item label="角色">{roleLabels[item.role] || item.role}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  {item.role !== 'sysadmin'
                    ? <Switch size="small" checked={item.status} onChange={() => handleToggleStatus(item)} checkedChildren="启用" unCheckedChildren="禁用" />
                    : <Tag color="green">启用</Tag>
                  }
                </Descriptions.Item>
              </Descriptions>
              {item.role !== 'sysadmin' && (
                <div className="user-card-footer">
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => { setEditItem(item); setShowForm(true); }}
                  >
                    编辑
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* 表格视图：大于等于1280px时显示 */}
        <div className="user-table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th className="col-name">姓名</th>
                <th className="col-username">用户名</th>
                <th className="col-role">角色</th>
                <th className="col-status">状态</th>
                <th className="col-action">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="user-table-empty">暂无数据</td>
                </tr>
              )}
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="col-name">{item.cn_name}</td>
                  <td className="col-username">@{item.username}</td>
                  <td className="col-role"><Tag color={roleColors[item.role]}>{roleLabels[item.role] || item.role}</Tag></td>
                  <td className="col-status">
                    {item.role !== 'sysadmin'
                      ? <Switch size="small" checked={item.status} onChange={() => handleToggleStatus(item)} checkedChildren="启用" unCheckedChildren="禁用" />
                      : <Tag color="green">启用</Tag>
                    }
                  </td>
                  <td className="col-action">
                    {item.role !== 'sysadmin' && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => { setEditItem(item); setShowForm(true); }}
                      >
                        编辑
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
