import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb, Select, Radio, DatePicker, Button, Table, Input, Tooltip, App, Tag, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../lib/apiClient';
import { getApiErrorMessage } from '../utils/error';
import { useAppContext } from '../context/AppContext';

type ScheduleType = 'asap' | 'scheduled' | 'after';

interface ArticleOption {
  id: number;
  title: string;
  keywords: string | null;
  project_id: number;
}

interface PlatformItem {
  id: number;
  rm_resource_id: number;
  name: string;
  taxonomy: string;
  price: number;
  remark: string | null;
  include_rate: number;
  publish_rate: number;
}

const CreatePublishSchedule: React.FC = () => {
  const { message } = App.useApp();
  const { projectId } = useAppContext();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);

  // 文章
  const [articleOptions, setArticleOptions] = useState<ArticleOption[]>([]);
  const [articleLoading, setArticleLoading] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);

  // 平台 - 服务端分页
  const [platformList, setPlatformList] = useState<PlatformItem[]>([]);
  const [platformTotal, setPlatformTotal] = useState(0);
  const [platformPage, setPlatformPage] = useState(1);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<React.Key[]>([]);
  const [platformSearch, setPlatformSearch] = useState('');
  // 缓存所有已选平台的完整信息（跨页保留选中状态）
  const selectedMapRef = useRef<Map<number, PlatformItem>>(new Map());

  // 发布策略
  const [scheduleType, setScheduleType] = useState<ScheduleType>('asap');
  const [scheduleDate, setScheduleDate] = useState<string | null>(null);

  // 加载文章列表
  useEffect(() => {
    const fetchArticles = async () => {
      setArticleLoading(true);
      try {
        const params: Record<string, unknown> = { page: 1, pageSize: 100, status: 'approved' };
        if (projectId) params.projectId = projectId;
        const res = await apiClient.get('/publishing-schedule/articles', { params });
        const list: ArticleOption[] = (res.data.data.list || []).map((a: Record<string, unknown>) => ({
          id: a.id as number,
          title: (a.title as string) || '<无标题>',
          keywords: a.keywords as string | null,
          project_id: a.project_id as number,
        }));
        setArticleOptions(list);
      } catch {
        setArticleOptions([]);
      } finally {
        setArticleLoading(false);
      }
    };
    fetchArticles();
  }, [projectId]);

  // 加载平台列表 - 服务端分页
  const fetchPlatforms = useCallback(async (page: number, search: string) => {
    setPlatformLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: 10 };
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.get('/publishing-platforms', { params });
      const list = res.data.data.list || [];
      const total = res.data.data.total || 0;
      setPlatformList(list);
      setPlatformTotal(total);
    } catch {
      setPlatformList([]);
      setPlatformTotal(0);
    } finally {
      setPlatformLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms(platformPage, platformSearch);
  }, [platformPage, platformSearch, fetchPlatforms]);

  // 搜索时重置到第1页
  const handlePlatformSearch = (value: string) => {
    setPlatformSearch(value);
    setPlatformPage(1);
  };

  // 单选平台
  const handleSelectPlatform = (record: PlatformItem) => {
    selectedMapRef.current.set(record.id, record);
    setSelectedPlatformIds([record.id]);
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!selectedArticleId) {
      message.warning('请选择文章');
      return;
    }
    if (selectedPlatformIds.length === 0) {
      message.warning('请选择发布平台');
      return;
    }
    if ((scheduleType === 'scheduled' || scheduleType === 'after') && !scheduleDate) {
      message.warning('请选择时间');
      return;
    }

    // 从缓存中取已选平台的 name
    const selectedNames = selectedPlatformIds
      .map((k) => selectedMapRef.current.get(k as number)?.name)
      .filter(Boolean) as string[];

    setSaving(true);
    try {
      await apiClient.post('/publishing-schedule', {
        article_id: selectedArticleId,
        platforms: selectedNames,
        schedule_type: scheduleType,
        scheduled_publish_at: scheduleType === 'asap' ? null : scheduleDate,
      });
      message.success('发布计划已创建');
      navigate('/publish');
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '创建失败'));
    } finally {
      setSaving(false);
    }
  };

  const platformColumns = [
    {
      title: '资源ID',
      dataIndex: 'rm_resource_id',
      key: 'rm_resource_id',
      width: 90,
      responsive: ['xl'] as const,
    },
    {
      title: '平台名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'taxonomy',
      key: 'taxonomy',
      width: 120,
      responsive: ['md'] as const,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 80,
      render: (v: number) => `${v}`,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      ellipsis: { showTitle: false } as const,
      responsive: ['lg'] as const,
      render: (text: string | null) => (
        <Tooltip placement="topLeft" title={text}>
          {text || '-'}
        </Tooltip>
      ),
    },
    {
      title: '收录率',
      dataIndex: 'include_rate',
      key: 'include_rate',
      width: 80,
      responsive: ['lg'] as const,
      render: (v: number) => `${v}%`,
    },
    {
      title: '发布率',
      dataIndex: 'publish_rate',
      key: 'publish_rate',
      width: 80,
      responsive: ['lg'] as const,
      render: (v: number) => `${v}%`,
    },
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: '发布管理' }, { title: '新建发布计划' }]} />
      </div>

      <Spin spinning={articleLoading || platformLoading}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 文章选择 */}
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选择文章 <span style={{ color: 'red' }}>*</span></div>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="选择已审核通过的文章"
              value={selectedArticleId}
              onChange={setSelectedArticleId}
              optionFilterProp="label"
              options={articleOptions.map((a) => ({
                value: a.id,
                label: `${a.title}${a.keywords ? ` (${a.keywords})` : ''}`,
              }))}
            />
          </div>

          {/* 发布策略 */}
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>发布策略 <span style={{ color: 'red' }}>*</span></div>
            <Radio.Group
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="asap">尽快执行</Radio.Button>
              <Radio.Button value="scheduled">指定时间执行</Radio.Button>
              <Radio.Button value="after">指定时间之后执行</Radio.Button>
            </Radio.Group>
          </div>

          {(scheduleType === 'scheduled' || scheduleType === 'after') && (
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                {scheduleType === 'scheduled' ? '指定发布时间' : '在此时间之后执行'}
              </div>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                value={scheduleDate ? dayjs(scheduleDate) : null}
                onChange={(_date: Dayjs | null, dateString: string | null) => {
                  setScheduleDate(dateString || null);
                }}
                format="YYYY-MM-DD HH:mm"
                placeholder="选择时间"
              />
            </div>
          )}

          {/* 平台选择 */}
          <div>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>
                选择发布平台 <span style={{ color: 'red' }}>*</span>
                {selectedPlatformIds.length > 0 && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>已选：{selectedMapRef.current.get(selectedPlatformIds[0] as number)?.name}</Tag>
                )}
              </span>
              <Input.Search
                placeholder="搜索平台名称或分类..."
                value={platformSearch}
                onChange={(e) => handlePlatformSearch(e.target.value)}
                onSearch={(val) => handlePlatformSearch(val)}
                allowClear
                style={{ width: 260 }}
              />
            </div>
            <Table
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedPlatformIds,
                onChange: (_keys: React.Key[], rows: PlatformItem | PlatformItem[]) => {
                  const row = Array.isArray(rows) ? rows[0] : rows;
                  if (row) handleSelectPlatform(row);
                },
              }}
              columns={platformColumns}
              dataSource={platformList}
              rowKey="id"
              size="small"
              pagination={{
                current: platformPage,
                pageSize: 10,
                total: platformTotal,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 个平台`,
                onChange: (p) => setPlatformPage(p),
              }}
              locale={{ emptyText: '暂无平台数据' }}
              scroll={{ y: 400 }}
            />
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/publish')}>返回</Button>
            <Button type="primary" onClick={handleSubmit} loading={saving}>创建发布计划</Button>
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default CreatePublishSchedule;
