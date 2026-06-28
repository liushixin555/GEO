import React, { useCallback, useEffect, useState } from 'react';
import { App, Breadcrumb, Button, Form, Input, InputNumber, Modal, Space, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import apiClient from '../lib/apiClient';
import { useAppContext } from '../context/AppContext';
import { formatDateTime } from '../utils/date';
import { getApiErrorMessage } from '../utils/error';

interface ArticleBrief {
  id: number;
  title: string;
  keywords: string | null;
  project_id: number;
}

interface PublishedLink {
  id: number;
  article_id: number;
  platform_name: string | null;
  url: string;
  normalized_url: string;
  domain: string | null;
  created_at: string;
  article?: ArticleBrief | null;
}

interface CitationRecord {
  id: number;
  source_url: string;
  source_title: string | null;
  domain: string | null;
  matched: boolean;
  article_id: number | null;
}

interface DetectionRun {
  id: number;
  model_name: string;
  prompt: string | null;
  status: string;
  created_at: string;
  matched_count: number;
  records: CitationRecord[];
}

interface CitationMark {
  id: number;
  article_id: number;
  model_name: string;
  first_matched_at: string;
  last_matched_at: string;
  match_count: number;
  article?: ArticleBrief | null;
}

const CitationDiagnosisPage: React.FC = () => {
  const { projectId } = useAppContext();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('marks');
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<PublishedLink[]>([]);
  const [runs, setRuns] = useState<DetectionRun[]>([]);
  const [marks, setMarks] = useState<CitationMark[]>([]);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [linkForm] = Form.useForm();
  const [runForm] = Form.useForm();

  const commonParams = projectId ? { projectId, page: 1, pageSize: 50 } : { page: 1, pageSize: 50 };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [linkRes, runRes, markRes] = await Promise.allSettled([
        apiClient.get('/citation-diagnosis/links', { params: commonParams }),
        apiClient.get('/citation-diagnosis/runs', { params: commonParams }),
        apiClient.get('/citation-diagnosis/marks', { params: commonParams }),
      ]);
      if (linkRes.status === 'fulfilled') {
        setLinks(linkRes.value.data.data.list || []);
      }
      if (runRes.status === 'fulfilled') {
        setRuns(runRes.value.data.data.list || []);
      }
      if (markRes.status === 'fulfilled') {
        setMarks(markRes.value.data.data.list || []);
      }

      const failed = [
        linkRes.status === 'rejected' ? `发布链接：${getApiErrorMessage(linkRes.reason, '获取失败')}` : null,
        runRes.status === 'rejected' ? `检测记录：${getApiErrorMessage(runRes.reason, '获取失败')}` : null,
        markRes.status === 'rejected' ? `引用标签：${getApiErrorMessage(markRes.reason, '获取失败')}` : null,
      ].filter(Boolean);
      if (failed.length > 0) {
        message.error(failed.join('；'));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateLink = async () => {
    try {
      const values = await linkForm.validateFields();
      await apiClient.post('/citation-diagnosis/links', values);
      message.success('发布链接已保存');
      setLinkModalOpen(false);
      linkForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(getApiErrorMessage(err, '保存发布链接失败'));
    }
  };

  const handleCreateRun = async () => {
    try {
      const values = await runForm.validateFields();
      const sources = String(values.sources || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [url, title] = line.split('|').map((part) => part.trim());
          return { url, title: title || undefined };
        });
      await apiClient.post('/citation-diagnosis/runs', {
        project_id: projectId || undefined,
        model_name: values.model_name,
        prompt: values.prompt || undefined,
        answer: values.answer || undefined,
        sources,
      });
      message.success('检测记录已保存');
      setRunModalOpen(false);
      runForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(getApiErrorMessage(err, '保存检测记录失败'));
    }
  };

  const linkColumns: ColumnsType<PublishedLink> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '文章', key: 'article', ellipsis: true, render: (_value, record) => record.article?.title || record.article_id },
    { title: '平台', dataIndex: 'platform_name', width: 160, render: (value: string | null) => value || '-' },
    { title: '域名', dataIndex: 'domain', width: 180, render: (value: string | null) => value || '-' },
    { title: '发布链接', dataIndex: 'url', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (value: string) => formatDateTime(value) },
  ];

  const runColumns: ColumnsType<DetectionRun> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '模型', dataIndex: 'model_name', width: 160 },
    { title: '问题', dataIndex: 'prompt', ellipsis: true, render: (value: string | null) => value || '-' },
    { title: '命中数', dataIndex: 'matched_count', width: 90 },
    {
      title: '引用来源',
      key: 'records',
      ellipsis: true,
      render: (_value, record) => record.records.map((item) => (
        <Tag key={item.id} color={item.matched ? 'success' : 'default'}>
          {item.domain || item.source_url}
        </Tag>
      )),
    },
    { title: '检测时间', dataIndex: 'created_at', width: 170, render: (value: string) => formatDateTime(value) },
  ];

  const markColumns: ColumnsType<CitationMark> = [
    { title: '文章', key: 'article', ellipsis: true, render: (_value, record) => record.article?.title || record.article_id },
    { title: '模型', dataIndex: 'model_name', width: 160, render: (value: string) => <Tag color="blue">被 {value} 引用</Tag> },
    { title: '命中次数', dataIndex: 'match_count', width: 100 },
    { title: '首次命中', dataIndex: 'first_matched_at', width: 170, render: (value: string) => formatDateTime(value) },
    { title: '最近命中', dataIndex: 'last_matched_at', width: 170, render: (value: string) => formatDateTime(value) },
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '检测管理' }]} /></div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        <Button icon={<PlusOutlined />} onClick={() => setLinkModalOpen(true)}>添加发布链接</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setRunModalOpen(true)}>录入检测结果</Button>
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'marks',
            label: '引用标签',
            children: <Table rowKey="id" loading={loading} columns={markColumns} dataSource={marks} pagination={false} locale={{ emptyText: '暂无引用标签' }} />,
          },
          {
            key: 'runs',
            label: '检测记录',
            children: <Table rowKey="id" loading={loading} columns={runColumns} dataSource={runs} pagination={false} locale={{ emptyText: '暂无检测记录' }} />,
          },
          {
            key: 'links',
            label: '发布链接',
            children: <Table rowKey="id" loading={loading} columns={linkColumns} dataSource={links} pagination={false} locale={{ emptyText: '暂无发布链接' }} />,
          },
        ]}
      />

      <Modal
        title="添加发布链接"
        open={linkModalOpen}
        onCancel={() => setLinkModalOpen(false)}
        onOk={handleCreateLink}
        destroyOnClose
      >
        <Form form={linkForm} layout="vertical">
          <Form.Item name="article_id" label="文章ID" rules={[{ required: true, message: '请输入文章ID' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="platform_name" label="发布平台">
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="url" label="发布链接" rules={[{ required: true, message: '请输入发布链接' }]}>
            <Input maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="录入检测结果"
        open={runModalOpen}
        onCancel={() => setRunModalOpen(false)}
        onOk={handleCreateRun}
        destroyOnClose
      >
        <Form form={runForm} layout="vertical" initialValues={{ model_name: 'DeepSeek' }}>
          <Form.Item name="model_name" label="模型" rules={[{ required: true, message: '请输入模型名称' }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="prompt" label="检测问题">
            <Input maxLength={5000} />
          </Form.Item>
          <Form.Item name="answer" label="回答内容">
            <Input.TextArea rows={3} maxLength={20000} />
          </Form.Item>
          <Form.Item name="sources" label="引用来源" rules={[{ required: true, message: '请输入引用来源' }]}>
            <Input.TextArea rows={5} placeholder="https://example.com/article-a | 来源标题" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CitationDiagnosisPage;
