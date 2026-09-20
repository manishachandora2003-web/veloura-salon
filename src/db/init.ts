import { db } from './index.ts';
import {
  salonSettings,
  serviceCategories,
  services,
  customers,
  staff,
  staffSchedules,
  appointments,
  appointmentServices,
  invoices,
  invoiceItems,
  payments,
  expenses,
  inventoryProducts,
  inventoryMovements,
  suppliers,
  packages,
  packageServices,
  customerPackages,
  offers,
  loyaltyAccounts,
  loyaltyTransactions,
  notifications,
  activityLogs,
  users,
} from './schema.ts';
import { PREDEFINED_CATEGORIES, PREDEFINED_SERVICES } from './predefined-services.ts';
import { INITIAL_35_STAFF } from './initial-staff.ts';
import { eq, and, sql, notInArray, desc } from 'drizzle-orm';

/**
 * Ensures all required relational database tables exist (idempotent DDL).
 */
const TABLE_DDLS: string[] = [
  // 1. users
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT 'Salon User',
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OWNER',
    phone TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  // 2. salon_settings
  `CREATE TABLE IF NOT EXISTS salon_settings (
    id SERIAL PRIMARY KEY,
    salon_name TEXT NOT NULL DEFAULT 'Veloura 🎀',
    tagline TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    gst_number TEXT DEFAULT '',
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
  )`,
  // 3. service_categories
  `CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 4. services
  `CREATE TABLE IF NOT EXISTS services (
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
  )`,
  // 5. customers
  `CREATE TABLE IF NOT EXISTS customers (
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
  )`,
  // 6. staff
  `CREATE TABLE IF NOT EXISTS staff (
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
    working_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat',
    working_hours TEXT NOT NULL DEFAULT '10:00 AM - 07:00 PM',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  // 7. staff_schedules
  `CREATE TABLE IF NOT EXISTS staff_schedules (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES staff(id),
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL DEFAULT '10:00',
    end_time TEXT NOT NULL DEFAULT '19:00',
    is_working BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  // 8. appointments
  `CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    booking_code TEXT,
    source TEXT NOT NULL DEFAULT 'Walk-in',
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    staff_id INTEGER NOT NULL REFERENCES staff(id),
    staff_name TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Booked',
    payment_status TEXT NOT NULL DEFAULT 'Pending',
    notes TEXT,
    total_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  // 9. appointment_services
  `CREATE TABLE IF NOT EXISTS appointment_services (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL REFERENCES appointments(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    service_name TEXT NOT NULL,
    price INTEGER NOT NULL,
    duration INTEGER NOT NULL
  )`,
  // 10. invoices
  `CREATE TABLE IF NOT EXISTS invoices (
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
    payment_method TEXT NOT NULL DEFAULT 'UPI',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  // 11. invoice_items
  `CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    service_id INTEGER REFERENCES services(id),
    service_name TEXT NOT NULL,
    staff_id INTEGER REFERENCES staff(id),
    staff_name TEXT,
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total INTEGER NOT NULL
  )`,
  // 12. payments
  `CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_number TEXT NOT NULL UNIQUE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    invoice_number TEXT NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Paid',
    transaction_reference TEXT,
    notes TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 13. expenses
  `CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    date TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    description TEXT,
    added_by TEXT NOT NULL DEFAULT 'Owner',
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 14. suppliers
  `CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 15. inventory_products
  `CREATE TABLE IF NOT EXISTS inventory_products (
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
    unit TEXT NOT NULL DEFAULT 'Units',
    expiry_date TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  // 16. inventory_movements
  `CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES inventory_products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    performed_by TEXT NOT NULL DEFAULT 'System',
    date TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 17. packages
  `CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    validity_days INTEGER NOT NULL DEFAULT 90,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 18. package_services
  `CREATE TABLE IF NOT EXISTS package_services (
    id SERIAL PRIMARY KEY,
    package_id INTEGER NOT NULL REFERENCES packages(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    service_name TEXT NOT NULL,
    sessions_count INTEGER NOT NULL DEFAULT 1
  )`,
  // 19. customer_packages
  `CREATE TABLE IF NOT EXISTS customer_packages (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    package_id INTEGER NOT NULL REFERENCES packages(id),
    package_name TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    price_paid INTEGER NOT NULL,
    total_services INTEGER NOT NULL,
    services_used INTEGER NOT NULL DEFAULT 0,
    services_remaining INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 20. offers
  `CREATE TABLE IF NOT EXISTS offers (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL,
    discount_value INTEGER NOT NULL,
    min_bill_amount INTEGER DEFAULT 0,
    service_category TEXT DEFAULT 'ALL',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 21. loyalty_accounts
  `CREATE TABLE IF NOT EXISTS loyalty_accounts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    current_points INTEGER NOT NULL DEFAULT 0,
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    total_points_redeemed INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  // 22. loyalty_transactions
  `CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    type TEXT NOT NULL,
    points INTEGER NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id),
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 23. notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reference_id TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // 24. activity_logs
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_name TEXT NOT NULL DEFAULT 'System',
    user_role TEXT NOT NULL DEFAULT 'OWNER',
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`
];

const COLUMN_ALIGNMENTS: string[] = [
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES service_categories(id)`,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS category_name TEXT NOT NULL DEFAULT 'General'`,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 30`,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,

  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_code TEXT`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'Female'`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Stylist'`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialization TEXT NOT NULL DEFAULT 'Hair & Styling'`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS joining_date TEXT NOT NULL DEFAULT '2025-01-01'`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary INTEGER NOT NULL DEFAULT 20000`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_percentage INTEGER NOT NULL DEFAULT 10`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS working_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat'`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS working_hours TEXT NOT NULL DEFAULT '10:00 AM - 07:00 PM'`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,

  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS salon_name TEXT NOT NULL DEFAULT 'Veloura 🎀'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT ''`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS email TEXT DEFAULT ''`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS gst_number TEXT DEFAULT ''`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS gst_rate INTEGER NOT NULL DEFAULT 18`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS invoice_prefix TEXT NOT NULL DEFAULT 'VEL'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS opening_time TEXT NOT NULL DEFAULT '09:00'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS closing_time TEXT NOT NULL DEFAULT '21:00'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS working_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS default_appointment_duration INTEGER NOT NULL DEFAULT 30`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS loyalty_points_per_100 INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS loyalty_point_value_inr INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS loyalty_min_redemption_points INTEGER NOT NULL DEFAULT 50`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS accepted_payment_methods TEXT NOT NULL DEFAULT 'Cash,UPI,Card,Bank Transfer'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,

  `ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`,
  `ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
];

async function ensureTablesCreated() {
  try {
    const existingTablesRes = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const existingTableNames = new Set(
      (existingTablesRes.rows || []).map((r: any) => String(r.table_name || '').toLowerCase())
    );

    for (const ddl of TABLE_DDLS) {
      // Extract table name from CREATE TABLE IF NOT EXISTS <table_name>
      const match = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z0-9_]+)/i);
      const tableName = match ? match[1].toLowerCase() : null;

      if (tableName && existingTableNames.has(tableName)) {
        // Table already exists; avoid unnecessary DDL which may fail on restricted DB users
        continue;
      }

      try {
        await db.execute(sql.raw(ddl));
      } catch (err: any) {
        // Continue if permissions restrict DDL or table already exists
      }
    }

    // Safely ensure all expected columns exist across core tables
    for (const colDdl of COLUMN_ALIGNMENTS) {
      try {
        await db.execute(sql.raw(colDdl));
      } catch (err: any) {
        // Column might already exist or table permissions are restricted
      }
    }
  } catch (err: any) {
    // If information_schema query fails, proceed gracefully
  }
}

/**
 * Initializes database with default salon settings, exact 31 predefined Indian salon services,
 * and the 35 dedicated staff members across 7 categories.
 */
export async function initializeDatabase() {
  try {
    // 0. Ensure tables exist
    await ensureTablesCreated();

    // 1. Ensure salon settings exist (structural default only, preserving any existing settings)
    const existingSettings = await db.select().from(salonSettings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(salonSettings).values({
        salonName: 'Veloura 🎀',
        tagline: '',
        phone: '',
        email: '',
        address: '',
        gstNumber: '',
        gstRate: 18,
        taxEnabled: true,
        currency: 'INR',
        invoicePrefix: 'VEL',
        openingTime: '09:00',
        closingTime: '21:00',
        workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        defaultAppointmentDuration: 30,
        loyaltyPointsPer100: 1,
        loyaltyPointValueInr: 1,
        loyaltyMinRedemptionPoints: 50,
        acceptedPaymentMethods: 'Cash,UPI,Card,Bank Transfer',
      });
      console.log('Default structural salon settings created for Veloura 🎀.');
    }
    // If salon settings already exist: PRESERVE THEM EXACTLY. Do not overwrite or modify them.

    // 2. Ensure categories exist
    const categoryMap = new Map<string, number>();
    for (const cat of PREDEFINED_CATEGORIES) {
      const existingCat = await db.select().from(serviceCategories).where(eq(serviceCategories.name, cat.name)).limit(1);
      if (existingCat.length === 0) {
        const inserted = await db.insert(serviceCategories).values({
          name: cat.name,
          description: cat.description,
          displayOrder: cat.displayOrder,
        }).returning({ id: serviceCategories.id });
        categoryMap.set(cat.name, inserted[0].id);
      } else {
        categoryMap.set(cat.name, existingCat[0].id);
      }
    }

    // 3. Ensure predefined services exist if absent WITHOUT EVER overwriting existing service prices
    // If a service already exists:
    // - Keep its current price exactly unchanged.
    // - Keep its existing name unchanged.
    // - Keep its existing duration unchanged.
    // - Keep its existing description unchanged.
    // - Do not reset or synchronize it.
    // If a service does not exist at all, it may be created from PREDEFINED_SERVICES.
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
          isActive: true,
        });
      }
      console.log(`Seeded all ${PREDEFINED_SERVICES.length} predefined services.`);
    } else {
      const existingNames = new Set(existingServices.map((s) => s.name.trim().toLowerCase()));
      for (const s of PREDEFINED_SERVICES) {
        if (!existingNames.has(s.name.trim().toLowerCase())) {
          const catId = categoryMap.get(s.category) || null;
          await db.insert(services).values({
            categoryId: catId,
            categoryName: s.category,
            name: s.name,
            price: s.price,
            duration: s.duration,
            description: s.description,
            isActive: true,
          });
        }
      }
    }

    // 4. Preserve the required 35 staff structure across 7 categories
    // Ensure missing required staff can be created only when genuinely absent.
    // Never duplicate existing Staff IDs or staffCode.
    // Do not modify unrelated existing staff records.
    const existingStaff = await db.select().from(staff);
    if (existingStaff.length === 0) {
      for (const st of INITIAL_35_STAFF) {
        await db.insert(staff).values({
          staffCode: st.staffCode,
          name: st.name,
          gender: st.gender || 'Female',
          phone: st.phone,
          email: st.email,
          role: st.role,
          specialization: st.specialization,
          joiningDate: st.joiningDate,
          salary: st.salary,
          commissionPercentage: st.commissionPercentage,
          workingDays: st.workingDays,
          workingHours: st.workingHours,
          isActive: true,
        });
      }
      console.log(`Seeded all ${INITIAL_35_STAFF.length} staff members.`);
    } else {
      const existingCodes = new Set(existingStaff.map((s) => s.staffCode?.trim()).filter(Boolean));
      const existingNames = new Set(existingStaff.map((s) => s.name?.trim().toLowerCase()));
      for (const st of INITIAL_35_STAFF) {
        if (!existingCodes.has(st.staffCode?.trim()) && !existingNames.has(st.name.trim().toLowerCase())) {
          await db.insert(staff).values({
            staffCode: st.staffCode,
            name: st.name,
            gender: st.gender || 'Female',
            phone: st.phone,
            email: st.email,
            role: st.role,
            specialization: st.specialization,
            joiningDate: st.joiningDate,
            salary: st.salary,
            commissionPercentage: st.commissionPercentage,
            workingDays: st.workingDays,
            workingHours: st.workingHours,
            isActive: true,
          });
        }
      }
    }

    // 5. Clean up any legacy default fake owner user if present
    // NO fake owner users, fake customers, fake bookings, fake appointments,
    // fake payments, fake invoices, fake revenue, fake commissions, or fake transactions.
    await db.delete(users).where(eq(users.uid, 'default-owner-uid')).catch(() => {});

    return { success: true };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Checks for appointment time conflict for a specific staff member.
 * Returns true if an overlap is detected.
 */
export async function hasStaffAppointmentConflict(
  staffId: number,
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: number
): Promise<boolean> {
  const existing = await db.select().from(appointments).where(
    and(
      eq(appointments.staffId, staffId),
      eq(appointments.date, date),
      notInArray(appointments.status, ['Cancelled', 'No Show']),
      excludeAppointmentId ? sql`${appointments.id} != ${excludeAppointmentId}` : sql`1=1`
    )
  );

  // Time overlap logic: (startA < endB) && (endA > startB)
  return existing.some((apt) => {
    return startTime < apt.endTime && endTime > apt.startTime;
  });
}

/**
 * Generates next unique sequential invoice number (e.g. INV-2026-0001)
 */
export async function generateNextInvoiceNumber(): Promise<string> {
  const settings = await db.select().from(salonSettings).limit(1);
  const prefix = settings[0]?.invoicePrefix || 'INV';
  const year = new Date().getFullYear();

  const latest = await db.select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .orderBy(desc(invoices.id))
    .limit(1);

  let nextSequence = 1;
  if (latest.length > 0 && latest[0].invoiceNumber) {
    const parts = latest[0].invoiceNumber.split('-');
    if (parts.length >= 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  const padded = String(nextSequence).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

/**
 * Generates next payment number (e.g. PAY-2026-0001)
 */
export async function generateNextPaymentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const latest = await db.select({ paymentNumber: payments.paymentNumber })
    .from(payments)
    .orderBy(desc(payments.id))
    .limit(1);

  let nextSequence = 1;
  if (latest.length > 0 && latest[0].paymentNumber) {
    const parts = latest[0].paymentNumber.split('-');
    if (parts.length >= 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  const padded = String(nextSequence).padStart(4, '0');
  return `PAY-${year}-${padded}`;
}
