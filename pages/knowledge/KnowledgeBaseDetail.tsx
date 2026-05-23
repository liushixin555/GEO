import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Row, Col, Card, Input, Typography, Spin, Pagination, Empty, Popconfirm, App, Breadcrumb, Image, Tag, Alert, Button } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { formatDate } from '../utils/date';

const scopeLabels: Record<string, { text: string; color: string }> = {
  platform: { text: '平台公共', color: 'blue' },
  company: { text: '公司公共', color: 'green' },
  project: { text: '项目私有', color: 'orange' },
};

interface KeywordItem {
  id: number;
  base_id: number;
  keyword: string;
  created_by: number | null;
  created_at: string;
}

interface PortraitItem {
  id: number;
  base_id: number;
  title: string;
  content: string | null;
  created_by: number | null;
  created_at: string;
}

interface ImageItem {
  id: number;
  base_id: number;
  title: string;
  description: string | null;
  image_url: string;
  created_by: number | null;
  created_at: string;
}

const KnowledgeBaseDetail: React.FC = () => {
  const { baseId: baseIdStr } = useParams<{ baseId: string }>();
  const baseId = parseInt(baseIdStr || '0', 10);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('kb_active_tab') || 'keywords');
  const [baseName, setBaseName] = useState('');
  const [baseScope, setBaseScope] = useState<string>('');

  // Invalid baseId guard
  if (!baseId || isNaN(baseId) || baseId <= 0) {
    return (
      <div className="page-container">
        <Alert type="error" title="无效的知识库ID" showIcon
          action={<Button onClick={() => navigate('/knowledge')}>返回列表</Button>} />
      </div>
    );
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    sessionStorage.setItem('kb_active_tab', key);
  };

  // Keywords state
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [kwTotal, setKwTotal] = useState(0);
  const [kwPage, setKwPage] = useState(1);
  const [kwLoading, setKwLoading] = useState(false);
  const [kwSearch, setKwSearch] = useState('');

  // Portraits state
  const [portraits, setPortraits] = useState<PortraitItem[]>([]);
  const [ptTotal, setPtTotal] = useState(0);
  const [ptPage, setPtPage] = useState(1);
  const [ptLoading, setPtLoading] = useState(false);
  const [ptSearch, setPtSearch] = useState('');

  // Images state
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imgTotal, setImgTotal] = useState(0);
  const [imgPage, setImgPage] = useState(1);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgSearch, setImgSearch] = useState('');

  const pageSize = 12;

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/knowledge-bases/${baseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBaseName(res.data.data.name);
        setBaseScope(res.data.data.scope);
      } catch {
        // ignore
      }
    };
    if (baseId) fetchBase();
  }, [baseId]);

  const fetchKeywords = useCallback(async () => {
    if (!baseId) return;
    setKwLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page: kwPage, pageSize };
      if (kwSearch) params.search = kwSearch;
      const res = await axios.get(`/api/knowledge-bases/${baseId}/keywords`, {
        headers: { Authorization: `Bearer ${token}` }, params,
      });
      setKeywords(res.data.data.list);
      setKwTotal(res.data.data.total);
    } catch { /* ignore */ } finally { setKwLoading(false); }
  }, [baseId, kwPage, kwSearch]);

  const fetchPortraits = useCallback(async () => {
    if (!baseId) return;
    setPtLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page: ptPage, pageSize };
      if (ptSearch) params.search = ptSearch;
      const res = await axios.get(`/api/knowledge-bases/${baseId}/portraits`, {
        headers: { Authorization: `Bearer ${token}` }, params,
      });
      setPortraits(res.data.data.list);
      setPtTotal(res.data.data.total);
    } catch { /* ignore */ } finally { setPtLoading(false); }
  }, [baseId, ptPage, ptSearch]);

  const fetchImages = useCallback(async () => {
    if (!baseId) return;
    setImgLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page: imgPage, pageSize };
      if (imgSearch) params.search = imgSearch;
      const res = await axios.get(`/api/knowledge-bases/${baseId}/images`, {
        headers: { Authorization: `Bearer ${token}` }, params,
      });
      setImages(res.data.data.list);
      setImgTotal(res.data.data.total);
    } catch { /* ignore */ } finally { setImgLoading(false); }
  }, [baseId, imgPage, imgSearch]);

  useEffect(() => { fetchKeywords(); }, [fetchKeywords]);
  useEffect(() => { fetchPortraits(); }, [fetchPortraits]);
  useEffect(() => { fetchImages(); }, [fetchImages]);

  const canModify = (createdBy: number | null) => user.role === 'sysadmin' || createdBy === user.id;

  const handleDeleteKeyword = async (item: KeywordItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/knowledge-bases/${baseId}/keywords/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('删除成功');
      fetchKeywords();
    } catch (err: any) { message.error(err.response?.data?.message || '删除失败'); }
  };

  const handleDeletePortrait = async (item: PortraitItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/knowledge-bases/${baseId}/portraits/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('删除成功');
      fetchPortraits();
    } catch (err: any) { message.error(err.response?.data?.message || '删除失败'); }
  };

  const handleDeleteImage = async (item: ImageItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/knowledge-bases/${baseId}/images/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('删除成功');
      fetchImages();
    } catch (err: any) { message.error(err.response?.data?.message || '删除失败'); }
  };

  const keywordTab = (
    <div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12}>
          <Input.Search placeholder="搜索关键词..." value={kwSearch} onChange={(e) => { setKwSearch(e.target.value); setKwPage(1); }} allowClear />
        </Col>
      </Row>
      <Spin spinning={kwLoading}>
        <Row gutter={[16, 16]}>
          {keywords.map((item) => (
            <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
              <Card hoverable styles={{ body: { padding: 24 } }} style={{ height: '100%' }}
                onClick={() => navigate(`/knowledge/${baseId}/keyword/${item.id}`)}
              >
                <div className="item-card-header">
                  <Typography.Title level={3} className="item-card-title" ellipsis={{ tooltip: item.keyword }}>{item.keyword}</Typography.Title>
                  {canModify(item.created_by) && (
                    <div className="item-card-actions">
                      <Popconfirm title="确定删除此关键词？" onConfirm={(e) => { e?.stopPropagation(); handleDeleteKeyword(item); }} okText="删除" cancelText="取消">
                        <DeleteOutlined className="item-card-edit-danger" onClick={(e) => e.stopPropagation()} />
                      </Popconfirm>
                    </div>
                  )}
                </div>
                <div className="item-card-row">
                  <span className="item-card-username">{formatDate(item.created_at)}</span>
                </div>
              </Card>
            </Col>
          ))}
          <Col xs={24} sm={12} lg={8} xl={6}>
            <Card hoverable onClick={() => navigate(`/knowledge/${baseId}/keyword/add`)} className="company-add-card">
              <PlusOutlined className="company-add-icon" />
              <Typography.Text className="company-add-text">添加关键词</Typography.Text>
            </Card>
          </Col>
        </Row>
      </Spin>
      {kwTotal > pageSize && (
        <div className="item-card-pagination"><Pagination current={kwPage} pageSize={pageSize} total={kwTotal} showSizeChanger={false} onChange={(p) => setKwPage(p)} /></div>
      )}
    </div>
  );

  const portraitTab = (
    <div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12}>
          <Input.Search placeholder="搜索画像标题..." value={ptSearch} onChange={(e) => { setPtSearch(e.target.value); setPtPage(1); }} allowClear />
        </Col>
      </Row>
      <Spin spinning={ptLoading}>
        <Row gutter={[16, 16]}>
          {portraits.map((item) => (
            <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
              <Card hoverable styles={{ body: { padding: 24 } }} style={{ height: '100%' }}
                onClick={() => navigate(`/knowledge/${baseId}/portrait/${item.id}`)}
              >
                <div className="item-card-header">
                  <Typography.Title level={3} className="item-card-title" ellipsis={{ tooltip: item.title }}>{item.title}</Typography.Title>
                  {canModify(item.created_by) && (
                    <div className="item-card-actions">
                      <EyeOutlined className="item-card-edit" onClick={(e) => { e.stopPropagation(); navigate(`/knowledge/${baseId}/portrait/${item.id}`); }} />
                      <EditOutlined className="item-card-edit" onClick={(e) => { e.stopPropagation(); navigate(`/knowledge/${baseId}/portrait/${item.id}?mode=edit`); }} />
                      <Popconfirm title="确定删除此画像？" onConfirm={(e) => { e?.stopPropagation(); handleDeletePortrait(item); }} okText="删除" cancelText="取消">
                        <DeleteOutlined className="item-card-edit-danger" onClick={(e) => e.stopPropagation()} />
                      </Popconfirm>
                    </div>
                  )}
                </div>
                {item.content && (
                  <div className="item-card-row">
                    <Typography.Paragraph className="item-card-desc" ellipsis={{ rows: 2 }}>{item.content}</Typography.Paragraph>
                  </div>
                )}
                <div className="item-card-row">
                  <span className="item-card-username">{formatDate(item.created_at)}</span>
                </div>
              </Card>
            </Col>
          ))}
          <Col xs={24} sm={12} lg={8} xl={6}>
            <Card hoverable onClick={() => navigate(`/knowledge/${baseId}/portrait/add`)} className="company-add-card">
              <PlusOutlined className="company-add-icon" />
              <Typography.Text className="company-add-text">添加画像</Typography.Text>
            </Card>
          </Col>
        </Row>
      </Spin>
      {ptTotal > pageSize && (
        <div className="item-card-pagination"><Pagination current={ptPage} pageSize={pageSize} total={ptTotal} showSizeChanger={false} onChange={(p) => setPtPage(p)} /></div>
      )}
    </div>
  );

  const imageTab = (
    <div>
      <Row gutter={[16, 12]} className="toolbar">
        <Col xs={24} sm={12}>
          <Input.Search placeholder="搜索图片标题..." value={imgSearch} onChange={(e) => { setImgSearch(e.target.value); setImgPage(1); }} allowClear />
        </Col>
      </Row>
      <Spin spinning={imgLoading}>
        <Row gutter={[16, 16]}>
          {images.map((item) => (
            <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
              <Card hoverable styles={{ body: { padding: 12 } }} style={{ height: '100%' }}
                className="knowledge-image-card"
                onClick={() => navigate(`/knowledge/${baseId}/image/${item.id}`)}
              >
                <div className="knowledge-image-thumb">
                  <Image src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={false} />
                </div>
                <div style={{ padding: '8px 4px 4px' }}>
                  <Typography.Text strong ellipsis style={{ display: 'block' }}>{item.title}</Typography.Text>
                  {item.description && <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>{item.description}</Typography.Text>}
                </div>
                {canModify(item.created_by) && (
                  <div className="knowledge-image-actions">
                    <EditOutlined className="item-card-edit" onClick={(e) => { e.stopPropagation(); navigate(`/knowledge/${baseId}/image/${item.id}?mode=edit`); }} />
                    <Popconfirm title="确定删除此图片？" onConfirm={(e) => { e?.stopPropagation(); handleDeleteImage(item); }} okText="删除" cancelText="取消">
                      <DeleteOutlined className="item-card-edit-danger" onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  </div>
                )}
              </Card>
            </Col>
          ))}
          <Col xs={24} sm={12} lg={8} xl={6}>
            <Card hoverable onClick={() => navigate(`/knowledge/${baseId}/image/add`)} className="company-add-card">
              <PlusOutlined className="company-add-icon" />
              <Typography.Text className="company-add-text">添加图片</Typography.Text>
            </Card>
          </Col>
        </Row>
      </Spin>
      {imgTotal > pageSize && (
        <div className="item-card-pagination"><Pagination current={imgPage} pageSize={pageSize} total={imgTotal} showSizeChanger={false} onChange={(p) => setImgPage(p)} /></div>
      )}
    </div>
  );

  const tabItems = [
    { key: 'keywords', label: '关键词', children: keywordTab },
    { key: 'portraits', label: '画像', children: portraitTab },
    { key: 'images', label: '图片', children: imageTab },
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[
          { title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> },
          { title: baseName || '...' },
        ]} />
      </div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <ArrowLeftOutlined onClick={() => navigate('/knowledge')} style={{ cursor: 'pointer', fontSize: 16 }} />
        <Typography.Title level={4} style={{ margin: 0 }}>{baseName}</Typography.Title>
        {baseScope && <Tag color={scopeLabels[baseScope]?.color}>{scopeLabels[baseScope]?.text}</Tag>}
      </div>
      <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} />
    </div>
  );
};

export default KnowledgeBaseDetail;
