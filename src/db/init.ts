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

  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS salon_name TEXT NOT NULL DEFAULT 'Veloura 🎀 Luxury Salon & Spa'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'Luxury Hair, Beauty & Wellness'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '+91 98765 43210'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS email TEXT DEFAULT 'contact@veloura.in'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'Indiranagar 100ft Road, Bengaluru, Karnataka 560038'`,
  `ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS gst_number TEXT DEFAULT '29AAAAA0000A1Z5'`,
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
  for (const ddl of TABLE_DDLS) {
    try {
      await db.execute(sql.raw(ddl));
    } catch (err: any) {
      // If table creation fails due to existing table/constraint or permissions, continue to next
      console.warn('Note on table DDL:', err?.message || err);
    }
  }

  for (const colDdl of COLUMN_ALIGNMENTS) {
    try {
      await db.execute(sql.raw(colDdl));
    } catch (err: any) {
      // Column may already exist or schema already aligned
    }
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

    // 1. Ensure salon settings exist
    const existingSettings = await db.select().from(salonSettings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(salonSettings).values({
        salonName: 'Veloura 🎀 Luxury Salon & Spa',
        tagline: 'Luxury Hair, Beauty & Wellness',
        phone: '+91 98765 43210',
        email: 'contact@veloura.in',
        address: 'Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
        gstNumber: '29AAAAA0000A1Z5',
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
      console.log('Default salon settings created for Veloura 🎀.');
    } else {
      // Ensure brand name is updated to Veloura 🎀
      await db.update(salonSettings).set({
        salonName: 'Veloura 🎀 Luxury Salon & Spa',
        tagline: 'Luxury Hair, Beauty & Wellness',
        email: 'contact@veloura.in',
        invoicePrefix: 'VEL',
      }).where(eq(salonSettings.id, existingSettings[0].id));
    }

    // 2. Ensure categories exist
    const categoryMap = new Map<string, number>();
    for (const cat of PREDEFINED_CATEGORIES) {
      let existingCat = await db.select().from(serviceCategories).where(eq(serviceCategories.name, cat.name)).limit(1);
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

    // 3. Ensure the exact 31 services exist with the updated 50% increased prices
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
      // Keep prices in sync with the 50% increased values and insert any missing services
      const existingNames = new Set(existingServices.map((s) => s.name));
      for (const s of PREDEFINED_SERVICES) {
        if (!existingNames.has(s.name)) {
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
        } else {
          await db.update(services)
            .set({ price: s.price })
            .where(eq(services.name, s.name));
        }
      }
    }

    // 4. Ensure the 35 Staff Members exist across 7 categories
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
          isActive: true,
        });
      }
      console.log(`Seeded all ${INITIAL_35_STAFF.length} staff members.`);
    } else {
      // Ensure any missing staff members are inserted
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
            isActive: true,
          });
        }
      }
    }

    // 5. Default Owner User if no users exist
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      await db.insert(users).values({
        uid: 'default-owner-uid',
        name: 'Anita Sharma (Owner)',
        email: 'owner@veloura.in',
        role: 'OWNER',
        phone: '+91 98765 43210',
      });
    }

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
