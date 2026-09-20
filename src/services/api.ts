import {
  SalonSettings,
  Service,
  ServiceCategory,
  Customer,
  StaffMember,
  Appointment,
  Invoice,
  Payment,
  Expense,
  InventoryProduct,
  InventoryMovement,
  Supplier,
  Package,
  Offer,
  LoyaltyAccount,
  LoyaltyTransaction,
  NotificationItem,
  ActivityLogItem,
  DashboardData,
  ReportsData,
} from '../types.ts';

const API_BASE = '/api';

let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('veloura_auth_token') : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('veloura_auth_token', token);
    else localStorage.removeItem('veloura_auth_token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken && typeof window !== 'undefined') {
    authToken = localStorage.getItem('veloura_auth_token');
  }
  return authToken;
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-veloura-token'] = token;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error! Status: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Authentication & Access Control
  adminLogin: (credentials: { username?: string; password?: string; pin?: string }) =>
    fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then((r) => handleResponse<{ success: boolean; token: string; role: string; user: any }>(r)),

  staffLogin: (credentials: { staffCode: string; passcode?: string }) =>
    fetch(`${API_BASE}/auth/staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then((r) => handleResponse<{ success: boolean; token: string; role: string; staff: any }>(r)),

  verifyAuth: () =>
    fetch(`${API_BASE}/auth/verify`, {
      headers: getHeaders(),
    }).then((r) => handleResponse<{ valid: boolean; role: 'ADMIN' | 'STAFF' | 'ANONYMOUS'; user?: any; staff?: any }>(r)),

  // Public Staff for Customers
  getPublicStaff: () => fetch(`${API_BASE}/staff/public`).then((r) => handleResponse<Partial<StaffMember>[]>(r)),

  // Staff Portal Private Operations
  getStaffMyAppointments: (staffId?: number) =>
    fetch(`${API_BASE}/staff/my-appointments${staffId ? `?staffId=${staffId}` : ''}`, {
      headers: getHeaders(),
    }).then((r) => handleResponse<Appointment[]>(r)),

  staffBookForClient: (data: {
    customerId?: number;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    serviceId: number;
    staffId?: number;
    date: string;
    startTime: string;
    notes?: string;
  }) =>
    fetch(`${API_BASE}/staff/book-for-client`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    }).then((r) => handleResponse<{ success: boolean; bookingCode: string; appointment: Appointment; service: Service; staff: StaffMember }>(r)),

  updateStaffAppointmentStatus: (id: number, status: string) =>
    fetch(`${API_BASE}/staff/appointments/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status }),
    }).then((r) => handleResponse<{ success: boolean; appointment: Appointment }>(r)),

  // Demo Data Management
  loadDemoData: () => fetch(`${API_BASE}/demo/load`, { method: 'POST', headers: getHeaders() }).then(handleResponse<{ success: boolean; message: string }>),
  clearDemoData: () => fetch(`${API_BASE}/demo/clear`, { method: 'POST', headers: getHeaders() }).then(handleResponse<{ success: boolean; message: string }>),

  // Dashboard
  getDashboard: () => fetch(`${API_BASE}/dashboard`, { headers: getHeaders() }).then((r) => handleResponse<DashboardData>(r)),

  // Salon Settings
  getSettings: () => fetch(`${API_BASE}/settings`, { headers: getHeaders() }).then((r) => handleResponse<SalonSettings>(r)),
  updateSettings: (data: Partial<SalonSettings>) =>
    fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    }).then((r) => handleResponse<SalonSettings>(r)),

  // Services & Categories
  getServices: () => fetch(`${API_BASE}/services`).then((r) => handleResponse<Service[]>(r)),
  createService: (data: Partial<Service>) =>
    fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Service>(r)),
  updateService: (id: number, data: Partial<Service>) =>
    fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Service>(r)),
  deleteService: (id: number) => fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' }).then((r) => handleResponse<{ success: boolean }>(r)),
  getCategories: () => fetch(`${API_BASE}/categories`).then((r) => handleResponse<ServiceCategory[]>(r)),

  // Customers CRM
  getCustomers: (search?: string) =>
    fetch(`${API_BASE}/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`).then((r) => handleResponse<Customer[]>(r)),
  getCustomer: (id: number) =>
    fetch(`${API_BASE}/customers/${id}`).then((r) =>
      handleResponse<{
        customer: Customer;
        appointments: Appointment[];
        invoices: Invoice[];
        payments: Payment[];
        loyalty: LoyaltyAccount;
      }>(r)
    ),
  createCustomer: (data: Partial<Customer>) =>
    fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Customer>(r)),
  updateCustomer: (id: number, data: Partial<Customer>) =>
    fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Customer>(r)),
  deleteCustomer: (id: number) => fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' }).then((r) => handleResponse<{ success: boolean }>(r)),

  // Staff
  getStaff: () => fetch(`${API_BASE}/staff`).then((r) => handleResponse<StaffMember[]>(r)),
  createStaff: (data: Partial<StaffMember>) =>
    fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<StaffMember>(r)),
  updateStaff: (id: number, data: Partial<StaffMember>) =>
    fetch(`${API_BASE}/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<StaffMember>(r)),

  // Appointments
  getAppointments: (params?: { date?: string; startDate?: string; endDate?: string; staffId?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.append('date', params.date);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    if (params?.staffId) q.append('staffId', String(params.staffId));
    if (params?.status) q.append('status', params.status);
    return fetch(`${API_BASE}/appointments?${q.toString()}`).then((r) => handleResponse<Appointment[]>(r));
  },
  createAppointment: (data: {
    customerId: number;
    staffId: number;
    serviceIds: number[];
    date: string;
    startTime: string;
    notes?: string;
  }) =>
    fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Appointment>(r)),
  updateAppointment: (id: number, data: Partial<Appointment>) =>
    fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Appointment>(r)),
  deleteAppointment: (id: number) => fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' }).then((r) => handleResponse<{ success: boolean }>(r)),

  // Online Customer Booking & Availability
  getSlotAvailability: (params: {
    date: string;
    serviceId?: number;
    serviceIds?: number[];
    duration?: number;
    staffId?: number | 'ANY';
    staffAssignments?: Record<number, number | 'ANY'>;
  }) => {
    const q = new URLSearchParams();
    q.append('date', params.date);
    if (params.serviceIds && params.serviceIds.length > 0) {
      q.append('serviceIds', params.serviceIds.join(','));
    } else if (params.serviceId) {
      q.append('serviceId', String(params.serviceId));
    }
    if (params.duration) q.append('duration', String(params.duration));
    if (params.staffId) q.append('staffId', String(params.staffId));
    if (params.staffAssignments && Object.keys(params.staffAssignments).length > 0) {
      q.append('staffAssignments', JSON.stringify(params.staffAssignments));
    }
    return fetch(`${API_BASE}/appointments/availability?${q.toString()}`).then((r) =>
      handleResponse<{
        date: string;
        serviceDuration: number;
        eligibleStaffCount: number;
        slots: Array<{ time: string; label: string; available: boolean; freeStaffCount?: number; reason?: string }>;
      }>(r)
    );
  },
  bookOnline: (data: {
    serviceId?: number;
    serviceIds?: number[];
    staffId?: number | 'ANY';
    staffAssignments?: Record<number, number | 'ANY'>;
    date: string;
    startTime: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    notes?: string;
  }) =>
    fetch(`${API_BASE}/appointments/online-book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) =>
      handleResponse<{
        success: boolean;
        bookingCode: string;
        appointment: Appointment;
        services?: Service[];
        service?: Service;
        staff: StaffMember;
        serviceAssignments?: Array<{
          serviceId: number;
          serviceName: string;
          categoryName: string;
          price: number;
          duration: number;
          staffId: number;
          staffName: string;
          gender: string;
          role: string;
          specialization: string;
          isAutoAssigned: boolean;
        }>;
        allAssignedStaff?: StaffMember[];
      }>(r)
    ),
  lookupBooking: (params: { code?: string; phone?: string }) => {
    const q = new URLSearchParams();
    if (params.code) q.append('code', params.code);
    if (params.phone) q.append('phone', params.phone);
    return fetch(`${API_BASE}/appointments/lookup?${q.toString()}`).then((r) =>
      handleResponse<{
        success: boolean;
        bookings: Array<{
          id: number;
          bookingCode: string;
          customerName: string;
          customerPhone: string;
          date: string;
          startTime: string;
          endTime: string;
          staffName: string;
          status: string;
          paymentStatus: string;
          totalAmount: number;
          services: Array<{ serviceName: string; duration: number; price: number }>;
          serviceAssignments?: Array<{
            serviceId: number;
            serviceName: string;
            categoryName: string;
            price: number;
            duration: number;
            staffId: number;
            staffName: string;
            gender: string;
            role: string;
            specialization: string;
            isAutoAssigned: boolean;
          }>;
          notes?: string;
        }>;
      }>(r)
    );
  },

  // POS & Billing
  createBill: (data: {
    customerId?: number;
    customerName?: string;
    customerPhone?: string;
    items: Array<{ serviceId?: number; serviceName: string; staffId?: number; staffName?: string; price: number; quantity?: number }>;
    discount?: number;
    discountReason?: string;
    paidAmount?: number;
    paymentMethod?: string;
    appointmentId?: number;
    notes?: string;
  }) =>
    fetch(`${API_BASE}/pos/bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<{ invoice: Invoice; payment: Payment | null; totals: any }>(r)),

  // Invoices & Payments
  getInvoices: (status?: string, search?: string) => {
    const q = new URLSearchParams();
    if (status) q.append('status', status);
    if (search) q.append('search', search);
    return fetch(`${API_BASE}/invoices?${q.toString()}`).then((r) => handleResponse<Invoice[]>(r));
  },
  getInvoice: (id: number) =>
    fetch(`${API_BASE}/invoices/${id}`).then((r) =>
      handleResponse<{ invoice: Invoice; items: any[]; payments: Payment[]; salon: SalonSettings }>(r)
    ),
  payInvoice: (
    id: number,
    data: { amount: number; paymentMethod: string; transactionReference?: string; notes?: string }
  ) =>
    fetch(`${API_BASE}/invoices/${id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<{ invoice: Invoice; payment: Payment; message: string }>(r)),
  getPayments: () => fetch(`${API_BASE}/payments`).then((r) => handleResponse<Payment[]>(r)),

  // Expenses
  getExpenses: (params?: { category?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    return fetch(`${API_BASE}/expenses?${q.toString()}`).then((r) => handleResponse<Expense[]>(r));
  },
  createExpense: (data: Partial<Expense>) =>
    fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Expense>(r)),
  deleteExpense: (id: number) => fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' }).then((r) => handleResponse<{ success: boolean }>(r)),

  // Inventory
  getInventory: () => fetch(`${API_BASE}/inventory`).then((r) => handleResponse<InventoryProduct[]>(r)),
  createInventoryProduct: (data: Partial<InventoryProduct>) =>
    fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<InventoryProduct>(r)),
  recordStockMovement: (
    id: number,
    data: { quantity: number; type: string; reason?: string; performedBy?: string }
  ) =>
    fetch(`${API_BASE}/inventory/${id}/movement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<{ product: InventoryProduct; previousStock: number; newStock: number }>(r)),
  getInventoryMovements: () => fetch(`${API_BASE}/inventory/movements`).then((r) => handleResponse<InventoryMovement[]>(r)),

  // Suppliers
  getSuppliers: () => fetch(`${API_BASE}/suppliers`).then((r) => handleResponse<Supplier[]>(r)),
  createSupplier: (data: Partial<Supplier>) =>
    fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Supplier>(r)),

  // Packages & Offers
  getPackages: () => fetch(`${API_BASE}/packages`).then((r) => handleResponse<Package[]>(r)),
  createPackage: (data: any) =>
    fetch(`${API_BASE}/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Package>(r)),
  getOffers: () => fetch(`${API_BASE}/offers`).then((r) => handleResponse<Offer[]>(r)),
  createOffer: (data: Partial<Offer>) =>
    fetch(`${API_BASE}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Offer>(r)),

  // Loyalty
  getLoyalty: () =>
    fetch(`${API_BASE}/loyalty`).then((r) =>
      handleResponse<{ accounts: LoyaltyAccount[]; transactions: LoyaltyTransaction[]; settings: any }>(r)
    ),

  // Reports
  getReports: () => fetch(`${API_BASE}/reports`).then((r) => handleResponse<ReportsData>(r)),

  // Notifications & Activity Logs
  getNotifications: () => fetch(`${API_BASE}/notifications`).then((r) => handleResponse<NotificationItem[]>(r)),
  markNotificationRead: (id: number) =>
    fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT' }).then((r) => handleResponse<{ success: boolean }>(r)),
  markAllNotificationsRead: () =>
    fetch(`${API_BASE}/notifications/read-all`, { method: 'PUT' }).then((r) => handleResponse<{ success: boolean }>(r)),
  getActivityLogs: () => fetch(`${API_BASE}/activity-logs`).then((r) => handleResponse<ActivityLogItem[]>(r)),
};
