import React, { useState, useEffect, useCallback } from 'react';
import { Collapse, Row, Col, Card, Button, Form, Input, Typography, Spin, Alert, Switch, Popconfirm, App, Breadcrumb } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import LlmModelForm from './LlmModelForm';

interface LlmModelItem {
  id: number;
  provider: string;
  base_url: string;
  api_key: string;
  model_name: string;
  status: boolean;
}

const SystemAdminPage: React.FC = () => {
  const [models, setModels] = useState<LlmModelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModelForm, setShowModelForm] = useState(false);
  const [editModel, setEditModel] = useState<LlmModelItem | null>(null);
  const { message } = App.useApp();

  // Account configs
  const [yishangshuForm] = Form.useForm();
  const [ruanmengForm] = Form.useForm();
  const [configsLoading, setConfigsLoading] = useState(false);
  const [yishangshuSaving, setYishangshuSaving] = useState(false);
  const [ruanmengSaving, setRuanmengSaving] = useState(false);
  const [platformSyncing, setPlatformSyncing] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/llm-models', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModels(res.data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfigs = useCallback(async () => {
    setConfigsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/system-configs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const configs: Record<string, string> = {};
      for (const c of res.data.data) {
        configs[c.config_key] = c.config_value;
      }
      yishangshuForm.setFieldsValue({
        username: configs['yishangshu_username'] || '',
        password: configs['yishangshu_password'] || '',
      });
      ruanmengForm.setFieldsValue({
        username: configs['ruanmeng_username'] || '',
        password: configs['ruanmeng_password'] || '',
      });
    } catch {
      // ignore
    } finally {
      setConfigsLoading(false);
    }
  }, [yishangshuForm, ruanmengForm]);

  useEffect(() => {
    fetchModels();
    fetchConfigs();
  }, [fetchModels, fetchConfigs]);

  const handleToggleStatus = async (item: LlmModelItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/llm-models/${item.id}`, {
        status: !item.status,
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchModels();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/llm-models/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchModels();
    } catch (err: any) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  const saveConfigs = async (keys: { username: string; password: string }, prefix: string) => {
    const token = localStorage.getItem('token');
    await axios.put('/api/system-configs', {
      configs: [
        { config_key: `${prefix}_username`, config_value: keys.username },
        { config_key: `${prefix}_password`, config_value: keys.password },
      ],
    }, { headers: { Authorization: `Bearer ${token}` } });
  };

  const handleSaveYishangshu = async (values: any) => {
    setYishangshuSaving(true);
    try {
      await saveConfigs(values, 'yishangshu');
      message.success('保存成功');
    } catch (err: any) {
      message.error(err.response?.data?.message || '保存失败');
    } finally {
      setYishangshuSaving(false);
    }
  };

  const handleSaveRuanmeng = async (values: any) => {
    setRuanmengSaving(true);
    try {
      await saveConfigs(values, 'ruanmeng');
      message.success('保存成功');
    } catch (err: any) {
      message.error(err.response?.data?.message || '保存失败');
    } finally {
      setRuanmengSaving(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '***';
    return key.slice(0, 4) + '***' + key.slice(-4);
  };

  if (error) {
    return <Alert type="error" title={error} className="page-alert" />;
  }

  const handleSyncPlatforms = async () => {
    setPlatformSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/publishing-platforms/sync', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(res.data.message || '同步成功');
    } catch (err: any) {
      message.error(err.response?.data?.message || '同步失败');
    } finally {
      setPlatformSyncing(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: '系统管理' }]} /></div>
      <Collapse
        defaultActiveKey={['llm', 'yishangshu', 'ruanmeng']}
        className="settings-collapse"
        items={[
          {
            key: 'llm',
            label: 'LLM 模型配置',
            children: (
              <Spin spinning={loading}>
                <Row gutter={[16, 16]}>
                  {models.map((item) => (
                    <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
                      <Card hoverable styles={{ body: { padding: 24 } }}>
                        <div className="item-card-header">
                          <Typography.Title level={3} className="item-card-title">{item.provider}</Typography.Title>
                          <div className="item-card-actions">
                            <EditOutlined className="item-card-edit" onClick={() => { setEditModel(item); setShowModelForm(true); }} />
                            <Popconfirm title="确定删除此模型？" onConfirm={() => handleDelete(item.id)} okText="确定" cancelText="取消">
                              <DeleteOutlined className="item-card-edit item-card-edit-danger" />
                            </Popconfirm>
                          </div>
                        </div>
                        <div className="item-card-desc">{item.model_name}</div>
                        <div className="settings-card-url">{item.base_url}</div>
                        <div className="item-card-row">
                          <span className="settings-api-key-masked">{maskApiKey(item.api_key)}</span>
                          <Switch size="small" checked={item.status} onChange={() => handleToggleStatus(item)} checkedChildren="启用" unCheckedChildren="禁用" />
                        </div>
                      </Card>
                    </Col>
                  ))}
                  <Col xs={24} sm={12} lg={8} xl={6}>
                    <Card hoverable onClick={() => { setEditModel(null); setShowModelForm(true); }} className="company-add-card">
                      <PlusOutlined className="company-add-icon" />
                      <Typography.Text className="company-add-text">添加模型</Typography.Text>
                    </Card>
                  </Col>
                </Row>
              </Spin>
            ),
          },
          {
            key: 'yishangshu',
            label: '蚁上数热点账号',
            children: (
              <Spin spinning={configsLoading}>
                <Form form={yishangshuForm} onFinish={handleSaveYishangshu} layout="vertical" className="settings-section-form">
                  <Form.Item name="username" label="账号" rules={[{ required: true, message: '账号不能为空' }]}>
                    <Input placeholder="请输入蚁上数热点账号" />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[{ required: true, message: '密码不能为空' }]}>
                    <Input.Password placeholder="请输入密码" />
                  </Form.Item>
                  <div className="form-actions">
                    <Button type="primary" htmlType="submit" loading={yishangshuSaving}>保存</Button>
                  </div>
                </Form>
              </Spin>
            ),
          },
          {
            key: 'ruanmeng',
            label: '软盟账号',
            children: (
              <Spin spinning={configsLoading}>
                <Form form={ruanmengForm} onFinish={handleSaveRuanmeng} layout="vertical" className="settings-section-form">
                  <Form.Item name="username" label="账号" rules={[{ required: true, message: '账号不能为空' }]}>
                    <Input placeholder="请输入软盟账号" />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[{ required: true, message: '密码不能为空' }]}>
                    <Input.Password placeholder="请输入密码" />
                  </Form.Item>
                  <div className="form-actions">
                    <Button type="primary" htmlType="submit" loading={ruanmengSaving}>保存</Button>
                    <Button loading={platformSyncing} onClick={handleSyncPlatforms}>同步发布平台</Button>
                  </div>
                </Form>
              </Spin>
            ),
          },
        ]}
      />
      {showModelForm && (
        <LlmModelForm
          item={editModel}
          onClose={() => setShowModelForm(false)}
          onSaved={fetchModels}
        />
      )}
    </div>
  );
};

export default SystemAdminPage;
