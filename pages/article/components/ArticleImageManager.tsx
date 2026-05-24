import React, { useState, useCallback } from 'react';
import { Upload, Image, Segmented, Input, Spin, App } from 'antd';
import { InboxOutlined, LinkOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import apiClient from '../../lib/apiClient';
import { getApiErrorMessage } from '../../utils/error';
import type { KbImage } from '../types';

interface ArticleImageManagerProps {
  imageList: string[];
  imageListChange: (list: string[]) => void;
  editable: boolean;
  kbImages: KbImage[];
  kbLoading: boolean;
}

const ArticleImageManager: React.FC<ArticleImageManagerProps> = ({
  imageList, imageListChange, editable, kbImages, kbLoading,
}) => {
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'kb'>('kb');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const { message } = App.useApp();

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('仅支持上传图片文件');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('图片大小不能超过 10MB');
      return false;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      imageListChange([...imageList, res.data.data.url]);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '上传失败'));
    } finally {
      setUploading(false);
    }
    return false;
  }, [imageList, imageListChange, message]);

  const handleAddUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        message.error('仅支持 http/https 协议的图片 URL');
        return;
      }
    } catch {
      message.error('请输入有效的图片 URL');
      return;
    }
    if (imageList.includes(url)) { message.warning('该URL已存在'); return; }
    imageListChange([...imageList, url]);
    setUrlInput('');
  }, [urlInput, imageList, imageListChange, message]);

  if (!editable) {
    return imageList.length === 0 ? (
      <span style={{ color: 'var(--color-ink-subtle)' }}>暂无插图</span>
    ) : (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {imageList.map((url, idx) => (
          <div key={idx} style={{ width: 80, height: 80, borderRadius: 0, overflow: 'hidden' }}>
            <Image src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Segmented
          size="small"
          options={[{ label: '从知识库选择', value: 'kb' }, { label: '上传图片', value: 'upload' }, { label: '输入URL', value: 'url' }]}
          value={imageMode}
          onChange={(val) => setImageMode(val as 'upload' | 'url' | 'kb')}
        />
      </div>
      {imageMode === 'kb' && (
        <div style={{ marginTop: 8 }}>
          {kbImages.length === 0 ? (
            <Spin spinning={kbLoading}>
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--color-ink-subtle)' }}>
                {kbLoading ? '加载中...' : '知识库暂无图片，请先在知识库中添加'}
              </div>
            </Spin>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {kbImages.map((img) => {
                const selected = imageList.includes(img.image_url);
                return (
                  <div key={img.id}
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={`选择图片: ${img.title}`}
                    tabIndex={0}
                    onClick={() => {
                      if (selected) {
                        imageListChange(imageList.filter((u) => u !== img.image_url));
                      } else {
                        imageListChange([...imageList, img.image_url]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (selected) {
                          imageListChange(imageList.filter((u) => u !== img.image_url));
                        } else {
                          imageListChange([...imageList, img.image_url]);
                        }
                      }
                    }}
                    style={{
                      position: 'relative', width: 80, height: 80,
                      border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
                      borderRadius: 0, overflow: 'hidden', cursor: 'pointer',
                    }}
                    title={img.title}
                  >
                    <Image src={img.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={false} />
                    {selected && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'var(--color-overlay-light, rgba(22,22,22,0.25))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none',
                      }}>
                        <CheckOutlined style={{ color: 'var(--color-on-primary)', fontSize: 20 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {imageMode === 'upload' && (
        <div style={{ display: 'block', width: '100%' }}>
          <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleUpload(file); return false; }} disabled={uploading}>
            <div style={{ border: '1px dashed var(--color-hairline)', borderRadius: 2, padding: '16px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--color-ink-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <InboxOutlined style={{ fontSize: 24 }} />
              <span style={{ marginTop: 8 }}>{uploading ? '上传中...' : '点击上传图片'}</span>
            </div>
          </Upload>
        </div>
      )}
      {imageMode === 'url' && (
        <Input.Search placeholder="输入图片URL" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onSearch={handleAddUrl} enterButton={<LinkOutlined />} />
      )}
      {imageList.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {imageList.map((url, idx) => (
            <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 0, overflow: 'hidden', border: '2px solid var(--color-primary)' }}>
              <Image src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview />
              <div
                role="button"
                aria-label={`删除图片 ${idx + 1}`}
                tabIndex={0}
                onClick={() => imageListChange(imageList.filter((_, i) => i !== idx))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); imageListChange(imageList.filter((_, i) => i !== idx)); } }}
                style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, background: 'var(--color-overlay-medium, rgba(22,22,22,0.5))', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <DeleteOutlined style={{ color: 'var(--color-on-primary)', fontSize: 12 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default React.memo(ArticleImageManager);
