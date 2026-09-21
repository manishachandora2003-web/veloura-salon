export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface SalonSettings {
  id: number;
  salonName: string;
  tagline: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  gstRate: number;
  taxRate?: number;
  taxEnabled: boolean;
  currency: string;
  invoicePrefix: string;
  openingTime: string;
  closingTime: string;
  workingDays: string;
  defaultAppointmentDuration: number;
  loyaltyPointsPer100: number;
  loyaltyPointValueInr: number;
  loyaltyMinRedemptionPoints: number;
  acceptedPaymentMethods: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
}

export interface Service {
  id: number;
  categoryId: number | null;
  categoryName: string;
  name: string;
  price: number;
  duration: number; // in mins
  description: string | null;
  isActive: boolean;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  notes: string | null;
  preferences: string | null;
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string | null;
  createdAt: string;
}

export interface StaffMember {
  id: number;
  staffCode?: string | null;
  name: string;
  gender?: 'Male' | 'Female' | string;
  phone: string;
  email: string | null;
  role: string;
  specialization: string;
  joiningDate: string;
  salary: number;
  commissionPercentage: number;
  workingDays: string;
  workingHours: string;
  isActive: boolean;
  appointmentCount?: number;
  revenueGenerated?: number;
  commissionEarned?: number;
}

export interface AppointmentServiceItem {
  id?: number;
  serviceId: number;
  serviceName: string;
  price: number;
  duration: number;
}

export interface Appointment {
  id: number;
  bookingCode?: string | null;
  source?: 'Online Booking' | 'Walk-in' | 'Phone Call' | string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  staffId: number;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'Booked' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  notes: string | null;
  totalAmount: number;
  whatsappStatus?: 'WhatsApp Sent' | 'WhatsApp Failed' | 'WhatsApp Not Configured' | 'Invalid Number' | 'WhatsApp Pending' | string;
  whatsappMessageId?: string | null;
  whatsappError?: string | null;
  whatsappSentAt?: string | null;
  services?: AppointmentServiceItem[];
  createdAt: string;
}

export interface InvoiceItem {
  id?: number;
  invoiceId?: number;
  serviceId?: number | null;
  serviceName: string;
  staffId?: number | null;
  staffName?: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  appointmentId: number | null;
  customerId: number;
  customerName: string;
  customerPhone: string;
  staffId: number | null;
  staffName: string | null;
  date: string;
  subtotal: number;
  discount: number;
  discountReason: string | null;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'Pending' | 'Partial' | 'Paid';
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
  items?: InvoiceItem[];
}

export interface Payment {
  id: number;
  paymentNumber: string;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  transactionReference: string | null;
  notes: string | null;
  date: string;
  createdAt: string;
}

export interface Expense {
  id: number;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string | null;
  notes?: string | null;
  vendorName?: string | null;
  addedBy: string;
  createdAt: string;
}

export interface InventoryProduct {
  id: number;
  name: string;
  category: string;
  sku: string;
  supplierId: number | null;
  supplierName: string | null;
  purchasePrice: number;
  costPrice?: number;
  sellingPrice: number;
  currentStock: number;
  minStockLevel: number;
  minimumStock?: number;
  unit: string;
  expiryDate: string | null;
  isActive: boolean;
}

export interface InventoryMovement {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  type: string;
  reason: string | null;
  performedBy: string;
  date: string;
  createdAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  notes: string | null;
}

export interface Package {
  id: number;
  name: string;
  description: string | null;
  price: number;
  validityDays: number;
  isActive: boolean;
  services?: { id: number; serviceId: number; serviceName: string; sessionsCount: number }[];
}

export interface Offer {
  id: number;
  title: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_INR';
  discountValue: number;
  minBillAmount: number;
  serviceCategory: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description: string | null;
}

export interface LoyaltyAccount {
  id: number;
  customerId: number;
  customerName: string;
  currentPoints: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
}

export interface LoyaltyTransaction {
  id: number;
  customerId: number;
  type: 'EARNED' | 'REDEEMED' | 'ADJUSTMENT';
  points: number;
  invoiceId: number | null;
  description: string;
  date: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLogItem {
  id: number;
  userName: string;
  userRole: string;
  action: string;
  description: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export interface DashboardData {
  todayAppointmentsCount: number;
  todayAppointments: Appointment[];
  todayRevenue: number;
  todayExpenses: number;
  netRevenue: number;
  pendingPayments: number;
  totalCustomers: number;
  activeStaff: number;
  lowStockCount: number;
  lowStockItems: InventoryProduct[];
  allTimeRevenue: number;
  recentInvoices: Invoice[];
}

export interface ReportsData {
  totalRevenue: number;
  totalExpenses: number;
  netRevenue: number;
  paymentMethods: Record<string, { count: number; total: number }>;
  serviceRankings: { service: string; bookings: number; revenue: number }[];
  staffReport: { staff: string; role: string; appointments: number; revenue: number; commission: number }[];
  expensesByCategory: Record<string, number>;
  totalStockValue: number;
  lowStockCount: number;
  totalCustomers: number;
}
