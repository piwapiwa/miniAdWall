import { useState, useEffect } from 'react'
import { Form, Input, Select, Button, Upload, Space, Card, Typography, Message } from '@arco-design/web-react'
import { IconUpload } from '@arco-design/web-react/icon'
import axios from 'axios'
import { FormSchema, FormField } from '../types'

const { Title} = Typography
const { Option } = Select

interface DynamicFormProps {
  schemaId?: string;
  onSubmit?: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
}

// 显式定义类型为 Record<string, any>
const DEFAULT_DATA: Record<string, any> = {};

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  schemaId = 'ad-form', 
  onSubmit,
  initialData = DEFAULT_DATA 
}) => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  
  // 独立管理图片和视频的上传列表状态
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [videoFileList, setVideoFileList] = useState<any[]>([]);

  useEffect(() => {
    const fetchFormSchema = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/form-schema/${schemaId}`);
        setSchema(response.data);
        
        // 回填表单数据
        if (initialData) {
          form.setFieldsValue(initialData);
          
          // 回填图片列表（用于显示已有的图片）
          if (initialData.imageUrls && Array.isArray(initialData.imageUrls)) {
            const urls = initialData.imageUrls as string[];
            setImageFileList(urls.map((url, index) => ({
              uid: `img-${index}`,
              name: `图片${index + 1}`,
              status: 'done',
              url: url
            })));
          }
          
          // 回填视频列表
          if (initialData.videoUrls && Array.isArray(initialData.videoUrls)) {
            const urls = initialData.videoUrls as string[];
            setVideoFileList(urls.map((url, index) => ({
              uid: `vid-${index}`,
              name: `视频${index + 1}`,
              status: 'done',
              url: url
            })));
          }
        }
      } catch (error) {
        console.error('获取表单配置失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFormSchema();
  }, [schemaId, form, initialData]);

  const handleUpload = async (option: any) => {
    const { file, onSuccess, onError } = option;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 构造成功的文件对象
      const fileUrl = response.data.url;
      onSuccess({ url: fileUrl });
      
      return { url: fileUrl };
    } catch (error) {
      Message.error('文件上传失败');
      onError(error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const finalValues = {
        ...values,
        imageUrls: imageFileList
          .filter((f: any) => f.status === 'done')
          .map((f: any) => f.response?.url || f.url),
        videoUrls: videoFileList
          .filter((f: any) => f.status === 'done')
          .map((f: any) => f.response?.url || f.url),
      };

      if (onSubmit) {
        // 等待父组件处理，如果父组件 throw error，这里会跳到 catch
        await onSubmit(finalValues);
      }
      
      // 只有上面没有报错，才会执行到这里
      form.resetFields();
      setImageFileList([]);
      setVideoFileList([]);
    } catch (error) {
      // 捕获到错误，不执行 resetFields，表单内容得以保留
      console.error('提交过程中发生错误，表单未清空');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    // 定义通用的校验规则
    const rules = [{ 
      required: field.required, 
      message: `${field.label}是必填项`,
      // 对于数组类型（如多图），校验数组长度
      type: field.multiple ? 'array' : 'string' 
    }];

    const commonProps = {
      field: field.name,
      label: field.label,
      required: field.required,
      rules: rules // 应用规则
    };

    if (field.type === 'file') {
      const isImage = field.name.toLowerCase().includes('image');
      const currentFileList = isImage ? imageFileList : videoFileList;
      const setFileList = isImage ? setImageFileList : setVideoFileList;
      const acceptType = isImage ? 'image/*' : 'video/*';
      const tipText = isImage ? '点击上传图片' : '点击上传视频';

      return (
        <Form.Item 
          key={field.name} 
          label={field.label} 
          field={field.name} // 必须绑定 field 才能触发 Form 的校验
          required={field.required}
          rules={[{ 
            required: field.required, 
            message: `请至少上传一个${field.label}`,
            validator: (value, cb) => {
              if (field.required) {
                if (!value || value.length === 0) {
                  return cb(`请至少上传一个${field.label}`);
                }
              }
              cb();
            }
          }]}
        >
          <Upload
            multiple={field.multiple}
            limit={10}
            listType={isImage ? "picture-card" : "text"}
            accept={acceptType}
            fileList={currentFileList}
            customRequest={handleUpload}
            onChange={(fileList) => {
              setFileList(fileList);
              
              const successUrls = fileList
                .filter(f => f.status === 'done')
                .map(f => (f.response as any)?.url || f.url);
              
              // 关键：手动触发字段值的更新和校验
              form.setFieldValue(field.name, successUrls);
              // 触发表单校验，消除红字报错
              form.validate([field.name]); 
            }}
            onRemove={(file) => {
              const newList = currentFileList.filter(item => item.uid !== file.uid);
              setFileList(newList);
              const successUrls = newList
                .filter(f => f.status === 'done')
                .map(f => (f.response as any)?.url || f.url);
              
              form.setFieldValue(field.name, successUrls);
              form.validate([field.name]);
            }}
          >
            {isImage ? (
              <div style={{ textAlign: 'center' }}>
                <IconUpload style={{ fontSize: 20 }}/>
                <div style={{ marginTop: 8, fontSize: 12 }}>上传</div>
              </div>
            ) : (
              <Button icon={<IconUpload />}>{tipText}</Button>
            )}
          </Upload>
        </Form.Item>
      );
    }

    // 其他类型保持不变...
    switch (field.type) {
      case 'text':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Input placeholder={field.placeholder} maxLength={field.maxLength} />
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Input type="number" placeholder={field.placeholder} />
          </Form.Item>
        );
      case 'textarea':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Input.TextArea rows={4} placeholder={field.placeholder} maxLength={field.maxLength} />
          </Form.Item>
        );
      case 'select':
        return (
          <Form.Item key={field.name} {...commonProps}>
            <Select placeholder={field.placeholder}>
              {field.options?.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
      default:
        return null;
    }
  };

  if (loading && !schema) return <Card>加载中...</Card>;
  if (!schema) return <Card>配置不存在</Card>;

  return (
    <Card>
      <Title heading={3}>{schema.title}</Title>
      <Form form={form} layout="vertical" onSubmit={handleSubmit}>
        {schema.fields.map((field) => renderField(field))}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>提交</Button>
            <Button onClick={() => {
              form.resetFields();
              setImageFileList([]);
              setVideoFileList([]);
            }}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default DynamicForm;