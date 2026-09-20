import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  name: text('name').notNull().default('Salon User'),
  email: text('email').notNull(),
  role: text('role').notNull().default('OWNER'), // OWNER, MANAGER, STAFF
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Salon Settings
export const salonSettings = pgTable('salon_settings', {
  id: serial('id').primaryKey(),
  salonName: text('salon_name').notNull().default('Veloura 🎀'),
  tagline: text('tagline').default(''),
  phone: text('phone').default(''),
  email: text('email').default(''),
  address: text('address').default(''),
  gstNumber: text('gst_number').default(''),
  gstRate: integer('gst_rate').notNull().default(18), // 18% GST standard in India
  taxEnabled: boolean('tax_enabled').notNull().default(true),
  currency: text('currency').notNull().default('INR'),
  invoicePrefix: text('invoice_prefix').notNull().default('VEL'),
  openingTime: text('opening_time').notNull().default('09:00'),
  closingTime: text('closing_time').notNull().default('21:00'),
  workingDays: text('working_days').notNull().default('Mon,Tue,Wed,Thu,Fri,Sat,Sun'),
  defaultAppointmentDuration: integer('default_appointment_duration').notNull().default(30),
  loyaltyPointsPer100: integer('loyalty_points_per_100').notNull().default(1),
  loyaltyPointValueInr: integer('loyalty_point_value_inr').notNull().default(1),
  loyaltyMinRedemptionPoints: integer('loyalty_min_redemption_points').notNull().default(50),
  acceptedPaymentMethods: text('accepted_payment_methods').notNull().default('Cash,UPI,Card,Bank Transfer'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. Service Categories
export const serviceCategories = pgTable('service_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Services (The 31 predefined Indian Salon Services)
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => serviceCategories.id),
  categoryName: text('category_name').notNull(),
  name: text('name').notNull(),
  price: integer('price').notNull(), // In INR ₹
  duration: integer('duration').notNull(), // In minutes
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. Customers
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  dob: text('dob'), // YYYY-MM-DD
  gender: text('gender'), // Female, Male, Other
  address: text('address'),
  notes: text('notes'),
  preferences: text('preferences'),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  totalVisits: integer('total_visits').notNull().default(0),
  totalSpent: integer('total_spent').notNull().default(0),
  lastVisit: timestamp('last_visit'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 6. Staff
export const staff = pgTable('staff', {
  id: serial('id').primaryKey(),
  staffCode: text('staff_code'),
  name: text('name').notNull(),
  gender: text('gender').notNull().default('Female'),
  phone: text('phone').notNull(),
  email: text('email'),
  role: text('role').notNull().default('Stylist'),
  specialization: text('specialization').notNull().default('Hair & Styling'),
  joiningDate: text('joining_date').notNull().default('2025-01-01'),
  salary: integer('salary').notNull().default(20000), // In INR ₹
  commissionPercentage: integer('commission_percentage').notNull().default(10), // %
  workingDays: text('working_days').notNull().default('Mon,Tue,Wed,Thu,Fri,Sat'),
  workingHours: text('working_hours').notNull().default('10:00 AM - 07:00 PM'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 7. Staff Schedules
export const staffSchedules = pgTable('staff_schedules', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => staff.id).notNull(),
  dayOfWeek: text('day_of_week').notNull(), // Monday, Tuesday, etc.
  startTime: text('start_time').notNull().default('10:00'),
  endTime: text('end_time').notNull().default('19:00'),
  isWorking: boolean('is_working').notNull().default(true),
});

// 8. Appointments
export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  bookingCode: text('booking_code'),
  source: text('source').notNull().default('Walk-in'),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  staffId: integer('staff_id').references(() => staff.id).notNull(),
  staffName: text('staff_name').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  startTime: text('start_time').notNull(), // HH:MM
  endTime: text('end_time').notNull(), // HH:MM
  status: text('status').notNull().default('Booked'), // Booked, Confirmed, In Progress, Completed, Cancelled, No Show
  paymentStatus: text('payment_status').notNull().default('Pending'), // Pending, Partial, Paid
  notes: text('notes'),
  totalAmount: integer('total_amount').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 9. Appointment Services
export const appointmentServices = pgTable('appointment_services', {
  id: serial('id').primaryKey(),
  appointmentId: integer('appointment_id').references(() => appointments.id).notNull(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  serviceName: text('service_name').notNull(),
  price: integer('price').notNull(),
  duration: integer('duration').notNull(),
});

// 10. Invoices
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(), // e.g. INV-2026-0001
  appointmentId: integer('appointment_id').references(() => appointments.id),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  staffId: integer('staff_id').references(() => staff.id),
  staffName: text('staff_name'),
  date: text('date').notNull(), // YYYY-MM-DD
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  discountReason: text('discount_reason'),
  taxRate: integer('tax_rate').notNull().default(18),
  taxAmount: integer('tax_amount').notNull().default(0),
  grandTotal: integer('grand_total').notNull(),
  paidAmount: integer('paid_amount').notNull().default(0),
  balanceAmount: integer('balance_amount').notNull().default(0),
  status: text('status').notNull().default('Pending'), // Paid, Partial, Pending
  paymentMethod: text('payment_method').default('UPI'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 11. Invoice Items
export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => invoices.id).notNull(),
  serviceId: integer('service_id').references(() => services.id),
  serviceName: text('service_name').notNull(),
  staffId: integer('staff_id').references(() => staff.id),
  staffName: text('staff_name'),
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull().default(1),
  total: integer('total').notNull(),
});

// 12. Payments
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  paymentNumber: text('payment_number').notNull().unique(), // PAY-2026-0001
  invoiceId: integer('invoice_id').references(() => invoices.id).notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  customerName: text('customer_name').notNull(),
  amount: integer('amount').notNull(),
  paymentMethod: text('payment_method').notNull(), // Cash, UPI, Card, Bank Transfer, Other
  status: text('status').notNull().default('Paid'), // Paid, Partial, Pending, Refunded
  transactionReference: text('transaction_reference'),
  notes: text('notes'),
  date: text('date').notNull(), // YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. Expenses
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(), // Rent, Electricity, Salary, Products, Maintenance, Marketing, Equipment, Other
  amount: integer('amount').notNull(), // In INR ₹
  date: text('date').notNull(), // YYYY-MM-DD
  paymentMethod: text('payment_method').notNull().default('Bank Transfer'),
  description: text('description'),
  addedBy: text('added_by').notNull().default('Owner'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 14. Suppliers
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone').notNull(),
  email: text('email'),
  address: text('address'),
  gstNumber: text('gst_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 15. Inventory Products
export const inventoryProducts = pgTable('inventory_products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // Hair Care, Skin Care, Consumables, Tools, Chemicals, Retail
  sku: text('sku').notNull().unique(),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  supplierName: text('supplier_name'),
  purchasePrice: integer('purchase_price').notNull(), // ₹
  sellingPrice: integer('selling_price').notNull(), // ₹
  currentStock: integer('current_stock').notNull().default(0),
  minStockLevel: integer('min_stock_level').notNull().default(5),
  unit: text('unit').notNull().default('Units'), // Units, ml, Bottles, etc.
  expiryDate: text('expiry_date'), // YYYY-MM-DD
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 16. Inventory Movements
export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => inventoryProducts.id).notNull(),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(), // positive or negative
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  type: text('type').notNull(), // PURCHASE, SALE, USAGE, ADJUSTMENT, RETURN, WASTAGE
  reason: text('reason'),
  performedBy: text('performed_by').notNull().default('System'),
  date: text('date').notNull(), // YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow(),
});

// 17. Packages
export const packages = pgTable('packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // ₹
  validityDays: integer('validity_days').notNull().default(90),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 18. Package Services
export const packageServices = pgTable('package_services', {
  id: serial('id').primaryKey(),
  packageId: integer('package_id').references(() => packages.id).notNull(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  serviceName: text('service_name').notNull(),
  sessionsCount: integer('sessions_count').notNull().default(1),
});

// 19. Customer Packages
export const customerPackages = pgTable('customer_packages', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  customerName: text('customer_name').notNull(),
  packageId: integer('package_id').references(() => packages.id).notNull(),
  packageName: text('package_name').notNull(),
  purchaseDate: text('purchase_date').notNull(), // YYYY-MM-DD
  expiryDate: text('expiry_date').notNull(), // YYYY-MM-DD
  pricePaid: integer('price_paid').notNull(),
  totalServices: integer('total_services').notNull(),
  servicesUsed: integer('services_used').notNull().default(0),
  servicesRemaining: integer('services_remaining').notNull(),
  status: text('status').notNull().default('Active'), // Active, Expired, Completed
  createdAt: timestamp('created_at').defaultNow(),
});

// 20. Offers
export const offers = pgTable('offers', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type').notNull(), // PERCENTAGE or FIXED_INR
  discountValue: integer('discount_value').notNull(),
  minBillAmount: integer('min_bill_amount').default(0),
  serviceCategory: text('service_category').default('ALL'),
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').notNull(), // YYYY-MM-DD
  isActive: boolean('is_active').notNull().default(true),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 21. Loyalty Accounts
export const loyaltyAccounts = pgTable('loyalty_accounts', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull().unique(),
  customerName: text('customer_name').notNull(),
  currentPoints: integer('current_points').notNull().default(0),
  totalPointsEarned: integer('total_points_earned').notNull().default(0),
  totalPointsRedeemed: integer('total_points_redeemed').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 22. Loyalty Transactions
export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  type: text('type').notNull(), // EARNED, REDEEMED, ADJUSTED
  points: integer('points').notNull(),
  invoiceId: integer('invoice_id').references(() => invoices.id),
  description: text('description').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow(),
});

// 23. Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // APPOINTMENT, PAYMENT_PENDING, LOW_STOCK, CANCELLATION, SYSTEM
  title: text('title').notNull(),
  message: text('message').notNull(),
  referenceId: text('reference_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 24. Activity Logs
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userName: text('user_name').notNull().default('System'),
  userRole: text('user_role').notNull().default('OWNER'),
  action: text('action').notNull(),
  description: text('description').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  createdAt: timestamp('created_at').defaultNow(),
});
