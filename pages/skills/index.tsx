import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Input, Spin, Pagination, Breadcrumb, Button, Table, Popconfirm, App, Upload, Modal, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import apiClient from '../lib/apiClient';
import { getSafeUser } from '../utils/auth';
import { formatDate, formatDateTime } from '../utils/date';

interface SkillsItem {
  id: number;
  name: string;
  description: string | null;
  created_by: number | null;
  creator_name: string | null;
  created_at: string;
}

const SkillPage: React.FC = () => {
  const user = getSafeUser();
  const { message } = App.useApp();

  const [data, setData] = useState<SkillsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize };
      if (search) params.search = search;

      const res = await apiClient.get('/skills', { params });
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canModify = (item: SkillsItem) => {
    return user.role === 'sysadmin' || item.created_by === user.id;
  };

  const handleDelete = async (item: SkillsItem) => {
    try {
      await apiClient.delete(`/skills/${item.id}`);
      message.success('删除成功');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  const handleUpload = async (rawFile: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', rawFile);
      await apiClient.post('/skills', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('技能上传成功');
      setShowUpload(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const tableColumns: ColumnsType<SkillsItem> = [
    {
      title: '技能名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: { showTitle: true },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: { showTitle: true },
      render: (text: string | null) => text || '-',
    },
    {
      title: '添加者',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 120,
      render: (text: string | null) => text || '-',
    },
    {
      title: '添加时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 60,
      render: (_: unknown, record: SkillsItem) => (
        <Popconfirm title="确定删除此技能？" onConfirm={() => handleDelete(record)} okText="删除" cancelText="取消" disabled={!canModify(record)}>
          <Button type="text" size="small" icon={<DeleteOutlined />} danger={canModify(record)} disabled={!canModify(record)} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '技能管理' }]} /></div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={8}>
          <Input.Search
            placeholder="搜索技能名称..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={16} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowUpload(true)}>添加技能</Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 卡片视图：<1280px */}
        <div className="skills-cards">
          {data.length === 0 && (
            <Card><div className="skills-cards-empty">暂无数据</div></Card>
          )}
          {data.map((item) => (
            <Card key={item.id} size="small" title={item.name}>
              <div className="skill-card-desc">
                {item.description || '-'}
              </div>
              <div className="skill-card-meta">
                <span>添加者：{item.creator_name || '-'}</span>
                <span>{formatDateTime(item.created_at)}</span>
              </div>
              <div className="skills-card-footer">
                <Popconfirm title="确定删除此技能？" onConfirm={() => handleDelete(item)} okText="删除" cancelText="取消" disabled={!canModify(item)}>
                  <Button type="text" size="small" icon={<DeleteOutlined />} danger={canModify(item)} disabled={!canModify(item)} />
                </Popconfirm>
              </div>
            </Card>
          ))}
        </div>

        {/* 表格视图：>=1280px */}
        <div className="skills-table-wrapper">
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
          <Pagination current={page} pageSize={pageSize} total={total} showSizeChanger={false} onChange={(p) => setPage(p)} />
        </div>
      )}

      {/* 上传 Modal */}
      <Modal
        title="添加技能"
        open={showUpload}
        onCancel={() => setShowUpload(false)}
        footer={null}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          请上传包含 SKILL.md 的 zip 包。SKILL.md 需包含 frontmatter 格式的 name 和 description 字段。
        </Typography.Paragraph>
        <Upload
          accept=".zip"
          maxCount={1}
          showUploadList={false}
          customRequest={({ file, onSuccess, onError }) => {
            handleUpload(file as File)
              .then(() => onSuccess?.(null))
              .catch(() => onError?.(new Error('上传失败')));
          }}
          disabled={uploading}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={uploading}>选择 zip 文件上传</Button>
        </Upload>
      </Modal>
    </div>
  );
};

export default SkillPage;
