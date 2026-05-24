import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Spin, Upload, App, Breadcrumb, Descriptions } from 'antd';
import { ArrowLeftOutlined, InboxOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FilePptOutlined, FileMarkdownOutlined, FileTextOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getSafeUser } from '../utils/auth';

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FilePdfOutlined style={{ fontSize: 32, color: '#da1e28' }} />,
  doc: <FileWordOutlined style={{ fontSize: 32, color: '#0f62fe' }} />,
  docx: <FileWordOutlined style={{ fontSize: 32, color: '#0f62fe' }} />,
  xls: <FileExcelOutlined style={{ fontSize: 32, color: '#198038' }} />,
  xlsx: <FileExcelOutlined style={{ fontSize: 32, color: '#198038' }} />,
  ppt: <FilePptOutlined style={{ fontSize: 32, color: '#fa4d56' }} />,
  pptx: <FilePptOutlined style={{ fontSize: 32, color: '#fa4d56' }} />,
  md: <FileMarkdownOutlined style={{ fontSize: 32, color: '#697077' }} />,
  json: <FileTextOutlined style={{ fontSize: 32, color: '#8a3ffc' }} />,
  yaml: <FileTextOutlined style={{ fontSize: 32, color: '#8a3ffc' }} />,
  yml: <FileTextOutlined style={{ fontSize: 32, color: '#8a3ffc' }} />,
  csv: <FileTextOutlined style={{ fontSize: 32, color: '#198038' }} />,
  xml: <FileTextOutlined style={{ fontSize: 32, color: '#697077' }} />,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentData {
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_by: number | null;
}

const DocumentDetail: React.FC = () => {
  const { baseId: baseIdStr, id } = useParams<{ baseId: string; id: string }>();
  const navigate = useNavigate();
  const baseId = parseInt(baseIdStr || '', 10);
  const isNew = id === 'add';
  const [searchParams] = useSearchParams();
  const isEditMode = isNew || searchParams.get('mode') === 'edit';
  const { message } = App.useApp();
  const user = getSafeUser();

  const [data, setData] = useState<DocumentData | null>(null);
  const [baseName, setBaseName] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    if (isNew || !baseId || isNaN(baseId)) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/knowledge-bases/${baseId}/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data);
      setFileUrl(res.data.data.file_url);
      setFileName(res.data.data.file_name);
      setFileType(res.data.data.file_type);
      setFileSize(res.data.data.file_size);
      form.setFieldsValue({ title: res.data.data.title, description: res.data.data.description || '' });
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  }, [id, baseId, isNew]);

  useEffect(() => {
    const fetchBaseName = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/v1/knowledge-bases/${baseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBaseName(res.data.data.name);
      } catch { /* ignore */ }
    };
    if (baseId) fetchBaseName();
  }, [baseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!baseId || isNaN(baseId) || baseId <= 0) {
    return (
      <div className="page-container">
        <Alert type="error" title="无效的知识库ID" showIcon
          action={<Button onClick={() => navigate('/knowledge')}>返回列表</Button>} />
      </div>
    );
  }

  const canEdit = isEditMode && (user.role === 'sysadmin' || isNew || data?.created_by === user.id);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/v1/upload/document', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setFileUrl(res.data.data.url);
      setFileName(res.data.data.originalName);
      setFileType(res.data.data.fileType);
      setFileSize(res.data.data.fileSize);
      // 自动填充标题为文件名（去掉扩展名）
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
      form.setFieldValue('title', form.getFieldValue('title') || nameWithoutExt);
    } catch (err: any) {
      message.error(err.response?.data?.message || '上传失败');
    } finally { setUploading(false); }
    return false;
  };

  const handleSave = async (values: { title: string; description?: string }) => {
    if (!fileUrl) { setError('请上传文档'); return; }
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = { ...values, file_url: fileUrl, file_name: fileName, file_type: fileType, file_size: fileSize };
      if (isNew) {
        await axios.post(`/api/v1/knowledge-bases/${baseId}/documents`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success('创建成功');
      } else {
        await axios.put(`/api/v1/knowledge-bases/${baseId}/documents/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success('更新成功');
      }
      navigate(`/knowledge/${baseId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-container"><Spin /></div>;

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[
          { title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> },
          { title: <a onClick={() => navigate(`/knowledge/${baseId}`)}>{baseName || '...'}</a> },
          { title: isNew ? '添加文档' : '文档详情' },
        ]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/knowledge/${baseId}`)} />
        <Typography.Title level={2} style={{ margin: 0 }}>{isNew ? '添加文档' : '文档详情'}</Typography.Title>
      </div>
      <Form form={form} onFinish={handleSave} layout="vertical" style={{ maxWidth: 600 }}>
        {error && <Alert type="error" title={error} className="form-alert" showIcon closable onClose={() => setError('')} />}
        {/* 新增模式：未上传文档时只显示上传按钮 */}
        {isNew && !fileUrl && (
          <Form.Item label="文档">
            <Upload
              accept=".pdf,.doc,.docx,.md,.json,.yaml,.yml,.xls,.xlsx,.csv,.ppt,.pptx,.xml"
              showUploadList={false}
              beforeUpload={(file) => { handleUpload(file); return false; }}
              disabled={uploading}
            >
              <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: 2, padding: '32px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <InboxOutlined style={{ fontSize: 32 }} />
                <span style={{ marginTop: 8 }}>{uploading ? '上传中...' : '点击上传文档'}</span>
                <span style={{ marginTop: 4, fontSize: 12 }}>支持 PDF、Word、Excel、PPT、Markdown、JSON、YAML、CSV、XML</span>
                <span style={{ marginTop: 2, fontSize: 12 }}>最大 30MB</span>
              </div>
            </Upload>
          </Form.Item>
        )}
        {/* 已上传或编辑模式：显示所有字段 */}
        {(fileUrl || !isNew) && (
          <>
            <Form.Item name="title" label="文档标题" rules={[{ required: true, message: '标题不能为空' }]}>
              <Input placeholder="输入文档标题" disabled={!canEdit} />
            </Form.Item>
            <Form.Item name="description" label="文档描述">
              <Input.TextArea placeholder="输入文档描述" autoSize={{ minRows: 2 }} disabled={!canEdit} />
            </Form.Item>
            <Form.Item label="文档文件">
              {canEdit && isNew && (
                <Upload
                  accept=".pdf,.doc,.docx,.md,.json,.yaml,.yml,.xls,.xlsx,.csv,.ppt,.pptx,.xml"
                  showUploadList={false}
                  beforeUpload={(file) => { handleUpload(file); return false; }}
                  disabled={uploading}
                >
                  <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: 2, padding: '12px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <span>{uploading ? '上传中...' : '重新上传'}</span>
                  </div>
                </Upload>
              )}
              {fileUrl && (
                <div style={{ marginTop: 8, padding: 12, background: 'var(--layer-01)', borderRadius: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {FILE_TYPE_ICONS[fileType] || <FileOutlined style={{ fontSize: 32 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Text strong ellipsis style={{ display: 'block' }}>{fileName}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatFileSize(fileSize)} · .{fileType}</Typography.Text>
                    </div>
                    <Button type="text" icon={<DownloadOutlined />} href={fileUrl} target="_blank" />
                  </div>
                </div>
              )}
            </Form.Item>
          </>
        )}
        {canEdit && fileUrl && (
          <div className="form-actions">
            <Button onClick={() => navigate(`/knowledge/${baseId}`)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
          </div>
        )}
      </Form>
    </div>
  );
};

export default DocumentDetail;
