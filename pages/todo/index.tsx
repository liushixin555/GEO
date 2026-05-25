import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Input, Select, Tag, Typography, Spin, Pagination,
  Empty, App, Breadcrumb, Button, Table, Flex, Tabs, Space, Popconfirm,
  Modal, Tooltip,
} from 'antd';
import {
  PlusOutlined,
  FileSearchOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  UndoOutlined,
  StopOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../lib/apiClient';
import { getApiErrorMessage } from '../utils/error';
import { formatDate } from '../utils/date';
import { getSafeUser } from '../utils/auth';
import TodoForm from './TodoForm';
import TodoLogModal from './TodoLogModal';

interface TodoItem {
  id: number;
  title: string;
  company_id: number;
  company_name: string;
  project_id: number | null;
  project_name: string | null;
  object_type: string;
  object_id: number | null;
  action: string;
  source: string;
  priority: string;
  assignee_id: number;
  assignee_name: string;
  status: string;
  created_by_id: number;
  created_by_name: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UserItem {
  id: number;
  username: string;
  cn_name: string;
  role: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  P0: { label: 'P0 紧急', color: '#f5222d' },
  P1: { label: 'P1 高', color: '#fa541c' },
  P2: { label: 'P2 中', color: '#faad14' },
  P3: { label: 'P3 低', color: '#52c41a' },
  P4: { label: 'P4 最低', color: '#8c8c8c' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: '处理中', color: 'processing' },
  closed: { label: '已完成', color: 'success' },
  draft: { label: '草稿', color: 'default' },
};

const SOURCE_CONFIG: Record<string, string> = {
  manual: '手工输入',
  content_iteration: '内容迭代',
  smart_link: '智能关联',
  daily_check: '每日检测',
  risk_warning: '风险预警',
};

const TodoPage: React.FC = () => {
  const user = getSafeUser();
  const { message } = App.useApp();

  const [data, setData] = useState<TodoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [activeTab, setActiveTab] = useState('my_open');
  const [formVisible, setFormVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [logVisible, setLogVisible] = useState(false);
  const [logTodoId, setLogTodoId] = useState<number | null>(null);
  const [transferVisible, setTransferVisible] = useState(false);
  const [transferTodo, setTransferTodo] = useState<TodoItem | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [transferTargetId, setTransferTargetId] = useState<number | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize, tab: activeTab };
      if (search) params.search = search;
      if (filterPriority) params.priority = filterPriority;

      const res = await apiClient.get('/todos', { params });
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterPriority, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleCreate = () => {
    setEditingTodo(null);
    setFormVisible(true);
  };

  const handleEdit = (item: TodoItem) => {
    setEditingTodo(item);
    setFormVisible(true);
  };

  const handleFormClose = (refresh?: boolean) => {
    setFormVisible(false);
    setEditingTodo(null);
    if (refresh) fetchData();
  };

  const handleViewLog = (id: number) => {
    setLogTodoId(id);
    setLogVisible(true);
  };

  const handleClose = async (id: number) => {
    try {
      await apiClient.post(`/todos/${id}/close`);
      message.success('待办已关闭');
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '操作失败'));
    }
  };

  const handleReopen = async (id: number) => {
    try {
      await apiClient.post(`/todos/${id}/reopen`);
      message.success('待办已重新打开');
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '操作失败'));
    }
  };

  const handleReject = async (id: number) => {
    try {
      await apiClient.post(`/todos/${id}/reject`);
      message.success('待办已驳回');
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '操作失败'));
    }
  };

  const openTransferModal = async (item: TodoItem) => {
    setTransferTodo(item);
    setTransferTargetId(null);
    setTransferVisible(true);
    setTransferLoading(true);
    try {
      const res = await apiClient.get('/users', { params: { pageSize: 200 } });
      setUsers(res.data.data.list.filter((u: UserItem) => u.id !== item.assignee_id));
    } catch {
      setUsers([]);
    } finally {
      setTransferLoading(false);
    }
  };

  const handleTransferConfirm = async () => {
    if (!transferTodo || !transferTargetId) {
      message.warning('请选择转交目标');
      return;
    }
    try {
      await apiClient.post(`/todos/${transferTodo.id}/transfer`, {
        assignee_id: transferTargetId,
      });
      message.success('转交成功');
      setTransferVisible(false);
      fetchData();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '转交失败'));
    }
  };

  const getActionButtons = (item: TodoItem) => {
    const isSysadmin = user.role === 'sysadmin';
    const isAssignee = item.assignee_id === user.id;
    const canAct = isSysadmin || isAssignee;

    const btn = (key: string, icon: React.ReactNode, tip: string, onClick?: () => void, danger?: boolean, confirm?: { title: string; okText: string }) => {
      const button = (
        <Button
          key={key}
          type="link"
          size="small"
          icon={icon}
          disabled={!canAct}
          danger={danger}
          onClick={confirm ? undefined : onClick}
        />
      );
      const wrapped = confirm ? (
        <Popconfirm key={key} title={confirm.title} onConfirm={onClick} okText={confirm.okText} cancelText="取消" disabled={!canAct}>
          {button}
        </Popconfirm>
      ) : button;
      return <Tooltip key={key} title={tip}>{wrapped}</Tooltip>;
    };

    const btns: React.ReactNode[] = [];

    // 查看日志（所有人可用）
    btns.push(
      <Tooltip key="log" title="日志">
        <Button key="log" type="link" size="small" icon={<FileSearchOutlined />} onClick={() => handleViewLog(item.id)} />
      </Tooltip>
    );

    if (item.status === 'open') {
      btns.push(btn('transfer', <SwapOutlined />, '转交', () => openTransferModal(item)));
      btns.push(btn('close', <CheckCircleOutlined />, '完成', () => handleClose(item.id), false, { title: '确定完成此待办？', okText: '确定' }));
      btns.push(btn('reject', <StopOutlined />, '驳回', () => handleReject(item.id), true, { title: '确定驳回此待办？', okText: '确定' }));
      btns.push(btn('edit', <EditOutlined />, '编辑', () => handleEdit(item)));
    }

    if (item.status === 'closed') {
      btns.push(btn('reopen', <UndoOutlined />, '重开', () => handleReopen(item.id), false, { title: '确定重新打开此待办？', okText: '确定' }));
    }

    if (item.status === 'draft') {
      btns.push(btn('edit', <EditOutlined />, '编辑', () => handleEdit(item)));
    }

    return <Space size={0}>{btns}</Space>;
  };

  const tableColumns: ColumnsType<TodoItem> = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: { showTitle: true },
      width: 200,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (p: string) => {
        const cfg = PRIORITY_CONFIG[p] || { label: p, color: '#8c8c8c' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 90,
      render: (s: string) => SOURCE_CONFIG[s] || s,
    },
    {
      title: '公司',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 100,
      ellipsis: { showTitle: true },
    },
    {
      title: '项目',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 100,
      render: (v: string | null) => v || '-',
    },
    {
      title: '对象',
      key: 'object',
      width: 120,
      render: (_: unknown, r: TodoItem) => r.object_type ? `${r.object_type}${r.object_id ? ` #${r.object_id}` : ''}` : '-',
    },
    {
      title: '责任人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: string) => {
        const cfg = STATUS_CONFIG[s] || { label: s, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '期望完成',
      dataIndex: 'due_at',
      key: 'due_at',
      width: 100,
      render: (val: string | null) => val ? formatDate(val) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: TodoItem) => getActionButtons(record),
    },
  ];

  const tabItems = [
    { key: 'my_open', label: '我的待办' },
    { key: 'my_closed', label: '我的已办' },
    ...(user.role === 'sysadmin' ? [
      { key: 'all_open', label: '全部待办' },
      { key: 'all_closed', label: '全部已办' },
    ] : []),
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '今日待办' }]} /></div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        className="todo-tabs"
      />

      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={8}>
          <Input.Search
            placeholder="搜索任务名称..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={6}>
          <Select
            value={filterPriority || undefined}
            onChange={(val) => { setFilterPriority(val || ''); setPage(1); }}
            allowClear
            placeholder="全部优先级"
            style={{ width: '100%' }}
            options={Object.entries(PRIORITY_CONFIG).map(([value, { label }]) => ({ value, label }))}
          />
        </Col>
        <Col flex="auto" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>手工输入</Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 卡片视图：<1280px */}
        <div className="article-cards">
          {data.length === 0 && !loading && (
            <Card>
              <div className="article-cards-empty">暂无数据</div>
            </Card>
          )}
          {data.map((item) => {
            const pCfg = PRIORITY_CONFIG[item.priority] || { label: item.priority, color: '#8c8c8c' };
            const sCfg = STATUS_CONFIG[item.status] || { label: item.status, color: 'default' };
            return (
              <Card
                key={item.id}
                size="small"
                title={
                  <Flex align="center" gap={8}>
                    <Tag color={pCfg.color} style={{ margin: 0 }}>{pCfg.label}</Tag>
                    <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>{item.title}</Typography.Text>
                  </Flex>
                }
                extra={<Tag color={sCfg.color}>{sCfg.label}</Tag>}
              >
                <Flex vertical gap={4}>
                  <Flex gap="middle" wrap style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                    <Typography.Text type="secondary">来源: {SOURCE_CONFIG[item.source] || item.source}</Typography.Text>
                    <Typography.Text type="secondary">公司: {item.company_name}</Typography.Text>
                    <Typography.Text type="secondary">责任人: {item.assignee_name}</Typography.Text>
                  </Flex>
                  <Flex gap="middle" wrap style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                    <Typography.Text type="secondary">项目: {item.project_name || '-'}</Typography.Text>
                    <Typography.Text type="secondary">期望完成: {item.due_at ? formatDate(item.due_at) : '-'}</Typography.Text>
                  </Flex>
                </Flex>
                <div className="article-card-footer">
                  {getActionButtons(item)}
                </div>
              </Card>
            );
          })}
        </div>

        {/* 表格视图：>=1280px */}
        <div className="article-table-wrapper">
          <Table
            columns={tableColumns}
            dataSource={data}
            rowKey="id"
            size="middle"
            pagination={false}
            locale={{ emptyText: '暂无数据' }}
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
            onChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <TodoForm
        visible={formVisible}
        todo={editingTodo}
        onClose={handleFormClose}
      />

      {/* 操作日志弹窗 */}
      <TodoLogModal
        visible={logVisible}
        todoId={logTodoId}
        onClose={() => setLogVisible(false)}
      />

      {/* 转交弹窗 */}
      <Modal
        title="转交待办"
        open={transferVisible}
        onOk={handleTransferConfirm}
        onCancel={() => setTransferVisible(false)}
        okText="确定转交"
        cancelText="取消"
        confirmLoading={transferLoading}
      >
        <div style={{ margin: '16px 0' }}>
          <Typography.Text>将待办「{transferTodo?.title}」转交给：</Typography.Text>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            placeholder="选择目标责任人"
            value={transferTargetId ?? undefined}
            onChange={setTransferTargetId}
            loading={transferLoading}
            options={users.map(u => ({ value: u.id, label: u.username }))}
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </div>
      </Modal>
    </div>
  );
};

export default TodoPage;
