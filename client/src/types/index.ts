// 仪表盘统计数据类型
export interface DashboardStats {
  total: number;
  active: number;
  totalClicks: number;
  avgPrice: number;
  trend: { title: string; clicks: number }[];
}

// 广告数据类型
export interface Ad {
  id: number;
  title: string;
  author: string; 
  description: string;
  imageUrls: string[];
  videoUrls: string[];
  targetUrl: string;
  price: number;
  clicks: number;
  status: 'Active' | 'Paused' | 'Draft' | 'Rejected';
  createdAt: Date;
  updatedAt: Date;
  userId?: number;
}

// 广告列表状态类型 (Store)
export interface AdState {
  ads: Ad[];
  stats: DashboardStats | null;
  authors: { username: string; role: string }[];
  loading: boolean;
  error: string | null;
  selectedAd: Ad | null;
  filter: { search: string; status: string }; 
  
  // Actions
  setFilter: (filter: { search: string; status: string }) => void;
  fetchAds: (params?: { search?: string; status?: string; mine?: string; targetUser?: string }) => Promise<void>;
  fetchStats: (params?: { mine?: string }) => Promise<void>;
  fetchAuthors: () => Promise<void>;
  
  fetchAdById: (id: number) => Promise<Ad | null>;
  createAd: (ad: any) => Promise<Ad>;
  updateAd: (id: number, ad: Partial<Ad>) => Promise<Ad>;
  deleteAd: (id: number) => Promise<void>;
  incrementClicks: (id: number) => Promise<void>;
}

// 表单字段类型
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'file' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  maxLength?: number;
  minLength?: number;
  multiple?: boolean;
  // 🚀 新增：支持禁用状态
  disabled?: boolean; 
}

export interface FormSchema {
  id: string;
  title: string;
  fields: FormField[];
}