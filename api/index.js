var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/vercel.ts
import express from "express";

// src/server/api.ts
import { Router } from "express";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityLogs: () => activityLogs,
  appointmentServices: () => appointmentServices,
  appointments: () => appointments,
  customerPackages: () => customerPackages,
  customers: () => customers,
  expenses: () => expenses,
  inventoryMovements: () => inventoryMovements,
  inventoryProducts: () => inventoryProducts,
  invoiceItems: () => invoiceItems,
  invoices: () => invoices,
  loyaltyAccounts: () => loyaltyAccounts,
  loyaltyTransactions: () => loyaltyTransactions,
  notifications: () => notifications,
  offers: () => offers,
  packageServices: () => packageServices,
  packages: () => packages,
  payments: () => payments,
  salonSettings: () => salonSettings,
  serviceCategories: () => serviceCategories,
  services: () => services,
  staff: () => staff,
  staffSchedules: () => staffSchedules,
  suppliers: () => suppliers,
  users: () => users
});
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp
} from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  // Firebase Auth UID
  name: text("name").notNull().default("Salon User"),
  email: text("email").notNull(),
  role: text("role").notNull().default("OWNER"),
  // OWNER, MANAGER, STAFF
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var salonSettings = pgTable("salon_settings", {
  id: serial("id").primaryKey(),
  salonName: text("salon_name").notNull().default("Veloura \u{1F380} Luxury Salon & Spa"),
  tagline: text("tagline").default("Luxury Hair, Beauty & Wellness"),
  phone: text("phone").default("+91 98765 43210"),
  email: text("email").default("contact@veloura.in"),
  address: text("address").default("Indiranagar 100ft Road, Bengaluru, Karnataka 560038"),
  gstNumber: text("gst_number").default("29AAAAA0000A1Z5"),
  gstRate: integer("gst_rate").notNull().default(18),
  // 18% GST standard in India
  taxEnabled: boolean("tax_enabled").notNull().default(true),
  currency: text("currency").notNull().default("INR"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  openingTime: text("opening_time").notNull().default("09:00"),
  closingTime: text("closing_time").notNull().default("21:00"),
  workingDays: text("working_days").notNull().default("Mon,Tue,Wed,Thu,Fri,Sat,Sun"),
  defaultAppointmentDuration: integer("default_appointment_duration").notNull().default(30),
  loyaltyPointsPer100: integer("loyalty_points_per_100").notNull().default(1),
  loyaltyPointValueInr: integer("loyalty_point_value_inr").notNull().default(1),
  loyaltyMinRedemptionPoints: integer("loyalty_min_redemption_points").notNull().default(50),
  acceptedPaymentMethods: text("accepted_payment_methods").notNull().default("Cash,UPI,Card,Bank Transfer"),
  updatedAt: timestamp("updated_at").defaultNow()
});
var serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var services = pgTable("services", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => serviceCategories.id),
  categoryName: text("category_name").notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  // In INR ₹
  duration: integer("duration").notNull(),
  // In minutes
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  dob: text("dob"),
  // YYYY-MM-DD
  gender: text("gender"),
  // Female, Male, Other
  address: text("address"),
  notes: text("notes"),
  preferences: text("preferences"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  totalVisits: integer("total_visits").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  lastVisit: timestamp("last_visit"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  staffCode: text("staff_code"),
  name: text("name").notNull(),
  gender: text("gender").notNull().default("Female"),
  phone: text("phone").notNull(),
  email: text("email"),
  role: text("role").notNull().default("Stylist"),
  specialization: text("specialization").notNull().default("Hair & Styling"),
  joiningDate: text("joining_date").notNull().default("2025-01-01"),
  salary: integer("salary").notNull().default(2e4),
  // In INR ₹
  commissionPercentage: integer("commission_percentage").notNull().default(10),
  // %
  workingDays: text("working_days").notNull().default("Mon,Tue,Wed,Thu,Fri,Sat"),
  workingHours: text("working_hours").notNull().default("10:00 AM - 07:00 PM"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var staffSchedules = pgTable("staff_schedules", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  // Monday, Tuesday, etc.
  startTime: text("start_time").notNull().default("10:00"),
  endTime: text("end_time").notNull().default("19:00"),
  isWorking: boolean("is_working").notNull().default(true)
});
var appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  bookingCode: text("booking_code"),
  source: text("source").notNull().default("Walk-in"),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  staffName: text("staff_name").notNull(),
  date: text("date").notNull(),
  // YYYY-MM-DD
  startTime: text("start_time").notNull(),
  // HH:MM
  endTime: text("end_time").notNull(),
  // HH:MM
  status: text("status").notNull().default("Booked"),
  // Booked, Confirmed, In Progress, Completed, Cancelled, No Show
  paymentStatus: text("payment_status").notNull().default("Pending"),
  // Pending, Partial, Paid
  notes: text("notes"),
  totalAmount: integer("total_amount").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var appointmentServices = pgTable("appointment_services", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  serviceName: text("service_name").notNull(),
  price: integer("price").notNull(),
  duration: integer("duration").notNull()
});
var invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  // e.g. INV-2026-0001
  appointmentId: integer("appointment_id").references(() => appointments.id),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  staffId: integer("staff_id").references(() => staff.id),
  staffName: text("staff_name"),
  date: text("date").notNull(),
  // YYYY-MM-DD
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  discountReason: text("discount_reason"),
  taxRate: integer("tax_rate").notNull().default(18),
  taxAmount: integer("tax_amount").notNull().default(0),
  grandTotal: integer("grand_total").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  balanceAmount: integer("balance_amount").notNull().default(0),
  status: text("status").notNull().default("Pending"),
  // Paid, Partial, Pending
  paymentMethod: text("payment_method").default("UPI"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  serviceId: integer("service_id").references(() => services.id),
  serviceName: text("service_name").notNull(),
  staffId: integer("staff_id").references(() => staff.id),
  staffName: text("staff_name"),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  total: integer("total").notNull()
});
var payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentNumber: text("payment_number").notNull().unique(),
  // PAY-2026-0001
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  customerName: text("customer_name").notNull(),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  // Cash, UPI, Card, Bank Transfer, Other
  status: text("status").notNull().default("Paid"),
  // Paid, Partial, Pending, Refunded
  transactionReference: text("transaction_reference"),
  notes: text("notes"),
  date: text("date").notNull(),
  // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow()
});
var expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  // Rent, Electricity, Salary, Products, Maintenance, Marketing, Equipment, Other
  amount: integer("amount").notNull(),
  // In INR ₹
  date: text("date").notNull(),
  // YYYY-MM-DD
  paymentMethod: text("payment_method").notNull().default("Bank Transfer"),
  description: text("description"),
  addedBy: text("added_by").notNull().default("Owner"),
  createdAt: timestamp("created_at").defaultNow()
});
var suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  gstNumber: text("gst_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var inventoryProducts = pgTable("inventory_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  // Hair Care, Skin Care, Consumables, Tools, Chemicals, Retail
  sku: text("sku").notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  supplierName: text("supplier_name"),
  purchasePrice: integer("purchase_price").notNull(),
  // ₹
  sellingPrice: integer("selling_price").notNull(),
  // ₹
  currentStock: integer("current_stock").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull().default(5),
  unit: text("unit").notNull().default("Units"),
  // Units, ml, Bottles, etc.
  expiryDate: text("expiry_date"),
  // YYYY-MM-DD
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => inventoryProducts.id).notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  // positive or negative
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  type: text("type").notNull(),
  // PURCHASE, SALE, USAGE, ADJUSTMENT, RETURN, WASTAGE
  reason: text("reason"),
  performedBy: text("performed_by").notNull().default("System"),
  date: text("date").notNull(),
  // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow()
});
var packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  // ₹
  validityDays: integer("validity_days").notNull().default(90),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var packageServices = pgTable("package_services", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").references(() => packages.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  serviceName: text("service_name").notNull(),
  sessionsCount: integer("sessions_count").notNull().default(1)
});
var customerPackages = pgTable("customer_packages", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  customerName: text("customer_name").notNull(),
  packageId: integer("package_id").references(() => packages.id).notNull(),
  packageName: text("package_name").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  // YYYY-MM-DD
  expiryDate: text("expiry_date").notNull(),
  // YYYY-MM-DD
  pricePaid: integer("price_paid").notNull(),
  totalServices: integer("total_services").notNull(),
  servicesUsed: integer("services_used").notNull().default(0),
  servicesRemaining: integer("services_remaining").notNull(),
  status: text("status").notNull().default("Active"),
  // Active, Expired, Completed
  createdAt: timestamp("created_at").defaultNow()
});
var offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(),
  // PERCENTAGE or FIXED_INR
  discountValue: integer("discount_value").notNull(),
  minBillAmount: integer("min_bill_amount").default(0),
  serviceCategory: text("service_category").default("ALL"),
  startDate: text("start_date").notNull(),
  // YYYY-MM-DD
  endDate: text("end_date").notNull(),
  // YYYY-MM-DD
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});
var loyaltyAccounts = pgTable("loyalty_accounts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull().unique(),
  customerName: text("customer_name").notNull(),
  currentPoints: integer("current_points").notNull().default(0),
  totalPointsEarned: integer("total_points_earned").notNull().default(0),
  totalPointsRedeemed: integer("total_points_redeemed").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow()
});
var loyaltyTransactions = pgTable("loyalty_transactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  type: text("type").notNull(),
  // EARNED, REDEEMED, ADJUSTED
  points: integer("points").notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  description: text("description").notNull(),
  date: text("date").notNull(),
  // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow()
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  // APPOINTMENT, PAYMENT_PENDING, LOW_STOCK, CANCELLATION, SYSTEM
  title: text("title").notNull(),
  message: text("message").notNull(),
  referenceId: text("reference_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull().default("System"),
  userRole: text("user_role").notNull().default("OWNER"),
  action: text("action").notNull(),
  description: text("description").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  createdAt: timestamp("created_at").defaultNow()
});

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    let poolConfig;
    if (connectionString) {
      const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
      poolConfig = {
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15e3
      };
    } else {
      const isUnixSocket = process.env.SQL_HOST?.startsWith("/");
      const isLocal = !process.env.SQL_HOST || process.env.SQL_HOST.includes("localhost") || process.env.SQL_HOST.includes("127.0.0.1");
      poolConfig = {
        host: process.env.SQL_HOST,
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        ssl: isUnixSocket || isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15e3
      };
    }
    global._postgresPool = new Pool(poolConfig);
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/predefined-services.ts
var PREDEFINED_CATEGORIES = [
  { name: "HAIR", description: "Hair cuts, washes, spa, styling and treatments", displayOrder: 1 },
  { name: "FACIAL & SKIN", description: "Facials, cleanups, bleaches and glow treatments", displayOrder: 2 },
  { name: "WAXING", description: "Hygiene and gentle hair removal waxing services", displayOrder: 3 },
  { name: "THREADING", description: "Precision facial hair shaping and threading", displayOrder: 4 },
  { name: "MANICURE / PEDICURE", description: "Nail, hand and foot grooming and spa care", displayOrder: 5 },
  { name: "MAKEUP", description: "Party, engagement and bridal makeup artistry", displayOrder: 6 },
  { name: "OTHER", description: "Traditional head massage and saree draping services", displayOrder: 7 }
];
var PREDEFINED_SERVICES = [
  // 1. HAIR
  { name: "Haircut", category: "HAIR", price: 375, duration: 30, description: "Classic professional haircut with consultation and styling finish" },
  { name: "Hair Wash", category: "HAIR", price: 225, duration: 15, description: "Cleansing hair shampoo and deep conditioning wash" },
  { name: "Hair Spa", category: "HAIR", price: 1200, duration: 60, description: "Nourishing cream massage, steam, and scalp rejuvenation" },
  { name: "Hair Styling", category: "HAIR", price: 600, duration: 45, description: "Ironing, curls, or formal hair styling for events" },
  { name: "Blow Dry", category: "HAIR", price: 450, duration: 20, description: "Professional volume blow dry with heat protectant" },
  { name: "Hair Straightening", category: "HAIR", price: 3750, duration: 180, description: "Permanent chemical hair straightening and shine treatment" },
  { name: "Hair Smoothening", category: "HAIR", price: 5250, duration: 180, description: "Frizz-free silk smoothening treatment for manageable locks" },
  { name: "Hair Keratin Treatment", category: "HAIR", price: 6750, duration: 150, description: "Intensive protein infusion restoring damaged hair fibres" },
  // 2. FACIAL & SKIN
  { name: "Basic Facial", category: "FACIAL & SKIN", price: 900, duration: 45, description: "Hydrating cleanse, scrub, gentle steam, and soothing pack" },
  { name: "Fruit Facial", category: "FACIAL & SKIN", price: 1050, duration: 45, description: "Antioxidant-rich natural fruit extracts for instant skin glow" },
  { name: "Cleanup", category: "FACIAL & SKIN", price: 675, duration: 30, description: "Quick deep pore cleaning, blackhead removal and tone" },
  { name: "Gold Facial", category: "FACIAL & SKIN", price: 1800, duration: 60, description: "Luxury 24K gold dust brightening facial for bridal and festive radiance" },
  { name: "De-Tan Facial", category: "FACIAL & SKIN", price: 1200, duration: 45, description: "Sun tan removal and complexion evening facial treatment" },
  { name: "Bleach", category: "FACIAL & SKIN", price: 450, duration: 20, description: "Gentle facial bleaching for golden skin glow" },
  // 3. WAXING
  { name: "Full Arms Wax", category: "WAXING", price: 600, duration: 30, description: "Hygienic strip waxing for both arms including underarm touchup" },
  { name: "Full Legs Wax", category: "WAXING", price: 900, duration: 45, description: "Smooth waxing from thighs to ankles with post-wax oil" },
  { name: "Underarms Wax", category: "WAXING", price: 300, duration: 15, description: "Quick sensitive-area waxing" },
  { name: "Full Body Wax", category: "WAXING", price: 2250, duration: 90, description: "Comprehensive full body waxing package for complete smoothness" },
  // 4. THREADING
  { name: "Eyebrow Threading", category: "THREADING", price: 120, duration: 10, description: "Precision arch definition and threading" },
  { name: "Upper Lip Threading", category: "THREADING", price: 75, duration: 5, description: "Gentle hair removal above upper lip" },
  { name: "Full Face Threading", category: "THREADING", price: 375, duration: 20, description: "Complete facial threading including brows, forehead, chin, and sides" },
  // 5. MANICURE / PEDICURE
  { name: "Basic Manicure", category: "MANICURE / PEDICURE", price: 750, duration: 30, description: "Nail shaping, cuticle care, hand scrub and buffing" },
  { name: "Spa Manicure", category: "MANICURE / PEDICURE", price: 1200, duration: 45, description: "Aromatic soak, deep exfoliating scrub, hand massage and polish" },
  { name: "Basic Pedicure", category: "MANICURE / PEDICURE", price: 900, duration: 40, description: "Foot soak, calloused skin filing, nail shaping and moisturiser" },
  { name: "Spa Pedicure", category: "MANICURE / PEDICURE", price: 1350, duration: 60, description: "Herbal salt soak, foot scrub, relaxing calf massage and nail lacquer" },
  // 6. MAKEUP
  { name: "Basic Makeup", category: "MAKEUP", price: 2250, duration: 60, description: "Natural day makeup with flawless base and light eye accents" },
  { name: "Party Makeup", category: "MAKEUP", price: 3750, duration: 90, description: "Glamorous evening makeup with contour, shimmer and eyelashes" },
  { name: "Bridal Makeup", category: "MAKEUP", price: 12e3, duration: 180, description: "HD bridal makeup with pre-makeup hydration, contour, lashes & draping" },
  { name: "Engagement Makeup", category: "MAKEUP", price: 7500, duration: 120, description: "Long-lasting signature radiant makeover for engagement ceremony" },
  // 7. OTHER
  { name: "Head Massage", category: "OTHER", price: 525, duration: 20, description: "Stress-relieving warm Ayurvedic hair oil scalp and neck massage" },
  { name: "Saree Draping", category: "OTHER", price: 750, duration: 30, description: "Traditional or contemporary pleating and pinning of saree" }
];

// src/db/initial-staff.ts
var INITIAL_35_STAFF = [
  // 1. Makeup Artists — 5 (5% commission)
  {
    staffCode: "STF-MUA-001",
    name: "Ananya Sen",
    phone: "+91 98451 10001",
    email: "ananya.sen@veloura.in",
    role: "Makeup Artist",
    specialization: "Bridal & HD Makeup",
    joiningDate: "2024-01-15",
    salary: 32e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-MUA-002",
    name: "Rohan Kapoor",
    phone: "+91 98451 10002",
    email: "rohan.kapoor@veloura.in",
    role: "Makeup Artist",
    specialization: "Editorial & Party Glam",
    joiningDate: "2024-02-10",
    salary: 3e4,
    commissionPercentage: 5,
    workingDays: "Tue,Wed,Thu,Fri,Sat,Sun",
    workingHours: "11:00 AM - 08:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-MUA-003",
    name: "Shreya Mukherjee",
    phone: "+91 98451 10003",
    email: "shreya.mukherjee@veloura.in",
    role: "Makeup Artist",
    specialization: "Airbrush & Engagement Makeup",
    joiningDate: "2024-03-01",
    salary: 31e3,
    commissionPercentage: 5,
    workingDays: "Mon,Wed,Thu,Fri,Sat,Sun",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-MUA-004",
    name: "Kabir Mehta",
    phone: "+91 98451 10004",
    email: "kabir.mehta@veloura.in",
    role: "Makeup Artist",
    specialization: "Fashion Shoot & Contour Art",
    joiningDate: "2024-04-15",
    salary: 29e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Thu,Fri,Sat,Sun",
    workingHours: "11:30 AM - 08:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-MUA-005",
    name: "Tanvi Deshmukh",
    phone: "+91 98451 10005",
    email: "tanvi.deshmukh@veloura.in",
    role: "Makeup Artist",
    specialization: "Traditional & Festive Makeup",
    joiningDate: "2024-05-20",
    salary: 28e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Fri,Sat,Sun",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  // 2. Hair Stylists — 5 (5% commission)
  {
    staffCode: "STF-HRS-006",
    name: "Vikram Malhotra",
    phone: "+91 98452 20006",
    email: "vikram.malhotra@veloura.in",
    role: "Hair Stylist",
    specialization: "Precision Cuts & Fades",
    joiningDate: "2024-01-10",
    salary: 3e4,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    workingHours: "09:30 AM - 06:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-HRS-007",
    name: "Pooja Sharma",
    phone: "+91 98452 20007",
    email: "pooja.sharma@veloura.in",
    role: "Hair Stylist",
    specialization: "Keratin & Hair Botox",
    joiningDate: "2024-02-15",
    salary: 32e3,
    commissionPercentage: 5,
    workingDays: "Tue,Wed,Thu,Fri,Sat,Sun",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-HRS-008",
    name: "Arjun Nair",
    phone: "+91 98452 20008",
    email: "arjun.nair@veloura.in",
    role: "Hair Stylist",
    specialization: "Creative Hair Coloring & Balayage",
    joiningDate: "2024-03-20",
    salary: 31e3,
    commissionPercentage: 5,
    workingDays: "Mon,Wed,Thu,Fri,Sat,Sun",
    workingHours: "10:30 AM - 07:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-HRS-009",
    name: "Divya Joshi",
    phone: "+91 98452 20009",
    email: "divya.joshi@veloura.in",
    role: "Hair Stylist",
    specialization: "Smoothening & Hair Spa",
    joiningDate: "2024-04-05",
    salary: 29e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Thu,Fri,Sat,Sun",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-HRS-010",
    name: "Sameer Kulkarni",
    phone: "+91 98452 20010",
    email: "sameer.kulkarni@veloura.in",
    role: "Hair Stylist",
    specialization: "Texture Styling & Blow Dry",
    joiningDate: "2024-06-01",
    salary: 27e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Fri,Sat,Sun",
    workingHours: "11:00 AM - 08:00 PM",
    isActive: true
  },
  // 3. Waxing & Threading Specialists — 5 (5% commission)
  {
    staffCode: "STF-WTS-011",
    name: "Sunita Verma",
    phone: "+91 98453 30011",
    email: "sunita.verma@veloura.in",
    role: "Waxing & Threading Specialist",
    specialization: "Rica Waxing & Eyebrow Architecture",
    joiningDate: "2024-01-25",
    salary: 25e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-WTS-012",
    name: "Manpreet Kaur",
    phone: "+91 98453 30012",
    email: "manpreet.kaur@veloura.in",
    role: "Waxing & Threading Specialist",
    specialization: "Full Body Painless Waxing",
    joiningDate: "2024-02-18",
    salary: 26e3,
    commissionPercentage: 5,
    workingDays: "Tue,Wed,Thu,Fri,Sat,Sun",
    workingHours: "09:30 AM - 06:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-WTS-013",
    name: "Rajesh Guha",
    phone: "+91 98453 30013",
    email: "rajesh.guha@veloura.in",
    role: "Waxing & Threading Specialist",
    specialization: "Gentle Threading & Skin Prep",
    joiningDate: "2024-03-12",
    salary: 24e3,
    commissionPercentage: 5,
    workingDays: "Mon,Wed,Thu,Fri,Sat,Sun",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-WTS-014",
    name: "Rekha Patil",
    phone: "+91 98453 30014",
    email: "rekha.patil@veloura.in",
    role: "Waxing & Threading Specialist",
    specialization: "Facial Threading & Upper Lip",
    joiningDate: "2024-04-20",
    salary: 24e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Thu,Fri,Sat,Sun",
    workingHours: "10:30 AM - 07:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-WTS-015",
    name: "Deepak Chauhan",
    phone: "+91 98453 30015",
    email: "deepak.chauhan@veloura.in",
    role: "Waxing & Threading Specialist",
    specialization: "Sensitive Skin Strip Waxing",
    joiningDate: "2024-05-15",
    salary: 23e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Fri,Sat,Sun",
    workingHours: "11:00 AM - 08:00 PM",
    isActive: true
  },
  // 4. Fashion Stylists — 5 (5% commission)
  {
    staffCode: "STF-FSH-016",
    name: "Aakash Singhania",
    phone: "+91 98454 40016",
    email: "aakash.singhania@veloura.in",
    role: "Fashion Stylist",
    specialization: "Bridal Draping & Wardrobe Consulting",
    joiningDate: "2024-01-08",
    salary: 34e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-FSH-017",
    name: "Meera Nambiar",
    phone: "+91 98454 40017",
    email: "meera.nambiar@veloura.in",
    role: "Fashion Stylist",
    specialization: "Contemporary Saree Draping & Styling",
    joiningDate: "2024-02-22",
    salary: 33e3,
    commissionPercentage: 5,
    workingDays: "Tue,Wed,Thu,Fri,Sat,Sun",
    workingHours: "10:30 AM - 07:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-FSH-018",
    name: "Siddharth Roy",
    phone: "+91 98454 40018",
    email: "siddharth.roy@veloura.in",
    role: "Fashion Stylist",
    specialization: "Groom Aesthetics & Event Draping",
    joiningDate: "2024-03-18",
    salary: 32e3,
    commissionPercentage: 5,
    workingDays: "Mon,Wed,Thu,Fri,Sat,Sun",
    workingHours: "11:00 AM - 08:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-FSH-019",
    name: "Natasha D'Souza",
    phone: "+91 98454 40019",
    email: "natasha.dsouza@veloura.in",
    role: "Fashion Stylist",
    specialization: "Personal Styling & Lookbook Coordination",
    joiningDate: "2024-04-10",
    salary: 31e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Thu,Fri,Sat,Sun",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-FSH-020",
    name: "Varun Bhatia",
    phone: "+91 98454 40020",
    email: "varun.bhatia@veloura.in",
    role: "Fashion Stylist",
    specialization: "Fusion Outfits & Accessory Styling",
    joiningDate: "2024-05-02",
    salary: 3e4,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Fri,Sat,Sun",
    workingHours: "09:30 AM - 06:30 PM",
    isActive: true
  },
  // 5. Helpers — 5 (4% commission)
  {
    staffCode: "STF-HLP-021",
    name: "Ramesh Yadav",
    phone: "+91 98455 50021",
    email: "ramesh.yadav@veloura.in",
    role: "Helper",
    specialization: "Shampoo Station & Product Assist",
    joiningDate: "2024-01-05",
    salary: 18e3,
    commissionPercentage: 4,
    workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    workingHours: "09:00 AM - 06:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-HLP-022",
    name: "Geeta Devi",
    phone: "+91 98455 50022",
    email: "geeta.devi@veloura.in",
    role: "Helper",
    specialization: "Towels, Hygiene & Client Refreshments",
    joiningDate: "2024-01-20",
    salary: 18e3,
    commissionPercentage: 4,
    workingDays: "Tue,Wed,Thu,Fri,Sat,Sun",
    workingHours: "09:30 AM - 06:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-HLP-023",
    name: "Suresh Paswan",
    phone: "+91 98455 50023",
    email: "suresh.paswan@veloura.in",
    role: "Helper",
    specialization: "Equipment Sanitization & Floor Assist",
    joiningDate: "2024-02-14",
    salary: 17500,
    commissionPercentage: 4,
    workingDays: "Mon,Wed,Thu,Fri,Sat,Sun",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-HLP-024",
    name: "Lakshmi Bai",
    phone: "+91 98455 50024",
    email: "lakshmi.bai@veloura.in",
    role: "Helper",
    specialization: "Hair Wash Assist & Salon Maintenance",
    joiningDate: "2024-03-05",
    salary: 18500,
    commissionPercentage: 4,
    workingDays: "Mon,Tue,Thu,Fri,Sat,Sun",
    workingHours: "10:30 AM - 07:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-HLP-025",
    name: "Mohan Lal",
    phone: "+91 98455 50025",
    email: "mohan.lal@veloura.in",
    role: "Helper",
    specialization: "Inventory Unpacking & Client Assistance",
    joiningDate: "2024-04-01",
    salary: 17e3,
    commissionPercentage: 4,
    workingDays: "Mon,Tue,Wed,Fri,Sat,Sun",
    workingHours: "11:00 AM - 08:00 PM",
    isActive: true
  },
  // 6. Manicure & Pedicure Specialists — 5 (5% commission)
  {
    staffCode: "STF-MPS-026",
    name: "Priya Raghavan",
    phone: "+91 98456 60026",
    email: "priya.raghavan@veloura.in",
    role: "Manicure & Pedicure Specialist",
    specialization: "Gel Nails, Nail Art & Paraffin Spa",
    joiningDate: "2024-01-18",
    salary: 28e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-MPS-027",
    name: "Nitin Choudhary",
    phone: "+91 98456 60027",
    email: "nitin.choudhary@veloura.in",
    role: "Manicure & Pedicure Specialist",
    specialization: "Classic French Tips & Foot Reflexology",
    joiningDate: "2024-02-12",
    salary: 27e3,
    commissionPercentage: 5,
    workingDays: "Tue,Wed,Thu,Fri,Sat,Sun",
    workingHours: "09:30 AM - 06:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-MPS-028",
    name: "Neha Agarwal",
    phone: "+91 98456 60028",
    email: "neha.agarwal@veloura.in",
    role: "Manicure & Pedicure Specialist",
    specialization: "Spa Manicure & Pedicure Rejuvenation",
    joiningDate: "2024-03-08",
    salary: 29e3,
    commissionPercentage: 5,
    workingDays: "Mon,Wed,Thu,Fri,Sat,Sun",
    workingHours: "10:30 AM - 07:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-MPS-029",
    name: "Karan Bhatt",
    phone: "+91 98456 60029",
    email: "karan.bhatt@veloura.in",
    role: "Manicure & Pedicure Specialist",
    specialization: "Ingrown Nail Care & Cuticle Therapy",
    joiningDate: "2024-04-14",
    salary: 27500,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Thu,Fri,Sat,Sun",
    workingHours: "11:00 AM - 08:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-MPS-030",
    name: "Shalini Pillai",
    phone: "+91 98456 60030",
    email: "shalini.pillai@veloura.in",
    role: "Manicure & Pedicure Specialist",
    specialization: "Bridal Nail Extensions & Chrome Finishes",
    joiningDate: "2024-05-19",
    salary: 3e4,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Fri,Sat,Sun",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  // 7. Spa Specialists — 5 (5% commission)
  {
    staffCode: "STF-SPA-031",
    name: "Aditya Kashyap",
    phone: "+91 98457 70031",
    email: "aditya.kashyap@veloura.in",
    role: "Spa Specialist",
    specialization: "Ayurvedic Scalp Massage & Deep Tissue Relaxation",
    joiningDate: "2024-01-12",
    salary: 32e3,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-SPA-032",
    name: "Swati Hegde",
    phone: "+91 98457 70032",
    email: "swati.hegde@veloura.in",
    role: "Spa Specialist",
    specialization: "Aromatherapy & Herbal Hair Spa Infusions",
    joiningDate: "2024-02-20",
    salary: 31e3,
    commissionPercentage: 5,
    workingDays: "Tue,Wed,Thu,Fri,Sat,Sun",
    workingHours: "10:30 AM - 07:30 PM",
    isActive: true
  },
  {
    staffCode: "STF-SPA-033",
    name: "Nikhil Trivedi",
    phone: "+91 98457 70033",
    email: "nikhil.trivedi@veloura.in",
    role: "Spa Specialist",
    specialization: "Stress-Relief Head & Shoulder Therapy",
    joiningDate: "2024-03-15",
    salary: 3e4,
    commissionPercentage: 5,
    workingDays: "Mon,Wed,Thu,Fri,Sat,Sun",
    workingHours: "11:00 AM - 08:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-SPA-034",
    name: "Bhavna Goswami",
    phone: "+91 98457 70034",
    email: "bhavna.goswami@veloura.in",
    role: "Spa Specialist",
    specialization: "Detoxifying Scalp Steam & Moroccan Oil Spa",
    joiningDate: "2024-04-18",
    salary: 31500,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Thu,Fri,Sat,Sun",
    workingHours: "10:00 AM - 07:00 PM",
    isActive: true
  },
  {
    staffCode: "STF-SPA-035",
    name: "Tarun Somani",
    phone: "+91 98457 70035",
    email: "tarun.somani@veloura.in",
    role: "Spa Specialist",
    specialization: "Hot Oil Ayurvedic Head & Neck Massage",
    joiningDate: "2024-05-25",
    salary: 29500,
    commissionPercentage: 5,
    workingDays: "Mon,Tue,Wed,Fri,Sat,Sun",
    workingHours: "09:30 AM - 06:30 PM",
    isActive: true
  }
];

// src/db/init.ts
import { eq, and, sql, notInArray, desc } from "drizzle-orm";
async function ensureTablesCreated() {
  try {
    const existing = await db.execute(sql`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'salon_settings' LIMIT 1;`);
    if (existing && existing.rows && existing.rows.length > 0) {
      return;
    }
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT 'Salon User',
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'OWNER',
        phone TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS salon_settings (
        id SERIAL PRIMARY KEY,
        salon_name TEXT NOT NULL DEFAULT 'Veloura 🎀 Luxury Salon & Spa',
        tagline TEXT DEFAULT 'Luxury Hair, Beauty & Wellness',
        phone TEXT DEFAULT '+91 98765 43210',
        email TEXT DEFAULT 'contact@veloura.in',
        address TEXT DEFAULT 'Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
        gst_number TEXT DEFAULT '29AAAAA0000A1Z5',
        gst_rate INTEGER NOT NULL DEFAULT 18,
        tax_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        currency TEXT NOT NULL DEFAULT 'INR',
        invoice_prefix TEXT NOT NULL DEFAULT 'VEL',
        opening_time TEXT NOT NULL DEFAULT '09:00',
        closing_time TEXT NOT NULL DEFAULT '21:00',
        working_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        default_appointment_duration INTEGER NOT NULL DEFAULT 30,
        loyalty_points_per_100 INTEGER NOT NULL DEFAULT 1,
        loyalty_point_value_inr INTEGER NOT NULL DEFAULT 1,
        loyalty_min_redemption_points INTEGER NOT NULL DEFAULT 50,
        accepted_payment_methods TEXT NOT NULL DEFAULT 'Cash,UPI,Card,Bank Transfer',
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS service_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES service_categories(id),
        category_name TEXT NOT NULL,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        email TEXT,
        dob TEXT,
        gender TEXT,
        address TEXT,
        notes TEXT,
        preferences TEXT,
        loyalty_points INTEGER NOT NULL DEFAULT 0,
        total_visits INTEGER NOT NULL DEFAULT 0,
        total_spent INTEGER NOT NULL DEFAULT 0,
        last_visit TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        staff_code TEXT,
        name TEXT NOT NULL,
        gender TEXT NOT NULL DEFAULT 'Female',
        phone TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'Stylist',
        specialization TEXT NOT NULL DEFAULT 'Hair & Styling',
        joining_date TEXT NOT NULL DEFAULT '2025-01-01',
        salary INTEGER NOT NULL DEFAULT 20000,
        commission_percentage INTEGER NOT NULL DEFAULT 10,
        working_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        working_hours TEXT NOT NULL DEFAULT '09:00 - 21:00',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS staff_schedules (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        date TEXT NOT NULL,
        is_working BOOLEAN NOT NULL DEFAULT TRUE,
        shift_start TEXT NOT NULL DEFAULT '09:00',
        shift_end TEXT NOT NULL DEFAULT '21:00',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        booking_code TEXT,
        source TEXT NOT NULL DEFAULT 'Online Booking',
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        staff_name TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Confirmed',
        payment_status TEXT NOT NULL DEFAULT 'Pending',
        notes TEXT,
        total_amount INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS appointment_services (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER NOT NULL REFERENCES appointments(id),
        service_id INTEGER NOT NULL REFERENCES services(id),
        service_name TEXT NOT NULL,
        price INTEGER NOT NULL,
        duration INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number TEXT NOT NULL UNIQUE,
        appointment_id INTEGER REFERENCES appointments(id),
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        staff_id INTEGER REFERENCES staff(id),
        staff_name TEXT,
        date TEXT NOT NULL,
        subtotal INTEGER NOT NULL,
        discount INTEGER NOT NULL DEFAULT 0,
        discount_reason TEXT,
        tax_rate INTEGER NOT NULL DEFAULT 18,
        tax_amount INTEGER NOT NULL DEFAULT 0,
        grand_total INTEGER NOT NULL,
        paid_amount INTEGER NOT NULL DEFAULT 0,
        balance_amount INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Pending',
        payment_method TEXT NOT NULL DEFAULT 'Cash',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id),
        service_id INTEGER REFERENCES services(id),
        service_name TEXT NOT NULL,
        staff_id INTEGER REFERENCES staff(id),
        staff_name TEXT,
        unit_price INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        total INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        payment_number TEXT NOT NULL UNIQUE,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id),
        invoice_number TEXT NOT NULL,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        customer_name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Successful',
        transaction_reference TEXT,
        notes TEXT,
        date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount INTEGER NOT NULL,
        date TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'Cash',
        description TEXT,
        notes TEXT,
        vendor_name TEXT,
        added_by TEXT NOT NULL DEFAULT 'Admin',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        gst_number TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS inventory_products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        supplier_id INTEGER REFERENCES suppliers(id),
        supplier_name TEXT,
        purchase_price INTEGER NOT NULL,
        selling_price INTEGER NOT NULL,
        current_stock INTEGER NOT NULL DEFAULT 0,
        min_stock_level INTEGER NOT NULL DEFAULT 5,
        unit TEXT NOT NULL DEFAULT 'Bottle',
        expiry_date TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES inventory_products(id),
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        type TEXT NOT NULL,
        reason TEXT,
        performed_by TEXT NOT NULL DEFAULT 'Admin',
        date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        validity_days INTEGER NOT NULL DEFAULT 365,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS package_services (
        id SERIAL PRIMARY KEY,
        package_id INTEGER NOT NULL REFERENCES packages(id),
        service_id INTEGER NOT NULL REFERENCES services(id),
        service_name TEXT NOT NULL,
        sessions_count INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS customer_packages (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        package_id INTEGER NOT NULL REFERENCES packages(id),
        purchase_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        remaining_sessions TEXT NOT NULL,
        total_paid INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );
      CREATE TABLE IF NOT EXISTS offers (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE',
        discount_value INTEGER NOT NULL,
        min_bill_amount INTEGER NOT NULL DEFAULT 0,
        service_category TEXT NOT NULL DEFAULT 'All',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS loyalty_accounts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id),
        customer_name TEXT NOT NULL,
        current_points INTEGER NOT NULL DEFAULT 0,
        total_points_earned INTEGER NOT NULL DEFAULT 0,
        total_points_redeemed INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        type TEXT NOT NULL,
        points INTEGER NOT NULL,
        invoice_id INTEGER REFERENCES invoices(id),
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        reference_id TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_name TEXT NOT NULL DEFAULT 'Admin',
        user_role TEXT NOT NULL DEFAULT 'OWNER',
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn("Note on table creation:", err);
  }
}
async function initializeDatabase() {
  try {
    await ensureTablesCreated();
    const existingSettings = await db.select().from(salonSettings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(salonSettings).values({
        salonName: "Veloura \u{1F380} Luxury Salon & Spa",
        tagline: "Luxury Hair, Beauty & Wellness",
        phone: "+91 98765 43210",
        email: "contact@veloura.in",
        address: "Indiranagar 100ft Road, Bengaluru, Karnataka 560038",
        gstNumber: "29AAAAA0000A1Z5",
        gstRate: 18,
        taxEnabled: true,
        currency: "INR",
        invoicePrefix: "VEL",
        openingTime: "09:00",
        closingTime: "21:00",
        workingDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
        defaultAppointmentDuration: 30,
        loyaltyPointsPer100: 1,
        loyaltyPointValueInr: 1,
        loyaltyMinRedemptionPoints: 50,
        acceptedPaymentMethods: "Cash,UPI,Card,Bank Transfer"
      });
      console.log("Default salon settings created for Veloura \u{1F380}.");
    } else {
      await db.update(salonSettings).set({
        salonName: "Veloura \u{1F380} Luxury Salon & Spa",
        tagline: "Luxury Hair, Beauty & Wellness",
        email: "contact@veloura.in",
        invoicePrefix: "VEL"
      }).where(eq(salonSettings.id, existingSettings[0].id));
    }
    const categoryMap = /* @__PURE__ */ new Map();
    for (const cat of PREDEFINED_CATEGORIES) {
      let existingCat = await db.select().from(serviceCategories).where(eq(serviceCategories.name, cat.name)).limit(1);
      if (existingCat.length === 0) {
        const inserted = await db.insert(serviceCategories).values({
          name: cat.name,
          description: cat.description,
          displayOrder: cat.displayOrder
        }).returning({ id: serviceCategories.id });
        categoryMap.set(cat.name, inserted[0].id);
      } else {
        categoryMap.set(cat.name, existingCat[0].id);
      }
    }
    const existingServices = await db.select().from(services);
    if (existingServices.length === 0) {
      for (const s of PREDEFINED_SERVICES) {
        const catId = categoryMap.get(s.category) || null;
        await db.insert(services).values({
          categoryId: catId,
          categoryName: s.category,
          name: s.name,
          price: s.price,
          duration: s.duration,
          description: s.description,
          isActive: true
        });
      }
      console.log(`Seeded all ${PREDEFINED_SERVICES.length} predefined services.`);
    } else {
      for (const s of PREDEFINED_SERVICES) {
        await db.update(services).set({ price: s.price }).where(eq(services.name, s.name));
      }
    }
    const existingStaff = await db.select().from(staff);
    if (existingStaff.length === 0) {
      for (const st of INITIAL_35_STAFF) {
        await db.insert(staff).values({
          staffCode: st.staffCode,
          name: st.name,
          phone: st.phone,
          email: st.email,
          role: st.role,
          specialization: st.specialization,
          joiningDate: st.joiningDate,
          salary: st.salary,
          commissionPercentage: st.commissionPercentage,
          workingDays: st.workingDays,
          workingHours: st.workingHours,
          isActive: true
        });
      }
      console.log(`Seeded all ${INITIAL_35_STAFF.length} staff members.`);
    } else {
      const existingCodes = new Set(existingStaff.map((s) => s.staffCode));
      for (const st of INITIAL_35_STAFF) {
        if (!existingCodes.has(st.staffCode)) {
          await db.insert(staff).values({
            staffCode: st.staffCode,
            name: st.name,
            phone: st.phone,
            email: st.email,
            role: st.role,
            specialization: st.specialization,
            joiningDate: st.joiningDate,
            salary: st.salary,
            commissionPercentage: st.commissionPercentage,
            workingDays: st.workingDays,
            workingHours: st.workingHours,
            isActive: true
          });
        }
      }
    }
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      await db.insert(users).values({
        uid: "default-owner-uid",
        name: "Anita Sharma (Owner)",
        email: "owner@veloura.in",
        role: "OWNER",
        phone: "+91 98765 43210"
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}
async function hasStaffAppointmentConflict(staffId, date, startTime, endTime, excludeAppointmentId) {
  const existing = await db.select().from(appointments).where(
    and(
      eq(appointments.staffId, staffId),
      eq(appointments.date, date),
      notInArray(appointments.status, ["Cancelled", "No Show"]),
      excludeAppointmentId ? sql`${appointments.id} != ${excludeAppointmentId}` : sql`1=1`
    )
  );
  return existing.some((apt) => {
    return startTime < apt.endTime && endTime > apt.startTime;
  });
}
async function generateNextInvoiceNumber() {
  const settings = await db.select().from(salonSettings).limit(1);
  const prefix = settings[0]?.invoicePrefix || "INV";
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const latest = await db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices).orderBy(desc(invoices.id)).limit(1);
  let nextSequence = 1;
  if (latest.length > 0 && latest[0].invoiceNumber) {
    const parts = latest[0].invoiceNumber.split("-");
    if (parts.length >= 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }
  const padded = String(nextSequence).padStart(4, "0");
  return `${prefix}-${year}-${padded}`;
}
async function generateNextPaymentNumber() {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const latest = await db.select({ paymentNumber: payments.paymentNumber }).from(payments).orderBy(desc(payments.id)).limit(1);
  let nextSequence = 1;
  if (latest.length > 0 && latest[0].paymentNumber) {
    const parts = latest[0].paymentNumber.split("-");
    if (parts.length >= 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }
  const padded = String(nextSequence).padStart(4, "0");
  return `PAY-${year}-${padded}`;
}

// src/db/demo-data.ts
async function clearAllDemoData() {
  await db.delete(appointmentServices);
  await db.delete(invoiceItems);
  await db.delete(payments);
  await db.delete(invoices);
  await db.delete(appointments);
  await db.delete(customerPackages);
  await db.delete(packageServices);
  await db.delete(packages);
  await db.delete(inventoryMovements);
  await db.delete(inventoryProducts);
  await db.delete(suppliers);
  await db.delete(expenses);
  await db.delete(loyaltyTransactions);
  await db.delete(loyaltyAccounts);
  await db.delete(staffSchedules);
  await db.delete(customers);
  await db.delete(offers);
  await db.delete(notifications);
  await db.delete(activityLogs);
  await db.insert(activityLogs).values({
    userName: "Anita Sharma (Owner)",
    userRole: "OWNER",
    action: "DEMO_DATA_CLEARED",
    description: "Cleared all demo transactions, customers, and inventory data.",
    entityType: "System"
  });
  return { success: true, message: "All demo data successfully cleared. 25 staff members, base 31 services and settings retained." };
}
async function loadIndianSalonDemoData() {
  await clearAllDemoData();
  const allServices = await db.select().from(services);
  const findService = (name) => allServices.find((s) => s.name === name) || allServices[0];
  let existingStaff = await db.select().from(staff);
  if (existingStaff.length < 35) {
    await db.delete(staff);
    existingStaff = await db.insert(staff).values(INITIAL_35_STAFF).returning();
  }
  const insertedStaff = existingStaff;
  const customersData = [
    {
      name: "Priya Patel",
      phone: "+91 98765 43211",
      email: "priya.patel@gmail.com",
      dob: "1994-08-14",
      gender: "Female",
      address: "12th Main, HAL 2nd Stage, Indiranagar",
      notes: "Sensitive scalp, prefers herbal conditioner",
      preferences: "Tea without sugar, lukewarm water",
      loyaltyPoints: 120,
      totalVisits: 5,
      totalSpent: 12500
    },
    {
      name: "Sneha Rao",
      phone: "+91 98765 43212",
      email: "sneha.rao@outlook.com",
      dob: "1998-11-22",
      gender: "Female",
      address: "7th Cross, Koramangala 4th Block",
      notes: "Wedding scheduled next month; booked bridal package",
      preferences: "Gold facial fan, loves relaxing head massage",
      loyaltyPoints: 85,
      totalVisits: 3,
      totalSpent: 8900
    },
    {
      name: "Ananya Iyer",
      phone: "+91 98765 43213",
      email: "ananya.iyer@gmail.com",
      dob: "1992-04-05",
      gender: "Female",
      address: "B-402, Prestige Palms, Domlur",
      notes: "Always books with Pooja for haircut",
      preferences: "Blow dry with soft waves",
      loyaltyPoints: 40,
      totalVisits: 2,
      totalSpent: 3500
    },
    {
      name: "Vikram Malhotra",
      phone: "+91 98765 43214",
      email: "vikram.m@techcorp.in",
      dob: "1989-12-30",
      gender: "Male",
      address: "Diamond District, Old Airport Road",
      notes: "Head massage and regular hair wash",
      preferences: "Evening appointments after 6 PM",
      loyaltyPoints: 15,
      totalVisits: 1,
      totalSpent: 1500
    },
    {
      name: "Pooja Verma",
      phone: "+91 98765 43215",
      email: "pooja.verma@yahoo.com",
      dob: "2001-07-19",
      gender: "Female",
      address: "Defence Colony, Indiranagar",
      notes: "College student; active on Instagram",
      preferences: "Nail spa & fruit facial",
      loyaltyPoints: 25,
      totalVisits: 2,
      totalSpent: 2200
    }
  ];
  const insertedCustomers = await db.insert(customers).values(customersData).returning();
  for (const c of insertedCustomers) {
    await db.insert(loyaltyAccounts).values({
      customerId: c.id,
      customerName: c.name,
      currentPoints: c.loyaltyPoints,
      totalPointsEarned: c.loyaltyPoints,
      totalPointsRedeemed: 0
    });
  }
  const suppliersData = [
    {
      name: "L'Or\xE9al Professional India",
      contactPerson: "Arun Nair",
      phone: "+91 98200 11223",
      email: "orders@loreal-pro-in.com",
      address: "Whitefield Trade Centre, Bengaluru",
      gstNumber: "29AAACL1234F1Z1",
      notes: "Next-day delivery on orders above \u20B910,000"
    },
    {
      name: "Vedic Glow Botanicals",
      contactPerson: "Meera Nambiar",
      phone: "+91 98450 33445",
      email: "sales@vedicglow.in",
      address: "Peenya Industrial Area, Bengaluru",
      gstNumber: "29AABCV5678G1Z2",
      notes: "Organic ayurvedic massage oils and herbal facial packs"
    },
    {
      name: "Rica Wax & Salon Essentials",
      contactPerson: "Suresh Kumar",
      phone: "+91 98800 55667",
      email: "suresh@ricawaxdist.in",
      address: "Brigade Road Commercial Hub, Bengaluru",
      gstNumber: "29AADCR9012H1Z3",
      notes: "Italian liposoluble wax, strips and spatulas"
    }
  ];
  const insertedSuppliers = await db.insert(suppliers).values(suppliersData).returning();
  const productsData = [
    {
      name: "L'Or\xE9al Serie Expert Keratin Shampoo 500ml",
      category: "Hair Care",
      sku: "SKU-LOR-KER-500",
      supplierId: insertedSuppliers[0].id,
      supplierName: insertedSuppliers[0].name,
      purchasePrice: 650,
      sellingPrice: 950,
      currentStock: 14,
      minStockLevel: 5,
      unit: "Bottles",
      expiryDate: "2027-10-31"
    },
    {
      name: "L'Or\xE9al Mythic Oil Serum 100ml",
      category: "Hair Care",
      sku: "SKU-LOR-MYTH-100",
      supplierId: insertedSuppliers[0].id,
      supplierName: insertedSuppliers[0].name,
      purchasePrice: 780,
      sellingPrice: 1200,
      currentStock: 8,
      minStockLevel: 4,
      unit: "Bottles",
      expiryDate: "2027-08-15"
    },
    {
      name: "Vedic Gold Facial Radiance Kit (5 Sessions)",
      category: "Skin Care",
      sku: "SKU-VED-GOLD-KIT",
      supplierId: insertedSuppliers[1].id,
      supplierName: insertedSuppliers[1].name,
      purchasePrice: 1800,
      sellingPrice: 3200,
      currentStock: 3,
      // LOW STOCK to demonstrate alert!
      minStockLevel: 5,
      unit: "Kits",
      expiryDate: "2026-12-31"
    },
    {
      name: "Rica White Chocolate Wax Tin 800ml",
      category: "Consumables",
      sku: "SKU-RIC-WAX-800",
      supplierId: insertedSuppliers[2].id,
      supplierName: insertedSuppliers[2].name,
      purchasePrice: 850,
      sellingPrice: 1350,
      currentStock: 6,
      minStockLevel: 4,
      unit: "Tins",
      expiryDate: "2028-01-01"
    },
    {
      name: "Ayurvedic Bhringraj Scalp Oil 1L",
      category: "Consumables",
      sku: "SKU-AYU-BHR-1000",
      supplierId: insertedSuppliers[1].id,
      supplierName: insertedSuppliers[1].name,
      purchasePrice: 550,
      sellingPrice: 900,
      currentStock: 2,
      // LOW STOCK alert!
      minStockLevel: 4,
      unit: "Litres",
      expiryDate: "2027-05-30"
    }
  ];
  const insertedProducts = await db.insert(inventoryProducts).values(productsData).returning();
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  for (const p of insertedProducts) {
    await db.insert(inventoryMovements).values({
      productId: p.id,
      productName: p.name,
      quantity: p.currentStock,
      previousStock: 0,
      newStock: p.currentStock,
      type: "PURCHASE",
      reason: "Initial opening stock consignment",
      performedBy: "Anita Sharma (Owner)",
      date: todayStr
    });
  }
  await db.insert(offers).values([
    {
      title: "Monsoon Glow 15% Off",
      code: "MONSOON15",
      discountType: "PERCENTAGE",
      discountValue: 15,
      minBillAmount: 1e3,
      serviceCategory: "FACIAL & SKIN",
      startDate: todayStr,
      endDate: "2026-12-31",
      isActive: true,
      description: "Get 15% off on all facial and skin glow treatments above \u20B91,000"
    },
    {
      title: "Bridal Makeover Flat \u20B9500 Off",
      code: "BRIDAL500",
      discountType: "FIXED_INR",
      discountValue: 500,
      minBillAmount: 4e3,
      serviceCategory: "MAKEUP",
      startDate: todayStr,
      endDate: "2026-12-31",
      isActive: true,
      description: "Flat \u20B9500 off on bridal and engagement makeup bookings"
    }
  ]);
  const pkg = await db.insert(packages).values({
    name: "Bridal Radiance Royal Package",
    description: "Comprehensive 4-session head-to-toe bridal transformation",
    price: 9999,
    validityDays: 120,
    isActive: true
  }).returning();
  const bridalMakeupSvc = findService("Bridal Makeup");
  const goldFacialSvc = findService("Gold Facial");
  const hairSpaSvc = findService("Hair Spa");
  await db.insert(packageServices).values([
    { packageId: pkg[0].id, serviceId: bridalMakeupSvc.id, serviceName: bridalMakeupSvc.name, sessionsCount: 1 },
    { packageId: pkg[0].id, serviceId: goldFacialSvc.id, serviceName: goldFacialSvc.name, sessionsCount: 2 },
    { packageId: pkg[0].id, serviceId: hairSpaSvc.id, serviceName: hairSpaSvc.name, sessionsCount: 1 }
  ]);
  const s1 = findService("Haircut");
  const s2 = findService("Hair Spa");
  const s3 = findService("Gold Facial");
  const s4 = findService("Head Massage");
  const apt1 = await db.insert(appointments).values({
    customerId: insertedCustomers[0].id,
    customerName: insertedCustomers[0].name,
    customerPhone: insertedCustomers[0].phone,
    staffId: insertedStaff[0].id,
    // Pooja
    staffName: insertedStaff[0].name,
    date: todayStr,
    startTime: "10:00",
    endTime: "11:00",
    status: "Completed",
    paymentStatus: "Paid",
    totalAmount: s2.price,
    notes: "Regular customer; deep conditioning requested"
  }).returning();
  await db.insert(appointmentServices).values({
    appointmentId: apt1[0].id,
    serviceId: s2.id,
    serviceName: s2.name,
    price: s2.price,
    duration: s2.duration
  });
  const apt2 = await db.insert(appointments).values({
    customerId: insertedCustomers[1].id,
    customerName: insertedCustomers[1].name,
    customerPhone: insertedCustomers[1].phone,
    staffId: insertedStaff[1].id,
    // Kavita
    staffName: insertedStaff[1].name,
    date: todayStr,
    startTime: "11:30",
    endTime: "12:30",
    status: "In Progress",
    paymentStatus: "Partial",
    totalAmount: s3.price,
    notes: "Pre-wedding consultation and facial"
  }).returning();
  await db.insert(appointmentServices).values({
    appointmentId: apt2[0].id,
    serviceId: s3.id,
    serviceName: s3.name,
    price: s3.price,
    duration: s3.duration
  });
  const apt3 = await db.insert(appointments).values({
    customerId: insertedCustomers[2].id,
    customerName: insertedCustomers[2].name,
    customerPhone: insertedCustomers[2].phone,
    staffId: insertedStaff[2].id,
    // Rahul
    staffName: insertedStaff[2].name,
    date: todayStr,
    startTime: "14:00",
    endTime: "14:30",
    status: "Confirmed",
    paymentStatus: "Pending",
    totalAmount: s1.price,
    notes: "Afternoon haircut slot"
  }).returning();
  await db.insert(appointmentServices).values({
    appointmentId: apt3[0].id,
    serviceId: s1.id,
    serviceName: s1.name,
    price: s1.price,
    duration: s1.duration
  });
  const inv1 = await db.insert(invoices).values({
    invoiceNumber: "INV-2026-0001",
    appointmentId: apt1[0].id,
    customerId: insertedCustomers[0].id,
    customerName: insertedCustomers[0].name,
    customerPhone: insertedCustomers[0].phone,
    staffId: insertedStaff[0].id,
    staffName: insertedStaff[0].name,
    date: todayStr,
    subtotal: 950,
    discount: 50,
    discountReason: "Regular Customer Courtesy",
    taxRate: 18,
    taxAmount: 162,
    grandTotal: 1062,
    paidAmount: 1062,
    balanceAmount: 0,
    status: "Paid",
    paymentMethod: "UPI",
    notes: "Paid via GPay UPI"
  }).returning();
  await db.insert(invoiceItems).values([
    {
      invoiceId: inv1[0].id,
      serviceId: s2.id,
      serviceName: s2.name,
      staffId: insertedStaff[0].id,
      staffName: insertedStaff[0].name,
      unitPrice: 800,
      quantity: 1,
      total: 800
    },
    {
      invoiceId: inv1[0].id,
      serviceId: findService("Hair Wash").id,
      serviceName: "Hair Wash",
      staffId: insertedStaff[0].id,
      staffName: insertedStaff[0].name,
      unitPrice: 150,
      quantity: 1,
      total: 150
    }
  ]);
  await db.insert(payments).values({
    paymentNumber: "PAY-2026-0001",
    invoiceId: inv1[0].id,
    invoiceNumber: "INV-2026-0001",
    customerId: insertedCustomers[0].id,
    customerName: insertedCustomers[0].name,
    amount: 1062,
    paymentMethod: "UPI",
    status: "Paid",
    transactionReference: "UPI-REF-9843210452",
    date: todayStr,
    notes: "GPay UPI confirmation"
  });
  await db.insert(loyaltyTransactions).values({
    customerId: insertedCustomers[0].id,
    type: "EARNED",
    points: 10,
    invoiceId: inv1[0].id,
    description: "10 points earned on INV-2026-0001 payment",
    date: todayStr
  });
  const inv2 = await db.insert(invoices).values({
    invoiceNumber: "INV-2026-0002",
    appointmentId: apt2[0].id,
    customerId: insertedCustomers[1].id,
    customerName: insertedCustomers[1].name,
    customerPhone: insertedCustomers[1].phone,
    staffId: insertedStaff[1].id,
    staffName: insertedStaff[1].name,
    date: todayStr,
    subtotal: 1271,
    discount: 0,
    taxRate: 18,
    taxAmount: 229,
    grandTotal: 1500,
    paidAmount: 1e3,
    balanceAmount: 500,
    status: "Partial",
    paymentMethod: "Cash",
    notes: "Advance cash \u20B91,000 paid; balance \u20B9500 due on service finish"
  }).returning();
  await db.insert(invoiceItems).values({
    invoiceId: inv2[0].id,
    serviceId: s3.id,
    serviceName: s3.name,
    staffId: insertedStaff[1].id,
    staffName: insertedStaff[1].name,
    unitPrice: 1271,
    quantity: 1,
    total: 1271
  });
  await db.insert(payments).values({
    paymentNumber: "PAY-2026-0002",
    invoiceId: inv2[0].id,
    invoiceNumber: "INV-2026-0002",
    customerId: insertedCustomers[1].id,
    customerName: insertedCustomers[1].name,
    amount: 1e3,
    paymentMethod: "Cash",
    status: "Partial",
    date: todayStr,
    notes: "First installment cash payment"
  });
  await db.insert(expenses).values([
    {
      title: "BESCOM Electricity Bill - Salon Floor",
      category: "Electricity",
      amount: 4850,
      date: todayStr,
      paymentMethod: "Bank Transfer",
      description: "Monthly commercial tariff electricity payment",
      addedBy: "Anita Sharma (Owner)"
    },
    {
      title: "Salon Towels Laundry & Steam Wash",
      category: "Maintenance",
      amount: 650,
      date: todayStr,
      paymentMethod: "UPI",
      description: "Weekly bulk towel sanitation and laundry",
      addedBy: "Anita Sharma (Owner)"
    },
    {
      title: "Refreshments (Coffee, Green Tea & Biscuits)",
      category: "Other",
      amount: 420,
      date: todayStr,
      paymentMethod: "Cash",
      description: "Customer and staff hospitality pantry supplies",
      addedBy: "Anita Sharma (Owner)"
    }
  ]);
  await db.insert(notifications).values([
    {
      type: "LOW_STOCK",
      title: "Low Stock Alert: Ayurvedic Bhringraj Scalp Oil",
      message: "Current stock is 2 Litres (below threshold of 4 Litres). Reorder from Vedic Glow Botanicals.",
      referenceId: "SKU-AYU-BHR-1000",
      isRead: false
    },
    {
      type: "PAYMENT_PENDING",
      title: "Pending Balance: Sneha Rao (INV-2026-0002)",
      message: "Balance of \u20B9500 is pending against invoice INV-2026-0002.",
      referenceId: "INV-2026-0002",
      isRead: false
    },
    {
      type: "APPOINTMENT",
      title: "Upcoming Appointment: Ananya Iyer at 02:00 PM",
      message: "Confirmed Haircut appointment with Rahul Verma at 02:00 PM.",
      referenceId: String(apt3[0].id),
      isRead: false
    }
  ]);
  await db.insert(activityLogs).values([
    {
      userName: "Anita Sharma (Owner)",
      userRole: "OWNER",
      action: "DEMO_DATA_LOADED",
      description: "Loaded realistic Indian salon operational data with customers, staff, appointments and inventory.",
      entityType: "System"
    },
    {
      userName: "Pooja Deshmukh",
      userRole: "STAFF",
      action: "APPOINTMENT_COMPLETED",
      description: "Completed Hair Spa service for Priya Patel.",
      entityType: "Appointment",
      entityId: String(apt1[0].id)
    },
    {
      userName: "Anita Sharma (Owner)",
      userRole: "OWNER",
      action: "INVOICE_GENERATED",
      description: "Generated invoice INV-2026-0001 for Priya Patel totaling \u20B91,062.",
      entityType: "Invoice",
      entityId: "INV-2026-0001"
    }
  ]);
  return {
    success: true,
    message: "Realistic Indian salon demo data successfully loaded into PostgreSQL database."
  };
}

// src/lib/currency.ts
var inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});
var inrDecimalFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
function calculateBillTotals(subtotal, discount = 0, taxRate = 18, taxEnabled = true) {
  const safeSubtotal = Math.max(0, Math.round(subtotal));
  const safeDiscount = Math.max(0, Math.min(safeSubtotal, Math.round(discount)));
  const taxableAmount = Math.max(0, safeSubtotal - safeDiscount);
  const taxAmount = taxEnabled && taxRate > 0 ? Math.round(taxableAmount * taxRate / 100) : 0;
  const grandTotal = taxableAmount + taxAmount;
  return {
    subtotal: safeSubtotal,
    discount: safeDiscount,
    taxableAmount,
    taxRate: taxEnabled ? taxRate : 0,
    taxAmount,
    grandTotal
  };
}

// src/server/api.ts
import { eq as eq2, and as and2, sql as sql2, desc as desc2, gte, lte, like, or, inArray } from "drizzle-orm";
var apiRouter = Router();
var isInitialized = false;
async function ensureDbInit() {
  if (!isInitialized) {
    try {
      await initializeDatabase();
      isInitialized = true;
    } catch (e) {
      console.error("Auto-initialization error:", e);
    }
  }
}
apiRouter.use(async (req, res, next) => {
  await ensureDbInit();
  next();
});
function getAuthContext(req) {
  const authHeader = req.headers["authorization"] || req.headers["x-auth-token"] || req.headers["x-veloura-token"];
  if (!authHeader || typeof authHeader !== "string") {
    return { role: "ANONYMOUS" };
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token.startsWith("adm_")) {
    return { role: "ADMIN" };
  }
  if (token.startsWith("stf_")) {
    const parts = token.split("_");
    const staffId = parseInt(parts[1], 10);
    return {
      role: "STAFF",
      staffId: !isNaN(staffId) ? staffId : void 0
    };
  }
  return { role: "ANONYMOUS" };
}
function requireAdminAuth(req, res) {
  const auth = getAuthContext(req);
  if (auth.role !== "ADMIN") {
    res.status(401).json({ error: "Authentication required: Owner/Admin privileges required." });
    return false;
  }
  return true;
}
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
apiRouter.post("/init", async (req, res) => {
  try {
    await initializeDatabase();
    res.json({ success: true, message: "Database verified and initialized with 31 services." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/demo/load", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const result = await loadIndianSalonDemoData();
    res.json(result);
  } catch (error) {
    console.error("Error loading demo data:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/demo/clear", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const result = await clearAllDemoData();
    res.json(result);
  } catch (error) {
    console.error("Error clearing demo data:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/auth/admin-login", async (req, res) => {
  try {
    const { username, password, pin } = req.body;
    const isValidPin = pin === "2026";
    const isValidCredentials = (username === "admin" || username === "owner") && (password === "veloura2026" || password === "admin" || password === "2026" || password === "veloura@admin2026");
    if (isValidPin || isValidCredentials) {
      const token = `adm_veloura_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return res.json({
        success: true,
        token,
        role: "ADMIN",
        user: {
          name: "Salon Owner / Admin (Veloura \u{1F380})",
          role: "OWNER",
          email: "admin@veloura.in"
        }
      });
    }
    return res.status(401).json({ error: "Invalid security PIN or admin credentials." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/auth/staff-login", async (req, res) => {
  try {
    const { staffCode, passcode, password } = req.body;
    const providedCode = (staffCode || "").trim();
    const providedPass = (passcode !== void 0 && passcode !== "" ? passcode : password !== void 0 ? password : "").trim();
    if (!providedCode || !providedPass) {
      return res.status(400).json({ error: "Please enter Staff Code and Password." });
    }
    const COMMON_STAFF_CODE = "STAFF@1234";
    const COMMON_STAFF_PASS = "Veloura@2026";
    const isCommonCode = providedCode.toUpperCase() === COMMON_STAFF_CODE;
    const isCommonPass = providedPass === COMMON_STAFF_PASS;
    const staffMembers = await db.select().from(staff).where(eq2(staff.isActive, true)).orderBy(staff.id);
    if (staffMembers.length === 0) {
      return res.status(500).json({ error: "No active staff records found in salon database." });
    }
    if (isCommonCode) {
      if (!isCommonPass) {
        return res.status(401).json({ error: "Invalid Staff Code or Password" });
      }
      const primaryStaff = staffMembers[0];
      const token = `stf_${primaryStaff.id}_veloura_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return res.json({
        success: true,
        token,
        role: "STAFF",
        staff: {
          id: primaryStaff.id,
          staffCode: "STAFF@1234",
          name: primaryStaff.name,
          role: primaryStaff.role,
          specialization: primaryStaff.specialization,
          phone: primaryStaff.phone,
          email: primaryStaff.email,
          commissionPercentage: primaryStaff.commissionPercentage,
          workingDays: primaryStaff.workingDays,
          workingHours: primaryStaff.workingHours
        }
      });
    }
    const targetStaff = staffMembers.find((s) => s.staffCode?.toUpperCase() === providedCode.toUpperCase());
    if (targetStaff) {
      const phoneDigits = (targetStaff.phone || "").replace(/\D/g, "");
      const lastFour = phoneDigits.slice(-4);
      const isPassValid = providedPass === COMMON_STAFF_PASS || providedPass === "veloura123" || providedPass === "2026" || providedPass === lastFour;
      if (isPassValid) {
        const token = `stf_${targetStaff.id}_veloura_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        return res.json({
          success: true,
          token,
          role: "STAFF",
          staff: {
            id: targetStaff.id,
            staffCode: targetStaff.staffCode,
            name: targetStaff.name,
            role: targetStaff.role,
            specialization: targetStaff.specialization,
            phone: targetStaff.phone,
            email: targetStaff.email,
            commissionPercentage: targetStaff.commissionPercentage,
            workingDays: targetStaff.workingDays,
            workingHours: targetStaff.workingHours
          }
        });
      }
    }
    return res.status(401).json({ error: "Invalid Staff Code or Password" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/auth/verify", async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (auth.role === "ADMIN") {
      return res.json({
        valid: true,
        role: "ADMIN",
        user: {
          name: "Salon Owner / Admin (Veloura \u{1F380})",
          role: "OWNER",
          email: "admin@veloura.in"
        }
      });
    }
    if (auth.role === "STAFF") {
      let targetStaff = null;
      if (auth.staffId) {
        const st = await db.select().from(staff).where(eq2(staff.id, auth.staffId)).limit(1);
        if (st[0] && st[0].isActive) {
          targetStaff = st[0];
        }
      }
      if (!targetStaff) {
        const all = await db.select().from(staff).where(eq2(staff.isActive, true)).limit(1);
        if (all[0]) {
          targetStaff = all[0];
        }
      }
      if (targetStaff) {
        return res.json({
          valid: true,
          role: "STAFF",
          staff: {
            id: targetStaff.id,
            staffCode: targetStaff.staffCode,
            name: targetStaff.name,
            role: targetStaff.role,
            specialization: targetStaff.specialization,
            phone: targetStaff.phone,
            email: targetStaff.email,
            commissionPercentage: targetStaff.commissionPercentage,
            workingDays: targetStaff.workingDays,
            workingHours: targetStaff.workingHours
          }
        });
      }
    }
    return res.json({ valid: false, role: "ANONYMOUS" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/staff/public", async (req, res) => {
  try {
    const allStaff = await db.select({
      id: staff.id,
      staffCode: staff.staffCode,
      name: staff.name,
      gender: staff.gender,
      role: staff.role,
      specialization: staff.specialization,
      workingDays: staff.workingDays,
      workingHours: staff.workingHours,
      isActive: staff.isActive
    }).from(staff).where(eq2(staff.isActive, true));
    res.json(allStaff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/staff/my-appointments", async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (auth.role !== "STAFF" && auth.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied: Staff authentication required." });
    }
    const isAll = req.query.staffId === "all";
    let staffId = !isAll && req.query.staffId ? Number(req.query.staffId) : auth.staffId;
    if (!isAll && (!staffId || isNaN(staffId))) {
      const first = await db.select().from(staff).where(eq2(staff.isActive, true)).limit(1);
      staffId = first[0]?.id || 1;
    }
    const staffAppointments = isAll ? await db.select().from(appointments).orderBy(desc2(appointments.date), appointments.startTime) : await db.select().from(appointments).where(
      or(
        eq2(appointments.staffId, staffId),
        sql2`${appointments.notes} LIKE ${'%"staffId":' + staffId + "%"}`
      )
    ).orderBy(desc2(appointments.date), appointments.startTime);
    const enriched = await Promise.all(
      staffAppointments.map(async (apt) => {
        const aptSvcs = await db.select().from(appointmentServices).where(eq2(appointmentServices.appointmentId, apt.id));
        let serviceAssignments = [];
        if (apt.notes && apt.notes.includes("<!--SERVICE_ASSIGNMENTS:")) {
          try {
            const match = apt.notes.match(/<!--SERVICE_ASSIGNMENTS:(.*?)-->/);
            if (match && match[1]) {
              serviceAssignments = JSON.parse(match[1]);
            }
          } catch (e) {
          }
        }
        return {
          ...apt,
          services: aptSvcs,
          serviceAssignments
        };
      })
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/staff/book-for-client", async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (auth.role !== "STAFF" && auth.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied: Staff authentication required." });
    }
    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      serviceId,
      staffId: requestedStaffId,
      date,
      startTime,
      notes
    } = req.body;
    if (!serviceId) {
      return res.status(400).json({ error: "Please select a salon service." });
    }
    if (!date || !startTime) {
      return res.status(400).json({ error: "Please select an appointment date and time." });
    }
    const targetStaffId = requestedStaffId ? Number(requestedStaffId) : auth.staffId;
    if (!targetStaffId) {
      return res.status(400).json({ error: "Target staff member is required." });
    }
    const targetStaff = await db.select().from(staff).where(eq2(staff.id, targetStaffId)).limit(1);
    if (!targetStaff[0]) {
      return res.status(404).json({ error: "Staff member not found." });
    }
    const svc = await db.select().from(services).where(eq2(services.id, Number(serviceId))).limit(1);
    if (!svc[0]) {
      return res.status(404).json({ error: "Selected service not found." });
    }
    const selectedService = svc[0];
    const duration = selectedService.duration || 30;
    const totalAmount = selectedService.price;
    const [startH, startM] = startTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    const hasConflict = await hasStaffAppointmentConflict(targetStaffId, date, startTime, endTime);
    if (hasConflict) {
      return res.status(409).json({
        error: `Staff member ${targetStaff[0].name} is already booked from ${startTime} to ${endTime} on ${date}. Please select another time.`,
        conflict: true
      });
    }
    let resolvedCustomerId;
    let resolvedCustomerName;
    let resolvedCustomerPhone;
    let resolvedCustomerEmail = customerEmail || null;
    if (customerId) {
      const existingCust = await db.select().from(customers).where(eq2(customers.id, Number(customerId))).limit(1);
      if (!existingCust[0]) return res.status(404).json({ error: "Customer not found." });
      resolvedCustomerId = existingCust[0].id;
      resolvedCustomerName = existingCust[0].name;
      resolvedCustomerPhone = existingCust[0].phone;
      if (existingCust[0].email) resolvedCustomerEmail = existingCust[0].email;
    } else {
      if (!customerName || !customerPhone) {
        return res.status(400).json({ error: "Client name and 10-digit mobile number are required." });
      }
      const cleanedPhone = customerPhone.trim();
      const existingByPhone = await db.select().from(customers).where(eq2(customers.phone, cleanedPhone)).limit(1);
      if (existingByPhone[0]) {
        resolvedCustomerId = existingByPhone[0].id;
        resolvedCustomerName = customerName.trim() || existingByPhone[0].name;
        resolvedCustomerPhone = existingByPhone[0].phone;
      } else {
        const newCust = await db.insert(customers).values({
          name: customerName.trim(),
          phone: cleanedPhone,
          email: customerEmail || null
        }).returning();
        resolvedCustomerId = newCust[0].id;
        resolvedCustomerName = newCust[0].name;
        resolvedCustomerPhone = newCust[0].phone;
      }
    }
    const uniqueYear = (/* @__PURE__ */ new Date()).getFullYear();
    const randomCode = Math.floor(1e3 + Math.random() * 9e3);
    const bookingCode = `BK-STF-${uniqueYear}-${randomCode}`;
    const newAppointment = await db.insert(appointments).values({
      bookingCode,
      source: "Staff Booking",
      customerId: resolvedCustomerId,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      customerEmail: resolvedCustomerEmail,
      staffId: targetStaff[0].id,
      staffName: targetStaff[0].name,
      date,
      startTime,
      endTime,
      status: "Confirmed",
      paymentStatus: "Pending",
      notes: notes || "Booked directly by staff for client",
      totalAmount
    }).returning();
    await db.insert(appointmentServices).values({
      appointmentId: newAppointment[0].id,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      duration: selectedService.duration
    });
    await db.insert(notifications).values({
      type: "APPOINTMENT",
      title: `Staff Booking: ${resolvedCustomerName}`,
      message: `${targetStaff[0].name} booked an appointment for ${resolvedCustomerName} on ${date} at ${startTime} (${selectedService.name})`,
      referenceId: String(newAppointment[0].id)
    });
    await db.insert(activityLogs).values({
      action: "STAFF_BOOKING_CREATED",
      description: `Staff member ${targetStaff[0].name} booked appointment #${newAppointment[0].id} for ${resolvedCustomerName} on ${date} at ${startTime}`,
      entityType: "Appointment",
      entityId: String(newAppointment[0].id)
    });
    return res.json({
      success: true,
      bookingCode,
      appointment: newAppointment[0],
      service: selectedService,
      staff: targetStaff[0]
    });
  } catch (error) {
    console.error("Staff booking error:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.patch("/staff/appointments/:id/status", async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (auth.role !== "STAFF" && auth.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied: Staff authentication required." });
    }
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required." });
    const apt = await db.select().from(appointments).where(eq2(appointments.id, id)).limit(1);
    if (!apt[0]) return res.status(404).json({ error: "Appointment not found." });
    if (auth.role === "STAFF" && apt[0].staffId !== auth.staffId) {
      return res.status(403).json({ error: "You can only manage appointments assigned to you." });
    }
    const updated = await db.update(appointments).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(appointments.id, id)).returning();
    return res.json({ success: true, appointment: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/dashboard", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayAppts = await db.select().from(appointments).where(eq2(appointments.date, todayStr)).orderBy(appointments.startTime);
    const todayPayments = await db.select({ amount: payments.amount }).from(payments).where(eq2(payments.date, todayStr));
    const todayRevenue = todayPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const todayExp = await db.select({ amount: expenses.amount }).from(expenses).where(eq2(expenses.date, todayStr));
    const todayExpensesTotal = todayExp.reduce((acc, e) => acc + (e.amount || 0), 0);
    const pendingInvoices = await db.select({ balance: invoices.balanceAmount }).from(invoices).where(sql2`${invoices.balanceAmount} > 0`);
    const pendingPaymentsTotal = pendingInvoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);
    const totalCustomersRes = await db.select({ count: sql2`count(*)` }).from(customers);
    const totalCustomers = Number(totalCustomersRes[0]?.count || 0);
    const activeStaffRes = await db.select({ count: sql2`count(*)` }).from(staff).where(eq2(staff.isActive, true));
    const activeStaffCount = Number(activeStaffRes[0]?.count || 0);
    const lowStockItems = await db.select().from(inventoryProducts).where(sql2`${inventoryProducts.currentStock} <= ${inventoryProducts.minStockLevel}`);
    const netRevenue = todayRevenue - todayExpensesTotal;
    const allPayments = await db.select({ amount: payments.amount }).from(payments);
    const allTimeRevenue = allPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const recentInvoices = await db.select().from(invoices).orderBy(desc2(invoices.id)).limit(5);
    res.json({
      todayAppointmentsCount: todayAppts.length,
      todayAppointments: todayAppts,
      todayRevenue,
      todayExpenses: todayExpensesTotal,
      netRevenue,
      pendingPayments: pendingPaymentsTotal,
      totalCustomers,
      activeStaff: activeStaffCount,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      allTimeRevenue,
      recentInvoices
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/settings", async (req, res) => {
  try {
    const list = await db.select().from(salonSettings).limit(1);
    res.json(list[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/settings", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const existing = await db.select().from(salonSettings).limit(1);
    const body = req.body;
    if (existing.length > 0) {
      const updated = await db.update(salonSettings).set({
        salonName: body.salonName ?? existing[0].salonName,
        tagline: body.tagline ?? existing[0].tagline,
        phone: body.phone ?? existing[0].phone,
        email: body.email ?? existing[0].email,
        address: body.address ?? existing[0].address,
        gstNumber: body.gstNumber ?? existing[0].gstNumber,
        gstRate: body.gstRate ? Number(body.gstRate) : existing[0].gstRate,
        taxEnabled: body.taxEnabled !== void 0 ? Boolean(body.taxEnabled) : existing[0].taxEnabled,
        currency: "INR",
        invoicePrefix: body.invoicePrefix ?? existing[0].invoicePrefix,
        openingTime: body.openingTime ?? existing[0].openingTime,
        closingTime: body.closingTime ?? existing[0].closingTime,
        workingDays: body.workingDays ?? existing[0].workingDays,
        defaultAppointmentDuration: body.defaultAppointmentDuration ? Number(body.defaultAppointmentDuration) : existing[0].defaultAppointmentDuration,
        loyaltyPointsPer100: body.loyaltyPointsPer100 ? Number(body.loyaltyPointsPer100) : existing[0].loyaltyPointsPer100,
        loyaltyPointValueInr: body.loyaltyPointValueInr ? Number(body.loyaltyPointValueInr) : existing[0].loyaltyPointValueInr,
        loyaltyMinRedemptionPoints: body.loyaltyMinRedemptionPoints ? Number(body.loyaltyMinRedemptionPoints) : existing[0].loyaltyMinRedemptionPoints,
        acceptedPaymentMethods: body.acceptedPaymentMethods ?? existing[0].acceptedPaymentMethods,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(salonSettings.id, existing[0].id)).returning();
      res.json(updated[0]);
    } else {
      const created = await db.insert(salonSettings).values(body).returning();
      res.json(created[0]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/services", async (req, res) => {
  try {
    const list = await db.select().from(services).orderBy(services.categoryName, services.name);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/services", async (req, res) => {
  try {
    const { name, categoryName, price, duration, description, isActive } = req.body;
    if (!name || !categoryName || price === void 0 || !duration) {
      return res.status(400).json({ error: "Name, Category, Price in \u20B9 and Duration in minutes are required." });
    }
    const created = await db.insert(services).values({
      name,
      categoryName,
      price: Number(price),
      duration: Number(duration),
      description: description || "",
      isActive: isActive !== false
    }).returning();
    await db.insert(activityLogs).values({
      action: "SERVICE_CREATED",
      description: `Created service: ${name} (\u20B9${price}, ${duration} mins)`,
      entityType: "Service",
      entityId: String(created[0].id)
    });
    res.json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/services/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, categoryName, price, duration, description, isActive } = req.body;
    const updated = await db.update(services).set({
      name,
      categoryName,
      price: price !== void 0 ? Number(price) : void 0,
      duration: duration !== void 0 ? Number(duration) : void 0,
      description,
      isActive: isActive !== void 0 ? Boolean(isActive) : void 0,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(services.id, id)).returning();
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.delete("/services/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(services).where(eq2(services.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/categories", async (req, res) => {
  try {
    const cats = await db.select().from(serviceCategories).orderBy(serviceCategories.displayOrder);
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/customers", async (req, res) => {
  try {
    const { search } = req.query;
    let list;
    if (search && typeof search === "string") {
      const q = `%${search.trim()}%`;
      list = await db.select().from(customers).where(or(like(customers.name, q), like(customers.phone, q), like(customers.email, q))).orderBy(desc2(customers.id));
    } else {
      list = await db.select().from(customers).orderBy(desc2(customers.id));
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/customers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cust = await db.select().from(customers).where(eq2(customers.id, id)).limit(1);
    if (!cust[0]) return res.status(404).json({ error: "Customer not found" });
    const custAppts = await db.select().from(appointments).where(eq2(appointments.customerId, id)).orderBy(desc2(appointments.date), desc2(appointments.startTime));
    const custInvoices = await db.select().from(invoices).where(eq2(invoices.customerId, id)).orderBy(desc2(invoices.id));
    const custPayments = await db.select().from(payments).where(eq2(payments.customerId, id)).orderBy(desc2(payments.id));
    const loyalty = await db.select().from(loyaltyAccounts).where(eq2(loyaltyAccounts.customerId, id)).limit(1);
    res.json({
      customer: cust[0],
      appointments: custAppts,
      invoices: custInvoices,
      payments: custPayments,
      loyalty: loyalty[0] || { currentPoints: cust[0].loyaltyPoints, totalPointsEarned: cust[0].loyaltyPoints, totalPointsRedeemed: 0 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/customers", async (req, res) => {
  try {
    const { name, phone, email, dob, gender, address, notes, preferences } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Customer name and phone number are required." });
    }
    const existingPhone = await db.select().from(customers).where(eq2(customers.phone, phone.trim())).limit(1);
    if (existingPhone.length > 0) {
      return res.status(400).json({
        error: `Customer with phone ${phone} already exists (${existingPhone[0].name}).`,
        existingCustomer: existingPhone[0]
      });
    }
    const created = await db.insert(customers).values({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      dob: dob || null,
      gender: gender || "Female",
      address: address || null,
      notes: notes || null,
      preferences: preferences || null
    }).returning();
    await db.insert(loyaltyAccounts).values({
      customerId: created[0].id,
      customerName: created[0].name,
      currentPoints: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0
    });
    await db.insert(activityLogs).values({
      action: "CUSTOMER_CREATED",
      description: `Added new customer: ${name} (${phone})`,
      entityType: "Customer",
      entityId: String(created[0].id)
    });
    res.json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/customers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, email, dob, gender, address, notes, preferences } = req.body;
    if (phone) {
      const existingPhone = await db.select().from(customers).where(eq2(customers.phone, phone.trim())).limit(1);
      if (existingPhone.length > 0 && existingPhone[0].id !== id) {
        return res.status(400).json({ error: `Phone number ${phone} is already registered to another customer (${existingPhone[0].name}).` });
      }
    }
    const updated = await db.update(customers).set({
      name,
      phone,
      email,
      dob,
      gender,
      address,
      notes,
      preferences,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(customers.id, id)).returning();
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.delete("/customers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(loyaltyTransactions).where(eq2(loyaltyTransactions.customerId, id));
    await db.delete(loyaltyAccounts).where(eq2(loyaltyAccounts.customerId, id));
    await db.delete(customers).where(eq2(customers.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/staff", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const staffList = await db.select().from(staff).orderBy(staff.name);
    const enriched = await Promise.all(
      staffList.map(async (st) => {
        const staffAppts = await db.select({ count: sql2`count(*)` }).from(appointments).where(eq2(appointments.staffId, st.id));
        const apptCount = Number(staffAppts[0]?.count || 0);
        const staffSales = await db.select({ total: sql2`sum(${invoiceItems.total})` }).from(invoiceItems).where(eq2(invoiceItems.staffId, st.id));
        const salesTotal = Number(staffSales[0]?.total || 0);
        const commission = Math.round(salesTotal * st.commissionPercentage / 100);
        return {
          ...st,
          appointmentCount: apptCount,
          revenueGenerated: salesTotal,
          commissionEarned: commission
        };
      })
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/staff", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const { staffCode, name, phone, email, role, specialization, joiningDate, salary, commissionPercentage, workingDays, workingHours } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Staff name and phone are required." });
    }
    let defaultComm = 5;
    if (role === "Helper") {
      defaultComm = 4;
    }
    const created = await db.insert(staff).values({
      staffCode: staffCode || `STF-${Date.now().toString().slice(-4)}`,
      name,
      phone,
      email: email || null,
      role: role || "Hair Stylist",
      specialization: specialization || "General",
      joiningDate: joiningDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      salary: salary ? Number(salary) : 25e3,
      commissionPercentage: commissionPercentage !== void 0 ? Number(commissionPercentage) : defaultComm,
      workingDays: workingDays || "Mon,Tue,Wed,Thu,Fri,Sat",
      workingHours: workingHours || "10:00 AM - 07:00 PM",
      isActive: true
    }).returning();
    await db.insert(activityLogs).values({
      action: "STAFF_ADDED",
      description: `Added staff member: ${name} (${role})`,
      entityType: "Staff",
      entityId: String(created[0].id)
    });
    res.json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/staff/:id", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const id = Number(req.params.id);
    const body = req.body;
    const updated = await db.update(staff).set({
      ...body,
      staffCode: body.staffCode !== void 0 ? body.staffCode : void 0,
      salary: body.salary !== void 0 ? Number(body.salary) : void 0,
      commissionPercentage: body.commissionPercentage !== void 0 ? Number(body.commissionPercentage) : void 0,
      isActive: body.isActive !== void 0 ? Boolean(body.isActive) : void 0,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(staff.id, id)).returning();
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/appointments", async (req, res) => {
  try {
    const { date, startDate, endDate, staffId, status } = req.query;
    let query = db.select().from(appointments);
    const conditions = [];
    if (date && typeof date === "string") {
      conditions.push(eq2(appointments.date, date));
    }
    if (startDate && typeof startDate === "string" && endDate && typeof endDate === "string") {
      conditions.push(gte(appointments.date, startDate));
      conditions.push(lte(appointments.date, endDate));
    }
    if (staffId) {
      conditions.push(eq2(appointments.staffId, Number(staffId)));
    }
    if (status && typeof status === "string" && status !== "ALL") {
      conditions.push(eq2(appointments.status, status));
    }
    const appts = conditions.length > 0 ? await query.where(and2(...conditions)).orderBy(appointments.date, appointments.startTime) : await query.orderBy(desc2(appointments.date), appointments.startTime);
    const enriched = await Promise.all(
      appts.map(async (apt) => {
        const aptSvcs = await db.select().from(appointmentServices).where(eq2(appointmentServices.appointmentId, apt.id));
        return {
          ...apt,
          services: aptSvcs
        };
      })
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/appointments", async (req, res) => {
  try {
    const { customerId, staffId, serviceIds, date, startTime, notes } = req.body;
    if (!customerId || !staffId || !serviceIds || !serviceIds.length || !date || !startTime) {
      return res.status(400).json({ error: "Customer, Staff, at least one Service, Date and Start Time are required." });
    }
    const cust = await db.select().from(customers).where(eq2(customers.id, Number(customerId))).limit(1);
    if (!cust[0]) return res.status(404).json({ error: "Customer not found." });
    const st = await db.select().from(staff).where(eq2(staff.id, Number(staffId))).limit(1);
    if (!st[0]) return res.status(404).json({ error: "Staff member not found." });
    const selectedServices = await db.select().from(services).where(sql2`${services.id} IN (${sql2.join(serviceIds.map((id) => sql2`${id}`), sql2`, `)})`);
    const totalDuration = selectedServices.reduce((acc, s) => acc + (s.duration || 30), 0);
    const totalAmount = selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);
    const [startH, startM] = startTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + totalDuration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    const hasConflict = await hasStaffAppointmentConflict(Number(staffId), date, startTime, endTime);
    if (hasConflict) {
      return res.status(409).json({
        error: `Staff member is already booked during this time (${startTime} - ${endTime} on ${date}). Please select another staff member or choose an alternative time slot.`,
        conflict: true
      });
    }
    const uniqueYear = (/* @__PURE__ */ new Date()).getFullYear();
    const randomSuffix = Math.floor(1e3 + Math.random() * 9e3);
    const assignedBookingCode = req.body.bookingCode || `BK-ADM-${uniqueYear}-${randomSuffix}`;
    const bookingSource = req.body.source || "Admin Booking";
    const apt = await db.insert(appointments).values({
      bookingCode: assignedBookingCode,
      source: bookingSource,
      customerId: cust[0].id,
      customerName: cust[0].name,
      customerPhone: cust[0].phone,
      customerEmail: cust[0].email || null,
      staffId: st[0].id,
      staffName: st[0].name,
      date,
      startTime,
      endTime,
      status: req.body.status || "Booked",
      paymentStatus: "Pending",
      notes: notes || null,
      totalAmount
    }).returning();
    for (const s of selectedServices) {
      await db.insert(appointmentServices).values({
        appointmentId: apt[0].id,
        serviceId: s.id,
        serviceName: s.name,
        price: s.price,
        duration: s.duration
      });
    }
    await db.insert(notifications).values({
      type: "APPOINTMENT",
      title: `New Appointment: ${cust[0].name}`,
      message: `Appointment booked with ${st[0].name} on ${date} at ${startTime} (${selectedServices.map((s) => s.name).join(", ")})`,
      referenceId: String(apt[0].id)
    });
    await db.insert(activityLogs).values({
      action: "APPOINTMENT_CREATED",
      description: `Booked appointment #${apt[0].id} for ${cust[0].name} with ${st[0].name} on ${date} at ${startTime}`,
      entityType: "Appointment",
      entityId: String(apt[0].id)
    });
    res.json({ ...apt[0], services: selectedServices });
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/appointments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, paymentStatus, staffId, date, startTime, endTime, notes } = req.body;
    const existing = await db.select().from(appointments).where(eq2(appointments.id, id)).limit(1);
    if (!existing[0]) return res.status(404).json({ error: "Appointment not found" });
    const targetStaff = staffId ? Number(staffId) : existing[0].staffId;
    const targetDate = date || existing[0].date;
    const targetStart = startTime || existing[0].startTime;
    const targetEnd = endTime || existing[0].endTime;
    if (date || startTime || staffId) {
      const conflict = await hasStaffAppointmentConflict(targetStaff, targetDate, targetStart, targetEnd, id);
      if (conflict) {
        return res.status(409).json({
          error: `Staff member is already booked during this time (${targetStart} - ${targetEnd}).`,
          conflict: true
        });
      }
    }
    const updated = await db.update(appointments).set({
      status: status || existing[0].status,
      paymentStatus: paymentStatus || existing[0].paymentStatus,
      staffId: targetStaff,
      date: targetDate,
      startTime: targetStart,
      endTime: targetEnd,
      notes: notes !== void 0 ? notes : existing[0].notes,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(appointments.id, id)).returning();
    if (status === "Cancelled" && existing[0].status !== "Cancelled") {
      await db.insert(notifications).values({
        type: "CANCELLATION",
        title: `Appointment Cancelled: #${id}`,
        message: `Appointment for ${existing[0].customerName} on ${existing[0].date} at ${existing[0].startTime} was cancelled.`,
        referenceId: String(id)
      });
    }
    await db.insert(activityLogs).values({
      action: "APPOINTMENT_UPDATED",
      description: `Updated appointment #${id} status to ${status || existing[0].status}`,
      entityType: "Appointment",
      entityId: String(id)
    });
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.delete("/appointments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(appointmentServices).where(eq2(appointmentServices.appointmentId, id));
    await db.delete(appointments).where(eq2(appointments.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
function getEligibleStaffRolesForService(categoryName, serviceName) {
  const cat = (categoryName || "").toUpperCase();
  const sName = (serviceName || "").toLowerCase();
  if (cat.includes("MAKEUP") || sName.includes("makeup") || sName.includes("bridal") || sName.includes("party makeup")) {
    return ["Makeup Artist"];
  }
  if (cat.includes("HAIR") || sName.includes("hair") || sName.includes("cut") || sName.includes("blowdry") || sName.includes("keratin") || sName.includes("color") || sName.includes("smoothening") || sName.includes("beard")) {
    return ["Hair Stylist"];
  }
  if (cat.includes("WAXING") || cat.includes("THREADING") || sName.includes("wax") || sName.includes("thread") || sName.includes("rica") || sName.includes("upper lip") || sName.includes("eyebrow")) {
    return ["Waxing & Threading Specialist"];
  }
  if (cat.includes("MANICURE") || cat.includes("PEDICURE") || sName.includes("nail") || sName.includes("manicure") || sName.includes("pedicure") || sName.includes("paraffin")) {
    return ["Manicure & Pedicure Specialist"];
  }
  if (cat.includes("SPA") || cat.includes("FACIAL") || cat.includes("SKIN") || sName.includes("massage") || sName.includes("spa") || sName.includes("facial") || sName.includes("bleach") || sName.includes("d-tan") || sName.includes("clean up")) {
    return ["Spa Specialist"];
  }
  if (cat.includes("FASHION") || sName.includes("draping") || sName.includes("saree") || sName.includes("styling")) {
    return ["Fashion Stylist"];
  }
  return ["Hair Stylist", "Makeup Artist", "Waxing & Threading Specialist", "Manicure & Pedicure Specialist", "Spa Specialist", "Fashion Stylist"];
}
apiRouter.get("/appointments/availability", async (req, res) => {
  try {
    const { date, serviceId, serviceIds, staffId, duration: customDuration, staffAssignments } = req.query;
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Date is required (YYYY-MM-DD)." });
    }
    const slotTimes = [
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00",
      "18:30",
      "19:00",
      "19:30",
      "20:00"
    ];
    let duration = 30;
    let targetRoles = [];
    let parsedSvcIds = [];
    if (typeof serviceIds === "string" && serviceIds.trim()) {
      parsedSvcIds = serviceIds.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0);
    } else if (serviceId && !isNaN(Number(serviceId))) {
      parsedSvcIds = [Number(serviceId)];
    }
    let loadedServices = [];
    if (parsedSvcIds.length > 0) {
      loadedServices = await db.select().from(services).where(inArray(services.id, parsedSvcIds));
      if (loadedServices.length > 0) {
        duration = loadedServices.reduce((sum, s) => sum + (s.duration || 30), 0);
        const roleSets = loadedServices.map((s) => getEligibleStaffRolesForService(s.categoryName, s.name));
        const commonRoles = roleSets.reduce((acc, cur) => acc.filter((r) => cur.includes(r)), roleSets[0] || []);
        targetRoles = commonRoles.length > 0 ? commonRoles : Array.from(new Set(roleSets.flat()));
      }
    }
    if (customDuration && !isNaN(Number(customDuration))) {
      duration = Number(customDuration);
    }
    let parsedAssignments = {};
    if (typeof staffAssignments === "string" && staffAssignments.trim()) {
      try {
        parsedAssignments = JSON.parse(staffAssignments);
      } catch (e) {
        parsedAssignments = {};
      }
    }
    const allActiveStaff = await db.select().from(staff).where(eq2(staff.isActive, true));
    let eligibleStaff = allActiveStaff;
    if (staffId && staffId !== "ANY" && !isNaN(Number(staffId))) {
      eligibleStaff = allActiveStaff.filter((s) => s.id === Number(staffId));
    } else if (targetRoles.length > 0) {
      const roleSet = new Set(targetRoles);
      const matchingStaff = allActiveStaff.filter((s) => roleSet.has(s.role) && s.role !== "Helper");
      if (matchingStaff.length > 0) {
        eligibleStaff = matchingStaff;
      }
    }
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const isToday = date === todayStr;
    const now = /* @__PURE__ */ new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const results = await Promise.all(
      slotTimes.map(async (timeStr) => {
        const [h, m] = timeStr.split(":").map(Number);
        const slotStartM = h * 60 + m;
        if (isToday && slotStartM <= currentMinutes + 15) {
          return {
            time: timeStr,
            label: formatTimeLabel(timeStr),
            available: false,
            reason: "Past time"
          };
        }
        const endM = slotStartM + duration;
        const endH = Math.floor(endM / 60);
        const endMin = endM % 60;
        const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
        const hasPerServiceSelection = Object.keys(parsedAssignments).length > 0 && loadedServices.length > 0;
        if (hasPerServiceSelection) {
          let allServicesAvailable = true;
          const assignedStaffInThisSlot = /* @__PURE__ */ new Set();
          for (const s of loadedServices) {
            const chosenStaffVal = parsedAssignments[s.id];
            const allowedRoles = getEligibleStaffRolesForService(s.categoryName, s.name);
            if (chosenStaffVal && chosenStaffVal !== "ANY" && !isNaN(Number(chosenStaffVal))) {
              const specStaffId = Number(chosenStaffVal);
              const conflict = await hasStaffAppointmentConflict(specStaffId, date, timeStr, endTimeStr);
              if (conflict) {
                allServicesAvailable = false;
                break;
              }
              assignedStaffInThisSlot.add(specStaffId);
            } else {
              const roleMatchingStaff = allActiveStaff.filter(
                (st) => allowedRoles.includes(st.role) && st.role !== "Helper"
              );
              let foundFree = false;
              for (const st of roleMatchingStaff) {
                const conflict = await hasStaffAppointmentConflict(st.id, date, timeStr, endTimeStr);
                if (!conflict) {
                  foundFree = true;
                  break;
                }
              }
              if (!foundFree) {
                allServicesAvailable = false;
                break;
              }
            }
          }
          return {
            time: timeStr,
            label: formatTimeLabel(timeStr),
            available: allServicesAvailable,
            freeStaffCount: allServicesAvailable ? 1 : 0
          };
        }
        let hasAvailableStaff = false;
        let freeStaffCount = 0;
        for (const st of eligibleStaff) {
          const conflict = await hasStaffAppointmentConflict(st.id, date, timeStr, endTimeStr);
          if (!conflict) {
            hasAvailableStaff = true;
            freeStaffCount++;
          }
        }
        return {
          time: timeStr,
          label: formatTimeLabel(timeStr),
          available: hasAvailableStaff,
          freeStaffCount
        };
      })
    );
    res.json({
      date,
      serviceDuration: duration,
      eligibleStaffCount: eligibleStaff.length,
      slots: results
    });
  } catch (error) {
    console.error("Availability check error:", error);
    res.status(500).json({ error: error.message });
  }
});
function formatTimeLabel(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}
apiRouter.post("/appointments/online-book", async (req, res) => {
  try {
    const {
      serviceId,
      serviceIds,
      staffId,
      staffAssignments,
      // Map of { [serviceId]: staffId | 'ANY' }
      date,
      startTime,
      customerName,
      customerPhone,
      customerEmail,
      notes
    } = req.body;
    let rawServiceIds = [];
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      rawServiceIds = serviceIds.map(Number).filter((n) => !isNaN(n) && n > 0);
    } else if (typeof serviceIds === "string" && serviceIds.trim()) {
      rawServiceIds = serviceIds.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0);
    } else if (serviceId && !isNaN(Number(serviceId))) {
      rawServiceIds = [Number(serviceId)];
    }
    if (rawServiceIds.length === 0) {
      return res.status(400).json({ error: "Please select at least one salon service." });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: "Please provide your full name." });
    }
    if (!customerPhone || customerPhone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ error: "Please provide a valid 10-digit mobile number." });
    }
    if (!date || !startTime) {
      return res.status(400).json({ error: "Please choose an appointment date and time." });
    }
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (date < todayStr) {
      return res.status(400).json({ error: "Appointment date cannot be in the past." });
    }
    const selectedServices = await db.select().from(services).where(inArray(services.id, rawServiceIds));
    if (selectedServices.length === 0) {
      return res.status(404).json({ error: "Selected services were not found." });
    }
    const duration = selectedServices.reduce((sum, s) => sum + (s.duration || 30), 0);
    const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const [startH, startM] = startTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    const allActiveStaff = await db.select().from(staff).where(eq2(staff.isActive, true));
    let parsedStaffMap = {};
    if (staffAssignments && typeof staffAssignments === "object") {
      parsedStaffMap = staffAssignments;
    } else if (typeof staffAssignments === "string" && staffAssignments.trim()) {
      try {
        parsedStaffMap = JSON.parse(staffAssignments);
      } catch (e) {
        parsedStaffMap = {};
      }
    }
    const resolvedAssignments = [];
    const usedStaffIdsInThisBooking = /* @__PURE__ */ new Set();
    for (const s of selectedServices) {
      const allowedRoles = getEligibleStaffRolesForService(s.categoryName, s.name);
      const chosenStaffVal = parsedStaffMap[s.id] !== void 0 ? parsedStaffMap[s.id] : staffId;
      let chosenStaff = null;
      let isAutoAssigned = false;
      if (chosenStaffVal && chosenStaffVal !== "ANY" && !isNaN(Number(chosenStaffVal))) {
        const targetStaffId = Number(chosenStaffVal);
        const st = allActiveStaff.find((item) => item.id === targetStaffId);
        if (!st) {
          return res.status(404).json({ error: `Selected specialist for ${s.name} was not found.` });
        }
        if (!allowedRoles.includes(st.role)) {
          return res.status(400).json({
            error: `Invalid specialist selection: ${st.name} is a ${st.role} and cannot be assigned to ${s.name} (${s.categoryName}). Please select a specialist matching this service.`
          });
        }
        const hasConflict = await hasStaffAppointmentConflict(st.id, date, startTime, endTime);
        if (hasConflict) {
          return res.status(409).json({
            error: `${st.name} is already booked at ${formatTimeLabel(startTime)}. Please choose another time or specialist.`,
            conflict: true
          });
        }
        chosenStaff = st;
      } else {
        isAutoAssigned = true;
        const matchingStaff = allActiveStaff.filter(
          (st) => allowedRoles.includes(st.role) && st.role !== "Helper"
        );
        for (const st of matchingStaff) {
          const hasConflict = await hasStaffAppointmentConflict(st.id, date, startTime, endTime);
          if (!hasConflict) {
            chosenStaff = st;
            break;
          }
        }
        if (!chosenStaff) {
          for (const st of allActiveStaff) {
            if (st.role !== "Helper") {
              const hasConflict = await hasStaffAppointmentConflict(st.id, date, startTime, endTime);
              if (!hasConflict) {
                chosenStaff = st;
                break;
              }
            }
          }
        }
        if (!chosenStaff) {
          return res.status(409).json({
            error: `No available specialist could be assigned for ${s.name} at ${formatTimeLabel(startTime)}. Please choose another time slot.`,
            conflict: true
          });
        }
      }
      usedStaffIdsInThisBooking.add(chosenStaff.id);
      resolvedAssignments.push({
        serviceId: s.id,
        serviceName: s.name,
        categoryName: s.categoryName,
        price: s.price,
        duration: s.duration || 30,
        staffId: chosenStaff.id,
        staffName: chosenStaff.name,
        gender: chosenStaff.gender || "Staff",
        role: chosenStaff.role,
        specialization: chosenStaff.specialization,
        isAutoAssigned
      });
    }
    const primaryStaff = allActiveStaff.find((st) => st.id === resolvedAssignments[0].staffId) || allActiveStaff[0];
    const uniqueStaffNames = Array.from(new Set(resolvedAssignments.map((a) => `${a.staffName} (${a.role})`)));
    const aggregateStaffName = uniqueStaffNames.length === 1 ? resolvedAssignments[0].staffName : uniqueStaffNames.join(", ");
    const cleanPhone = customerPhone.trim();
    const existingCust = await db.select().from(customers).where(eq2(customers.phone, cleanPhone)).limit(1);
    let customerRecordId;
    if (existingCust[0]) {
      customerRecordId = existingCust[0].id;
      if (customerEmail && !existingCust[0].email) {
        await db.update(customers).set({ email: customerEmail.trim() }).where(eq2(customers.id, customerRecordId));
      }
    } else {
      const newCust = await db.insert(customers).values({
        name: customerName.trim(),
        phone: cleanPhone,
        email: customerEmail ? customerEmail.trim() : null,
        totalVisits: 1,
        loyaltyPoints: 0,
        totalSpent: 0,
        notes: "Customer created via Online Booking Portal"
      }).returning();
      customerRecordId = newCust[0].id;
    }
    const uniqueNum = Math.floor(1e3 + Math.random() * 9e3);
    const bookingCode = `BK-ONL-${(/* @__PURE__ */ new Date()).getFullYear()}-${uniqueNum}`;
    const readableAssignments = resolvedAssignments.map((a) => `\u2022 ${a.serviceName} (\u20B9${a.price}): ${a.staffName} [${a.role} \u2022 ${a.gender}]${a.isAutoAssigned ? " (Auto-assigned)" : ""}`).join("\n");
    const customerNotesPrefix = notes && notes.trim() ? `${notes.trim()}

` : "";
    const structuredNotes = `${customerNotesPrefix}Specialist Assignments:
${readableAssignments}

<!--SERVICE_ASSIGNMENTS:${JSON.stringify(resolvedAssignments)}-->`;
    const apt = await db.insert(appointments).values({
      bookingCode,
      source: "Online Booking",
      customerId: customerRecordId,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerEmail: customerEmail ? customerEmail.trim() : null,
      staffId: primaryStaff.id,
      staffName: aggregateStaffName,
      date,
      startTime,
      endTime,
      status: "Confirmed",
      paymentStatus: "Pending",
      notes: structuredNotes,
      totalAmount
    }).returning();
    for (const s of selectedServices) {
      await db.insert(appointmentServices).values({
        appointmentId: apt[0].id,
        serviceId: s.id,
        serviceName: s.name,
        price: s.price,
        duration: s.duration || 30
      });
    }
    const serviceSummary = selectedServices.map((s) => s.name).join(", ");
    await db.insert(notifications).values({
      type: "APPOINTMENT",
      title: `\u{1F310} Online Booking: ${customerName.trim()}`,
      message: `${serviceSummary} (${selectedServices.length} services) booked with ${aggregateStaffName} on ${date} at ${formatTimeLabel(startTime)} (${bookingCode})`,
      referenceId: String(apt[0].id)
    });
    await db.insert(activityLogs).values({
      action: "ONLINE_BOOKING",
      description: `Online booking #${apt[0].id} (${bookingCode}) by ${customerName.trim()} for ${serviceSummary} with specialists: ${aggregateStaffName}`,
      entityType: "Appointment",
      entityId: String(apt[0].id)
    });
    res.json({
      success: true,
      bookingCode,
      appointment: apt[0],
      services: selectedServices,
      service: selectedServices[0],
      // for backward compatibility
      staff: primaryStaff,
      serviceAssignments: resolvedAssignments,
      allAssignedStaff: Array.from(usedStaffIdsInThisBooking).map((id) => allActiveStaff.find((st) => st.id === id))
    });
  } catch (error) {
    console.error("Online booking error:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/appointments/lookup", async (req, res) => {
  try {
    const { code, phone } = req.query;
    if (!code && !phone) {
      return res.status(400).json({ error: "Please provide either your Booking Code or Phone Number to look up your booking." });
    }
    let results = [];
    if (code && typeof code === "string") {
      const trimmedCode = code.trim().toUpperCase();
      results = await db.select().from(appointments).where(eq2(appointments.bookingCode, trimmedCode)).limit(1);
    } else if (phone && typeof phone === "string") {
      const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
      results = await db.select().from(appointments).where(eq2(appointments.customerPhone, cleanPhone)).orderBy(desc2(appointments.id)).limit(5);
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "No booking found matching your details. Please verify your booking code or phone number." });
    }
    const sanitizedBookings = await Promise.all(
      results.map(async (apt) => {
        const aptSvcs = await db.select({
          serviceName: services.name,
          duration: services.duration,
          price: services.price
        }).from(appointmentServices).innerJoin(services, eq2(appointmentServices.serviceId, services.id)).where(eq2(appointmentServices.appointmentId, apt.id));
        let serviceAssignments = [];
        if (apt.notes && apt.notes.includes("<!--SERVICE_ASSIGNMENTS:")) {
          try {
            const match = apt.notes.match(/<!--SERVICE_ASSIGNMENTS:(.*?)-->/);
            if (match && match[1]) {
              serviceAssignments = JSON.parse(match[1]);
            }
          } catch (e) {
          }
        }
        const displayNotes = apt.notes ? apt.notes.replace(/<!--SERVICE_ASSIGNMENTS:.*?-->/s, "").trim() : "";
        return {
          id: apt.id,
          bookingCode: apt.bookingCode || `APT-${apt.id}`,
          customerName: apt.customerName,
          customerPhone: `******${apt.customerPhone.slice(-4)}`,
          // Privacy masking
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          staffName: apt.staffName,
          status: apt.status,
          paymentStatus: apt.paymentStatus,
          totalAmount: apt.totalAmount,
          services: aptSvcs,
          serviceAssignments,
          notes: displayNotes
        };
      })
    );
    res.json({ success: true, bookings: sanitizedBookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/pos/bill", async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      items,
      // array of { serviceId, serviceName, staffId, staffName, price, quantity }
      discount,
      discountReason,
      paidAmount,
      paymentMethod,
      appointmentId,
      notes
    } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: "At least one service item is required to generate a bill." });
    }
    let finalCustomer;
    if (customerId) {
      const c = await db.select().from(customers).where(eq2(customers.id, Number(customerId))).limit(1);
      finalCustomer = c[0];
    }
    if (!finalCustomer) {
      if (!customerName || !customerPhone) {
        return res.status(400).json({ error: "Customer Name and Phone are required for walk-in customer." });
      }
      const existing = await db.select().from(customers).where(eq2(customers.phone, customerPhone.trim())).limit(1);
      if (existing.length > 0) {
        finalCustomer = existing[0];
      } else {
        const created = await db.insert(customers).values({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          notes: "Walk-in customer"
        }).returning();
        finalCustomer = created[0];
        await db.insert(loyaltyAccounts).values({
          customerId: finalCustomer.id,
          customerName: finalCustomer.name,
          currentPoints: 0,
          totalPointsEarned: 0,
          totalPointsRedeemed: 0
        });
      }
    }
    const settingsList = await db.select().from(salonSettings).limit(1);
    const settings = settingsList[0] || { gstRate: 18, taxEnabled: true };
    const subtotal = items.reduce((acc, item) => {
      const qty = item.quantity ? Number(item.quantity) : 1;
      const price = Number(item.price || item.unitPrice || 0);
      return acc + price * qty;
    }, 0);
    const calc = calculateBillTotals(
      subtotal,
      Number(discount || 0),
      settings.gstRate,
      settings.taxEnabled
    );
    const numericPaid = Math.max(0, Math.round(Number(paidAmount || 0)));
    const balanceAmount = Math.max(0, calc.grandTotal - numericPaid);
    let status = "Pending";
    if (numericPaid >= calc.grandTotal) {
      status = "Paid";
    } else if (numericPaid > 0) {
      status = "Partial";
    }
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const invoiceNumber = await generateNextInvoiceNumber();
    const primaryStaffId = items[0]?.staffId ? Number(items[0].staffId) : null;
    const primaryStaffName = items[0]?.staffName || null;
    const inv = await db.insert(invoices).values({
      invoiceNumber,
      appointmentId: appointmentId ? Number(appointmentId) : null,
      customerId: finalCustomer.id,
      customerName: finalCustomer.name,
      customerPhone: finalCustomer.phone,
      staffId: primaryStaffId,
      staffName: primaryStaffName,
      date: todayStr,
      subtotal: calc.subtotal,
      discount: calc.discount,
      discountReason: discountReason || null,
      taxRate: calc.taxRate,
      taxAmount: calc.taxAmount,
      grandTotal: calc.grandTotal,
      paidAmount: numericPaid,
      balanceAmount,
      status,
      paymentMethod: paymentMethod || "UPI",
      notes: notes || null
    }).returning();
    for (const item of items) {
      const qty = item.quantity ? Number(item.quantity) : 1;
      const unitPrice = Number(item.price || item.unitPrice || 0);
      await db.insert(invoiceItems).values({
        invoiceId: inv[0].id,
        serviceId: item.serviceId ? Number(item.serviceId) : null,
        serviceName: item.serviceName || item.name || "Salon Service",
        staffId: item.staffId ? Number(item.staffId) : primaryStaffId,
        staffName: item.staffName || primaryStaffName,
        unitPrice,
        quantity: qty,
        total: unitPrice * qty
      });
    }
    let paymentRecord = null;
    if (numericPaid > 0) {
      const paymentNumber = await generateNextPaymentNumber();
      const p = await db.insert(payments).values({
        paymentNumber,
        invoiceId: inv[0].id,
        invoiceNumber: inv[0].invoiceNumber,
        customerId: finalCustomer.id,
        customerName: finalCustomer.name,
        amount: numericPaid,
        paymentMethod: paymentMethod || "UPI",
        status,
        date: todayStr,
        notes: `Initial payment for ${invoiceNumber}`
      }).returning();
      paymentRecord = p[0];
      const earnedPoints = Math.floor(numericPaid / 100);
      if (earnedPoints > 0) {
        await db.update(customers).set({
          loyaltyPoints: sql2`${customers.loyaltyPoints} + ${earnedPoints}`,
          totalVisits: sql2`${customers.totalVisits} + 1`,
          totalSpent: sql2`${customers.totalSpent} + ${numericPaid}`,
          lastVisit: /* @__PURE__ */ new Date()
        }).where(eq2(customers.id, finalCustomer.id));
        await db.update(loyaltyAccounts).set({
          currentPoints: sql2`${loyaltyAccounts.currentPoints} + ${earnedPoints}`,
          totalPointsEarned: sql2`${loyaltyAccounts.totalPointsEarned} + ${earnedPoints}`,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(loyaltyAccounts.customerId, finalCustomer.id));
        await db.insert(loyaltyTransactions).values({
          customerId: finalCustomer.id,
          type: "EARNED",
          points: earnedPoints,
          invoiceId: inv[0].id,
          description: `Earned ${earnedPoints} points on ${invoiceNumber} payment`,
          date: todayStr
        });
      }
    }
    if (appointmentId) {
      await db.update(appointments).set({
        status: "Completed",
        paymentStatus: status,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(appointments.id, Number(appointmentId)));
    }
    if (balanceAmount > 0) {
      await db.insert(notifications).values({
        type: "PAYMENT_PENDING",
        title: `Pending Payment: ${invoiceNumber}`,
        message: `${finalCustomer.name} has a pending balance of \u20B9${balanceAmount.toLocaleString("en-IN")}.`,
        referenceId: invoiceNumber
      });
    }
    await db.insert(activityLogs).values({
      action: "INVOICE_CREATED",
      description: `Generated ${invoiceNumber} for ${finalCustomer.name}: Grand Total \u20B9${calc.grandTotal.toLocaleString("en-IN")}, Paid \u20B9${numericPaid.toLocaleString("en-IN")}`,
      entityType: "Invoice",
      entityId: invoiceNumber
    });
    res.json({
      invoice: inv[0],
      items,
      payment: paymentRecord,
      totals: calc
    });
  } catch (error) {
    console.error("POS Error:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/invoices", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const { status, search } = req.query;
    let query = db.select().from(invoices);
    const conditions = [];
    if (status && typeof status === "string" && status !== "ALL") {
      conditions.push(eq2(invoices.status, status));
    }
    if (search && typeof search === "string") {
      const q = `%${search.trim()}%`;
      conditions.push(or(like(invoices.invoiceNumber, q), like(invoices.customerName, q), like(invoices.customerPhone, q)));
    }
    const list = conditions.length > 0 ? await query.where(and2(...conditions)).orderBy(desc2(invoices.id)) : await query.orderBy(desc2(invoices.id));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/invoices/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const inv = await db.select().from(invoices).where(eq2(invoices.id, id)).limit(1);
    if (!inv[0]) return res.status(404).json({ error: "Invoice not found" });
    const items = await db.select().from(invoiceItems).where(eq2(invoiceItems.invoiceId, id));
    const invPayments = await db.select().from(payments).where(eq2(payments.invoiceId, id)).orderBy(desc2(payments.id));
    const salon = await db.select().from(salonSettings).limit(1);
    res.json({
      invoice: inv[0],
      items,
      payments: invPayments,
      salon: salon[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/invoices/:id/pay", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, paymentMethod, transactionReference, notes } = req.body;
    const inv = await db.select().from(invoices).where(eq2(invoices.id, id)).limit(1);
    if (!inv[0]) return res.status(404).json({ error: "Invoice not found" });
    const additionalAmount = Math.round(Number(amount));
    if (additionalAmount <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than zero." });
    }
    if (additionalAmount > inv[0].balanceAmount) {
      return res.status(400).json({
        error: `Payment amount \u20B9${additionalAmount.toLocaleString("en-IN")} exceeds remaining balance of \u20B9${inv[0].balanceAmount.toLocaleString("en-IN")}.`
      });
    }
    const newPaidAmount = inv[0].paidAmount + additionalAmount;
    const newBalance = Math.max(0, inv[0].grandTotal - newPaidAmount);
    const newStatus = newBalance === 0 ? "Paid" : "Partial";
    const updatedInvoice = await db.update(invoices).set({
      paidAmount: newPaidAmount,
      balanceAmount: newBalance,
      status: newStatus,
      paymentMethod: paymentMethod || inv[0].paymentMethod,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(invoices.id, id)).returning();
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const paymentNumber = await generateNextPaymentNumber();
    const payment = await db.insert(payments).values({
      paymentNumber,
      invoiceId: id,
      invoiceNumber: inv[0].invoiceNumber,
      customerId: inv[0].customerId,
      customerName: inv[0].customerName,
      amount: additionalAmount,
      paymentMethod: paymentMethod || "UPI",
      status: newStatus,
      transactionReference: transactionReference || null,
      notes: notes || `Installment payment for ${inv[0].invoiceNumber}`,
      date: todayStr
    }).returning();
    const earnedPoints = Math.floor(additionalAmount / 100);
    if (earnedPoints > 0) {
      await db.update(customers).set({
        loyaltyPoints: sql2`${customers.loyaltyPoints} + ${earnedPoints}`,
        totalSpent: sql2`${customers.totalSpent} + ${additionalAmount}`
      }).where(eq2(customers.id, inv[0].customerId));
      await db.update(loyaltyAccounts).set({
        currentPoints: sql2`${loyaltyAccounts.currentPoints} + ${earnedPoints}`,
        totalPointsEarned: sql2`${loyaltyAccounts.totalPointsEarned} + ${earnedPoints}`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(loyaltyAccounts.customerId, inv[0].customerId));
      await db.insert(loyaltyTransactions).values({
        customerId: inv[0].customerId,
        type: "EARNED",
        points: earnedPoints,
        invoiceId: id,
        description: `Earned ${earnedPoints} points on installment payment ${paymentNumber}`,
        date: todayStr
      });
    }
    if (newStatus === "Paid" && inv[0].appointmentId) {
      await db.update(appointments).set({ paymentStatus: "Paid", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(appointments.id, inv[0].appointmentId));
    }
    await db.insert(activityLogs).values({
      action: "PAYMENT_RECEIVED",
      description: `Received payment of \u20B9${additionalAmount.toLocaleString("en-IN")} for ${inv[0].invoiceNumber}. Remaining balance: \u20B9${newBalance.toLocaleString("en-IN")}`,
      entityType: "Payment",
      entityId: paymentNumber
    });
    res.json({
      invoice: updatedInvoice[0],
      payment: payment[0],
      message: `Payment of \u20B9${additionalAmount.toLocaleString("en-IN")} successfully recorded.`
    });
  } catch (error) {
    console.error("Error applying payment:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/payments", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const list = await db.select().from(payments).orderBy(desc2(payments.id));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/expenses", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const { category, startDate, endDate } = req.query;
    let query = db.select().from(expenses);
    const conditions = [];
    if (category && typeof category === "string" && category !== "ALL") {
      conditions.push(eq2(expenses.category, category));
    }
    if (startDate && typeof startDate === "string") {
      conditions.push(gte(expenses.date, startDate));
    }
    if (endDate && typeof endDate === "string") {
      conditions.push(lte(expenses.date, endDate));
    }
    const list = conditions.length > 0 ? await query.where(and2(...conditions)).orderBy(desc2(expenses.date), desc2(expenses.id)) : await query.orderBy(desc2(expenses.date), desc2(expenses.id));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/expenses", async (req, res) => {
  try {
    const { title, category, amount, date, paymentMethod, description, addedBy } = req.body;
    if (!title || !category || amount === void 0) {
      return res.status(400).json({ error: "Title, Category, and Amount in \u20B9 are required." });
    }
    const created = await db.insert(expenses).values({
      title,
      category,
      amount: Math.round(Number(amount)),
      date: date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      paymentMethod: paymentMethod || "Bank Transfer",
      description: description || null,
      addedBy: addedBy || "Owner"
    }).returning();
    await db.insert(activityLogs).values({
      action: "EXPENSE_ADDED",
      description: `Added expense: ${title} (\u20B9${amount} - ${category})`,
      entityType: "Expense",
      entityId: String(created[0].id)
    });
    res.json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.delete("/expenses/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(expenses).where(eq2(expenses.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/inventory", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const products = await db.select().from(inventoryProducts).orderBy(inventoryProducts.name);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/inventory", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const { name, category, sku, supplierId, purchasePrice, sellingPrice, currentStock, minStockLevel, unit, expiryDate } = req.body;
    if (!name || !category || !sku || purchasePrice === void 0 || sellingPrice === void 0) {
      return res.status(400).json({ error: "Product name, category, SKU, purchase price and selling price are required." });
    }
    const existingSku = await db.select().from(inventoryProducts).where(eq2(inventoryProducts.sku, sku.trim())).limit(1);
    if (existingSku.length > 0) {
      return res.status(400).json({ error: `Product with SKU ${sku} already exists.` });
    }
    let supplierName = null;
    if (supplierId) {
      const s = await db.select().from(suppliers).where(eq2(suppliers.id, Number(supplierId))).limit(1);
      supplierName = s[0]?.name || null;
    }
    const initStock = Math.max(0, Math.round(Number(currentStock || 0)));
    const created = await db.insert(inventoryProducts).values({
      name,
      category,
      sku: sku.trim(),
      supplierId: supplierId ? Number(supplierId) : null,
      supplierName,
      purchasePrice: Math.round(Number(purchasePrice)),
      sellingPrice: Math.round(Number(sellingPrice)),
      currentStock: initStock,
      minStockLevel: Math.round(Number(minStockLevel || 5)),
      unit: unit || "Units",
      expiryDate: expiryDate || null,
      isActive: true
    }).returning();
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (initStock > 0) {
      await db.insert(inventoryMovements).values({
        productId: created[0].id,
        productName: created[0].name,
        quantity: initStock,
        previousStock: 0,
        newStock: initStock,
        type: "PURCHASE",
        reason: "Initial opening stock",
        performedBy: "Owner",
        date: todayStr
      });
    }
    await db.insert(activityLogs).values({
      action: "PRODUCT_ADDED",
      description: `Added product: ${name} (SKU: ${sku}, Stock: ${initStock})`,
      entityType: "Product",
      entityId: String(created[0].id)
    });
    res.json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/inventory/:id/movement", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { quantity, type, reason, performedBy } = req.body;
    const prod = await db.select().from(inventoryProducts).where(eq2(inventoryProducts.id, id)).limit(1);
    if (!prod[0]) return res.status(404).json({ error: "Product not found." });
    const qty = Math.round(Number(quantity));
    if (qty === 0) {
      return res.status(400).json({ error: "Quantity must not be zero." });
    }
    const previousStock = prod[0].currentStock;
    let newStock = previousStock;
    if (type === "PURCHASE" || type === "STOCK_IN" || type === "RETURN") {
      newStock = previousStock + Math.abs(qty);
    } else if (type === "SALE" || type === "STOCK_OUT" || type === "USAGE" || type === "WASTAGE") {
      const deduction = Math.abs(qty);
      if (previousStock - deduction < 0) {
        return res.status(400).json({
          error: `Insufficient stock! Current stock is ${previousStock}, cannot deduct ${deduction}. Negative stock is not allowed.`
        });
      }
      newStock = previousStock - deduction;
    } else if (type === "ADJUSTMENT") {
      if (qty < 0 && previousStock + qty < 0) {
        return res.status(400).json({ error: "Adjustment would result in negative stock!" });
      }
      newStock = previousStock + qty;
    }
    const updated = await db.update(inventoryProducts).set({
      currentStock: newStock,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(inventoryProducts.id, id)).returning();
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    await db.insert(inventoryMovements).values({
      productId: id,
      productName: prod[0].name,
      quantity: newStock - previousStock,
      previousStock,
      newStock,
      type: type || "ADJUSTMENT",
      reason: reason || "Stock update",
      performedBy: performedBy || "Owner",
      date: todayStr
    });
    if (newStock <= prod[0].minStockLevel) {
      await db.insert(notifications).values({
        type: "LOW_STOCK",
        title: `Low Stock Alert: ${prod[0].name}`,
        message: `Current stock has fallen to ${newStock} ${prod[0].unit} (Min: ${prod[0].minStockLevel}). Please reorder.`,
        referenceId: prod[0].sku
      });
    }
    await db.insert(activityLogs).values({
      action: "STOCK_CHANGED",
      description: `Stock for ${prod[0].name} changed from ${previousStock} to ${newStock} (${type})`,
      entityType: "Product",
      entityId: String(id)
    });
    res.json({ product: updated[0], previousStock, newStock });
  } catch (error) {
    console.error("Stock movement error:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/inventory/movements", async (req, res) => {
  try {
    const movements = await db.select().from(inventoryMovements).orderBy(desc2(inventoryMovements.id)).limit(100);
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/suppliers", async (req, res) => {
  try {
    const list = await db.select().from(suppliers).orderBy(suppliers.name);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/suppliers", async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, gstNumber, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Supplier name and phone are required." });
    }
    const created = await db.insert(suppliers).values({
      name,
      contactPerson: contactPerson || null,
      phone,
      email: email || null,
      address: address || null,
      gstNumber: gstNumber || null,
      notes: notes || null
    }).returning();
    res.json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/packages", async (req, res) => {
  try {
    const pkgs = await db.select().from(packages).orderBy(packages.name);
    const enriched = await Promise.all(
      pkgs.map(async (p) => {
        const svcs = await db.select().from(packageServices).where(eq2(packageServices.packageId, p.id));
        return { ...p, services: svcs };
      })
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/packages", async (req, res) => {
  try {
    const { name, description, price, validityDays, serviceIds } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "Package name and price are required." });
    }
    const created = await db.insert(packages).values({
      name,
      description: description || null,
      price: Math.round(Number(price)),
      validityDays: validityDays ? Number(validityDays) : 90,
      isActive: true
    }).returning();
    if (serviceIds && serviceIds.length) {
      for (const sId of serviceIds) {
        const s = await db.select().from(services).where(eq2(services.id, Number(sId))).limit(1);
        if (s[0]) {
          await db.insert(packageServices).values({
            packageId: created[0].id,
            serviceId: s[0].id,
            serviceName: s[0].name,
            sessionsCount: 1
          });
        }
      }
    }
    res.json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/offers", async (req, res) => {
  try {
    const list = await db.select().from(offers).orderBy(desc2(offers.id));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/offers", async (req, res) => {
  try {
    const { title, code, discountType, discountValue, minBillAmount, serviceCategory, startDate, endDate, description } = req.body;
    if (!title || !code || !discountType || discountValue === void 0) {
      return res.status(400).json({ error: "Title, promo code, discount type and discount value are required." });
    }
    const created = await db.insert(offers).values({
      title,
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Math.round(Number(discountValue)),
      minBillAmount: minBillAmount ? Math.round(Number(minBillAmount)) : 0,
      serviceCategory: serviceCategory || "ALL",
      startDate: startDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      endDate: endDate || "2026-12-31",
      isActive: true,
      description: description || null
    }).returning();
    res.json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/loyalty", async (req, res) => {
  try {
    const accounts = await db.select().from(loyaltyAccounts).orderBy(desc2(loyaltyAccounts.currentPoints));
    const transactions = await db.select().from(loyaltyTransactions).orderBy(desc2(loyaltyTransactions.id)).limit(50);
    const settings = await db.select().from(salonSettings).limit(1);
    res.json({
      accounts,
      transactions,
      settings: {
        pointsPer100: settings[0]?.loyaltyPointsPer100 || 1,
        pointValueInr: settings[0]?.loyaltyPointValueInr || 1,
        minRedemptionPoints: settings[0]?.loyaltyMinRedemptionPoints || 50
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/reports", async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const allPayments = await db.select().from(payments);
    const paymentMethods = {};
    for (const p of allPayments) {
      const method = p.paymentMethod || "Other";
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].total += p.amount || 0;
    }
    const allItems = await db.select().from(invoiceItems);
    const servicePerformance = {};
    for (const item of allItems) {
      const name = item.serviceName;
      if (!servicePerformance[name]) {
        servicePerformance[name] = { bookings: 0, revenue: 0 };
      }
      servicePerformance[name].bookings += item.quantity || 1;
      servicePerformance[name].revenue += item.total || 0;
    }
    const serviceRankings = Object.entries(servicePerformance).map(([name, data]) => ({ service: name, ...data })).sort((a, b) => b.revenue - a.revenue);
    const allStaff = await db.select().from(staff);
    const staffReport = await Promise.all(
      allStaff.map(async (st) => {
        const stAppts = await db.select({ count: sql2`count(*)` }).from(appointments).where(eq2(appointments.staffId, st.id));
        const stSales = await db.select({ total: sql2`sum(${invoiceItems.total})` }).from(invoiceItems).where(eq2(invoiceItems.staffId, st.id));
        const revenue = Number(stSales[0]?.total || 0);
        const commission = Math.round(revenue * st.commissionPercentage / 100);
        return {
          staff: st.name,
          role: st.role,
          appointments: Number(stAppts[0]?.count || 0),
          revenue,
          commission
        };
      })
    );
    const allExpenses = await db.select().from(expenses);
    const expensesByCategory = {};
    let totalExpenseAmount = 0;
    for (const exp of allExpenses) {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
      totalExpenseAmount += exp.amount;
    }
    const totalRevenue = allPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const netRevenue = totalRevenue - totalExpenseAmount;
    const products = await db.select().from(inventoryProducts);
    let totalStockValue = 0;
    let lowStockCount = 0;
    for (const p of products) {
      totalStockValue += p.currentStock * p.purchasePrice;
      if (p.currentStock <= p.minStockLevel) {
        lowStockCount++;
      }
    }
    const totalCustomersRes = await db.select({ count: sql2`count(*)` }).from(customers);
    const totalCustCount = Number(totalCustomersRes[0]?.count || 0);
    res.json({
      totalRevenue,
      totalExpenses: totalExpenseAmount,
      netRevenue,
      paymentMethods,
      serviceRankings,
      staffReport,
      expensesByCategory,
      totalStockValue,
      lowStockCount,
      totalCustomers: totalCustCount
    });
  } catch (error) {
    console.error("Reports error:", error);
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/notifications", async (req, res) => {
  try {
    const list = await db.select().from(notifications).orderBy(desc2(notifications.id)).limit(30);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/notifications/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.update(notifications).set({ isRead: true }).where(eq2(notifications.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/notifications/read-all", async (req, res) => {
  try {
    await db.update(notifications).set({ isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/activity-logs", async (req, res) => {
  try {
    const logs = await db.select().from(activityLogs).orderBy(desc2(activityLogs.id)).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// src/server/vercel.ts
var app = express();
app.use(express.json());
app.use("/api", apiRouter);
app.use(apiRouter);
var vercel_default = app;
export {
  vercel_default as default
};
//# sourceMappingURL=index.js.map
