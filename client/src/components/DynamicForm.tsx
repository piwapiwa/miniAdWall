import React, { useState, useEffect } from 'react'
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Upload, 
  Card, 
  Typography, 
  Message, 
  Spin,
  Image,
  Modal
} from '@arco-design/web-react'
import { IconPlus, IconPlayCircle, IconDelete, IconEye } from '@arco-design/web-react/icon'
import axios from 'axios'
import { FormSchema, FormField } from '../types'

const { Title } = Typography
const { Option } = Select

interface DynamicFormProps {
  schemaId?: string;
  onSubmit?: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
  onCancel?: () => void;
  okText?: string;
}

const DEFAULT_DATA: Record<string, any> = {};

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  schemaId = 'ad-form', 
  onSubmit,
  initialData = DEFAULT_DATA,
  onCancel,
  okText = '提交'
}) => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [videoFileList, setVideoFileList] = useState<any[]>([]);

  // 预览相关状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [previewVideoSrc, setPreviewVideoSrc] = useState('');

  useEffect(() => {
    const fetchFormSchema = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/form-schema/${schemaId}`);
        setSchema(response.data);
        
        if (initialData) {
          form.setFieldsValue(initialData);
          
          if (initialData.imageUrls && Array.isArray(initialData.imageUrls)) {
            const urls = initialData.imageUrls as string[];
            setImageFileList(urls.map((url, index) => ({
              uid: `img-${index}`, name: `图片${index + 1}`, status: 'done', url: url
            })));
          }
          
          if (initialData.videoUrls && Array.isArray(initialData.videoUrls)) {
            const urls = initialData.videoUrls as string[];
            setVideoFileList(urls.map((url, index) => ({
              uid: `vid-${index}`, name: `视频${index + 1}`, status: 'done', url: url
            })));
          }
        }
      } catch (error) {
        console.error('获取表单配置失败:', error);
        Message.error('加载表单配置失败');
      } finally {
        setLoading(false);
      }
    };

    fetchFormSchema();
  }, [schemaId, form, initialData]);

  const handleUpload = async (option: any) => {
    const { file, onSuccess, onError, onProgress } = option;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      });

      const fileUrl = response.data.url;
      onSuccess({ url: fileUrl });
      return { url: fileUrl };
    } catch (error) {
      Message.error('文件上传失败');
      onError(error);
    }
  };

  // 统一预览处理逻辑
  const handlePreview = (file: any) => {
    // 获取文件地址：优先用服务端返回的 url，如果是本地刚选的则生成 blob url
    const url = file.url || (file.originFile && URL.createObjectURL(file.originFile));
    
    if (!url) return;

    // 判断是否为视频
    // 1. 根据文件名后缀 2. 根据文件类型 3. 检查是否在视频列表中
    const isVideo = 
      file.name?.match(/\.(mp4|webm|ogg|mov)$/i) || 
      file.type?.includes('video') || 
      videoFileList.find(v => v.uid === file.uid);

    if (isVideo) {
      setPreviewVideoSrc(url);
      setVideoModalVisible(true);
    } else {
      setPreviewImageSrc(url);
      setPreviewVisible(true);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const finalValues = {
        ...values,
        imageUrls: imageFileList.filter((f: any) => f.status === 'done').map((f: any) => f.response?.url || f.url),
        videoUrls: videoFileList.filter((f: any) => f.status === 'done').map((f: any) => f.response?.url || f.url),
      };

      if (onSubmit) {
        await onSubmit(finalValues);
      }
      
      form.resetFields();
      setImageFileList([]);
      setVideoFileList([]);
    } catch (error) {
      console.error('提交过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      field: field.name,
      label: field.label,
      disabled: field.disabled,
    };

    if (field.type === 'file') {
      const isImage = field.name.toLowerCase().includes('image');
      const currentFileList = isImage ? imageFileList : videoFileList;
      const setFileList = isImage ? setImageFileList : setVideoFileList;
      const acceptType = isImage ? 'image/*' : 'video/*';
      
      return (
        <Form.Item 
          key={field.name} 
          {...commonProps}
          trigger="onChange"
          rules={[{ 
            required: field.required, 
            validator: (value) => {
              return new Promise<void>((resolve, reject) => {
                const list = Array.isArray(value) ? value : currentFileList;
                if (field.required) {
                   if (!list || list.length === 0) { reject(`请至少上传一个${field.label}`); return; }
                   const hasUploading = list.some((f: any) => f.status === 'uploading');
                   const hasError = list.some((f: any) => f.status === 'error');
                   if (hasUploading) { reject(`请等待${field.label}上传完成`); return; }
                   if (hasError) { reject(`${field.label}上传失败，请删除重试`); return; }
                }
                resolve();
              });
            }
          }]}
        >
          {/* 🚀 核心 CSS 注入：
            1. 强制统一 picture-card 的尺寸
            2. 隐藏多余的边框
            3. 自定义视频卡片样式 
          */}
          <style>{`
  /* 1. 布局容器：使用 Flex 确保“加号”和“文件”严格对齐 */
  .arco-upload-list-type-picture-card {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 8px !important; /* 统一间距 */
  }

  /* 2. 统一卡片尺寸与外框 (作用于“已上传项”和“加号按钮”) */
  .arco-upload-list-type-picture-card .arco-upload-list-item,
  .arco-upload-trigger-picture-card {
    width: 100px !important;
    height: 100px !important;
    border-radius: 6px !important;
    box-sizing: border-box !important;
    margin: 0 !important; /* 去除默认 margin，完全由 gap 控制 */
    transition: all 0.2s;
  }

  /* 3. 已上传项样式：去除内边距，加边框 */
  .arco-upload-list-type-picture-card .arco-upload-list-item {
    padding: 0 !important; /* 🔥 关键：去除 Arco 默认的 padding，让图片能撑满 */
    border: 1px solid #e5e6eb !important; /* 浅灰边框，让白色图片也能看清边界 */
    overflow: hidden !important;
  }

  /* 4. 加号按钮样式 */
  .arco-upload-trigger-picture-card {
    background-color: #f7f8fa !important;
    border: 1px dashed #c9cdd4 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .arco-upload-trigger-picture-card:hover {
    border-color: #165DFF !important;
  }

  /* 5. 自定义媒体容器 */
  .custom-media-card {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f2f3f5;
  }

  /* 6. 内容填充 (核心)：强制 Cover 模式 */
  .custom-media-content {
    width: 100%;
    height: 100%;
    object-fit: cover !important; /* 🔥 关键：裁剪填满，不留白边 */
    display: block;
  }

  /* 7. 播放图标样式 */
  .play-icon-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2;
  }
  .play-icon-overlay svg {
    font-size: 28px;
    color: rgba(255, 255, 255, 0.9);
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }

  /* 8. 遮罩层交互 (预览/删除) */
  .custom-mask {
    position: absolute; 
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 12px;
    opacity: 0; 
    transition: opacity 0.3s;
    z-index: 3;
    backdrop-filter: blur(2px);
  }
  .arco-upload-list-item:hover .custom-mask {
    opacity: 1;
  }
  .action-icon { 
    color: #fff; 
    cursor: pointer; 
    font-size: 18px; 
    padding: 4px;
  }
  .action-icon:hover { 
    color: #165DFF; 
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
  }
`}</style>

          <Upload
            multiple={field.multiple}
            limit={10}
            listType="picture-card" // 关键：无论图片还是视频，都用这个模式，保证九宫格对齐
            accept={acceptType}
            fileList={currentFileList}
            customRequest={handleUpload}
            disabled={field.disabled}
            onChange={(fileList) => {
              setFileList(fileList);
              form.setFieldValue(field.name, fileList);
            }}
            onPreview={handlePreview} // 绑定默认预览事件（针对图片）
            onRemove={(file) => {
              const newList = currentFileList.filter(item => item.uid !== file.uid);
              setFileList(newList);
              form.setFieldValue(field.name, newList);
            }}
            // 🚀 核心：自定义渲染列表项，实现视频带播放按钮效果
            renderUploadItem={(itemNode, file) => {
              const fileUrl = file.url || (file.response as any)?.url || (file.originFile && URL.createObjectURL(file.originFile));

              if (file.status === 'uploading' || file.status === 'error') {
                return itemNode;
              }
              const isVideo = !isImage;

              return (
                <div className="arco-upload-list-item arco-upload-list-item-done">
                  <div className="arco-upload-list-item-picture custom-media-card">
                    
                    {isVideo ? (
                      /* === 视频渲染 === */
                      <>
                        <video
                          className="custom-media-content"
                          src={`${fileUrl}#t=0.5`} /* 取第0.5秒帧 */
                          preload="metadata"
                          muted
                        />
                        <div className="play-icon-overlay">
                          <IconPlayCircle />
                        </div>
                      </>
                    ) : (
                      /* === 图片渲染 === */
                      <img 
                        className="custom-media-content"
                        src={fileUrl} 
                        alt="preview"
                      />
                    )}

                    {/* 遮罩层 (预览/删除) */}
                    <div className="custom-mask">
                      <IconEye 
                        className="action-icon" 
                        onClick={() => handlePreview(file)} 
                      />
                      <IconDelete 
                        className="action-icon" 
                        onClick={() => {
                          const currentList = isImage ? imageFileList : videoFileList;
                          const setList = isImage ? setImageFileList : setVideoFileList;
                          
                          const newList = currentList.filter(item => item.uid !== file.uid);
                          setList(newList);
                          form.setFieldValue(field.name, newList);
                        }} 
                      />
                    </div>

                  </div>
                </div>
              );
            }}
          >
            {/* 上传按钮 UI：大加号 + 文字 */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#4E5969',
              height: '100%'
            }}>
              <IconPlus style={{ fontSize: 24, color: '#86909c', marginBottom: 4 }} />
              {/* 可选：如果你想完全像朋友圈，可以把文字去掉，只留一个大加号 */}
            </div>
          </Upload>
        </Form.Item>
      );
    }

    const defaultRules = [{ 
        required: field.required, 
        message: `${field.label}是必填项`,
        type: field.type === 'number' ? 'number' : 'string'
    }];

    switch (field.type) {
      case 'text':
        return (
          <Form.Item key={field.name} {...commonProps} rules={defaultRules as any}>
            <Input placeholder={field.placeholder} maxLength={field.maxLength} disabled={field.disabled} />
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item key={field.name} {...commonProps} rules={defaultRules as any}>
            <Input type="number" placeholder={field.placeholder} disabled={field.disabled} />
          </Form.Item>
        );
      case 'textarea':
        return (
          <Form.Item key={field.name} {...commonProps} rules={defaultRules as any}>
            <Input.TextArea rows={4} placeholder={field.placeholder} maxLength={field.maxLength} disabled={field.disabled} />
          </Form.Item>
        );
      case 'select':
        return (
          <Form.Item key={field.name} {...commonProps} rules={defaultRules as any}>
            <Select placeholder={field.placeholder} disabled={field.disabled}>
              {field.options?.map((option) => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
          </Form.Item>
        );
      default:
        return null;
    }
  };

  // 修复 loading 变量报错：现在 loading 是组件内的 state，不会报错了
  if (loading && !schema) return <div style={{textAlign: 'center', padding: 20}}><Spin /></div>;
  if (!schema) return <Card>配置不存在</Card>;

  return (
    <div style={{ padding: '0 12px' }}>
      <Title heading={4} style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>{schema.title}</Title>
      <Form form={form} layout="vertical" onSubmit={handleSubmit}>
        {schema.fields.map((field) => renderField(field))}
        
        <div style={{ 
          marginTop: 32, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #f2f3f5',
          paddingTop: 24
        }}>
          <Button onClick={onCancel} style={{ padding: '0 24px' }}>取消</Button>
          <Button onClick={() => { form.resetFields(); setImageFileList([]); setVideoFileList([]); }} style={{ padding: '0 24px' }}>
            重置
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} size="large" style={{ padding: '0 32px' }}>
            {okText}
          </Button>
        </div>
      </Form>

      {/* 图片预览组件 */}
      <Image.Preview
        visible={previewVisible}
        src={previewImageSrc}
        onVisibleChange={setPreviewVisible}
      />

      {/* 视频预览弹窗 - 修复 bodyStyle 报错，使用 style 控制 */}
      <Modal
        title={null} // 朋友圈看视频通常没有标题栏
        visible={videoModalVisible}
        footer={null}
        closable={false} // 点击遮罩关闭即可，更沉浸
        onCancel={() => setVideoModalVisible(false)}
        style={{ width: 'auto', background: 'transparent', boxShadow: 'none' }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: 'transparent' 
        }}>
          <video 
            src={previewVideoSrc} 
            controls 
            autoPlay 
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '80vh', 
              borderRadius: 8, 
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              outline: 'none'
            }} 
          />
        </div>
      </Modal>
    </div>
  );
};

export default DynamicForm;