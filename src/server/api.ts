import { Router, Request, Response } from 'express';
import { db } from '../db/index.ts';
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
} from '../db/schema.ts';
import {
  initializeDatabase,
  hasStaffAppointmentConflict,
  generateNextInvoiceNumber,
  generateNextPaymentNumber,
} from '../db/init.ts';
import { loadIndianSalonDemoData, clearAllDemoData } from '../db/demo-data.ts';
import { calculateBillTotals } from '../lib/currency.ts';
import { eq, and, sql, desc, gte, lte, like, or, inArray } from 'drizzle-orm';

export const apiRouter = Router();

// Auto-initialize on first request
let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureDbInit() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await initializeDatabase();
        isInitialized = true;
      } catch (e: any) {
        console.error('Auto-initialization error:', e?.message || e);
        initPromise = null;
        throw e;
      }
    })();
  }
  return initPromise;
}

apiRouter.use(async (req, res, next) => {
  try {
    await ensureDbInit();
  } catch (err: any) {
    console.warn('Initial DB init attempt warning:', err?.message || err);
  }
  next();
});

// Helper to extract authenticated user/staff from request header
function getAuthContext(req: Request): { role: 'ADMIN' | 'STAFF' | 'ANONYMOUS'; staffId?: number } {
  const authHeader = (req.headers['authorization'] || req.headers['x-auth-token'] || req.headers['x-veloura-token']) as string;
  if (!authHeader || typeof authHeader !== 'string') {
    return { role: 'ANONYMOUS' };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token.startsWith('adm_')) {
    return { role: 'ADMIN' };
  }
  if (token.startsWith('stf_')) {
    const parts = token.split('_');
    const staffId = parseInt(parts[1], 10);
    return {
      role: 'STAFF',
      staffId: !isNaN(staffId) ? staffId : undefined,
    };
  }
  return { role: 'ANONYMOUS' };
}

function requireAdminAuth(req: Request, res: Response): boolean {
  const auth = getAuthContext(req);
  if (auth.role !== 'ADMIN') {
    res.status(401).json({ error: 'Authentication required: Owner/Admin privileges required.' });
    return false;
  }
  return true;
}

function requireStaffOrAdminAuth(req: Request, res: Response): boolean {
  const auth = getAuthContext(req);
  if (auth.role !== 'ADMIN' && auth.role !== 'STAFF') {
    res.status(401).json({ error: 'Authentication required: Staff or Owner access required.' });
    return false;
  }
  return true;
}

// ==========================================
// 1. HEALTH & INITIALIZATION / DEMO DATA
// ==========================================
apiRouter.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let servicesCount = 0;
  let staffCount = 0;
  try {
    const s = await db.select({ count: sql<number>`count(*)` }).from(services);
    servicesCount = Number(s[0]?.count || 0);
    const st = await db.select({ count: sql<number>`count(*)` }).from(staff);
    staffCount = Number(st[0]?.count || 0);
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = `error: ${err?.message || err}`;
  }
  res.json({
    status: 'ok',
    database: dbStatus,
    servicesCount,
    staffCount,
    time: new Date().toISOString(),
  });
});

apiRouter.all('/init', async (req, res) => {
  try {
    const result = await initializeDatabase();
    const allServices = await db.select().from(services);
    const allStaff = await db.select().from(staff);
    res.json({
      success: true,
      message: 'Database verified and initialized successfully.',
      servicesCount: allServices.length,
      staffCount: allStaff.length,
      result,
    });
  } catch (error: any) {
    console.error('Error during /init:', error);
    res.status(500).json({
      error: error?.message,
      detail: error?.cause?.message,
    });
  }
});

apiRouter.post('/demo/load', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const result = await loadIndianSalonDemoData();
    res.json(result);
  } catch (error: any) {
    console.error('Error loading demo data:', error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/demo/clear', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const result = await clearAllDemoData();
    res.json(result);
  } catch (error: any) {
    console.error('Error clearing demo data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 1B. VELOURA 🎀 AUTHENTICATION & ACCESS CONTROL
// ==========================================

// 1. Admin Login
apiRouter.post('/auth/admin-login', async (req, res) => {
  try {
    const { username, password, pin } = req.body;
    // Allow PIN 2026 or username/password combinations
    const isValidPin = pin === '2026';
    const isValidCredentials =
      (username === 'admin' || username === 'owner') &&
      (password === 'veloura2026' || password === 'admin' || password === '2026' || password === 'veloura@admin2026');

    if (isValidPin || isValidCredentials) {
      const token = `adm_veloura_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return res.json({
        success: true,
        token,
        role: 'ADMIN',
        user: {
          name: 'Salon Owner / Admin (Veloura 🎀)',
          role: 'OWNER',
          email: 'admin@veloura.in',
        },
      });
    }

    return res.status(401).json({ error: 'Invalid security PIN or admin credentials.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Staff Login (Common Credentials for ALL 35 Staff Members)
apiRouter.post('/auth/staff-login', async (req, res) => {
  try {
    const { staffCode, passcode, password } = req.body;
    const providedCode = (staffCode || '').trim();
    const providedPass = (passcode !== undefined && passcode !== '' ? passcode : password !== undefined ? password : '').trim();

    if (!providedCode || !providedPass) {
      return res.status(400).json({ error: 'Please enter Staff Code and Password.' });
    }

    const COMMON_STAFF_CODE = 'STAFF@1234';
    const COMMON_STAFF_PASS = 'Veloura@2026';

    const isCommonCode = providedCode.toUpperCase() === COMMON_STAFF_CODE;
    const isCommonPass = providedPass === COMMON_STAFF_PASS;

    // Load active staff members (all 35 kept intact)
    const staffMembers = await db.select().from(staff).where(eq(staff.isActive, true)).orderBy(staff.id);
    if (staffMembers.length === 0) {
      return res.status(500).json({ error: 'No active staff records found in salon database.' });
    }

    // 1. Check Common Credentials for ALL 35 staff members
    if (isCommonCode) {
      if (!isCommonPass) {
        return res.status(401).json({ error: 'Invalid Staff Code or Password' });
      }

      // Default to first active staff member while keeping all 35 records available
      const primaryStaff = staffMembers[0];
      const token = `stf_${primaryStaff.id}_veloura_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      return res.json({
        success: true,
        token,
        role: 'STAFF',
        staff: {
          id: primaryStaff.id,
          staffCode: 'STAFF@1234',
          name: primaryStaff.name,
          role: primaryStaff.role,
          specialization: primaryStaff.specialization,
          phone: primaryStaff.phone,
          email: primaryStaff.email,
          commissionPercentage: primaryStaff.commissionPercentage,
          workingDays: primaryStaff.workingDays,
          workingHours: primaryStaff.workingHours,
        },
      });
    }

    // 2. Fallback for individual staff code entered with common password or individual passcode
    const targetStaff = staffMembers.find((s) => s.staffCode?.toUpperCase() === providedCode.toUpperCase());
    if (targetStaff) {
      const phoneDigits = (targetStaff.phone || '').replace(/\D/g, '');
      const lastFour = phoneDigits.slice(-4);
      const isPassValid =
        providedPass === COMMON_STAFF_PASS ||
        providedPass === 'veloura123' ||
        providedPass === '2026' ||
        providedPass === lastFour;

      if (isPassValid) {
        const token = `stf_${targetStaff.id}_veloura_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        return res.json({
          success: true,
          token,
          role: 'STAFF',
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
            workingHours: targetStaff.workingHours,
          },
        });
      }
    }

    // Clear error message when invalid credentials
    return res.status(401).json({ error: 'Invalid Staff Code or Password' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Verify Current Auth Token
apiRouter.get('/auth/verify', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (auth.role === 'ADMIN') {
      return res.json({
        valid: true,
        role: 'ADMIN',
        user: {
          name: 'Salon Owner / Admin (Veloura 🎀)',
          role: 'OWNER',
          email: 'admin@veloura.in',
        },
      });
    }

    if (auth.role === 'STAFF') {
      let targetStaff = null;
      if (auth.staffId) {
        const st = await db.select().from(staff).where(eq(staff.id, auth.staffId)).limit(1);
        if (st[0] && st[0].isActive) {
          targetStaff = st[0];
        }
      }
      if (!targetStaff) {
        const all = await db.select().from(staff).where(eq(staff.isActive, true)).limit(1);
        if (all[0]) {
          targetStaff = all[0];
        }
      }

      if (targetStaff) {
        return res.json({
          valid: true,
          role: 'STAFF',
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
            workingHours: targetStaff.workingHours,
          },
        });
      }
    }

    return res.json({ valid: false, role: 'ANONYMOUS' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Safe Public Staff List (no salaries, no internal notes)
apiRouter.get('/staff/public', async (req, res) => {
  try {
    let allStaff = await db.select({
      id: staff.id,
      staffCode: staff.staffCode,
      name: staff.name,
      gender: staff.gender,
      role: staff.role,
      specialization: staff.specialization,
      workingDays: staff.workingDays,
      workingHours: staff.workingHours,
      isActive: staff.isActive,
    }).from(staff).where(eq(staff.isActive, true));

    if (allStaff.length === 0) {
      await initializeDatabase();
      allStaff = await db.select({
        id: staff.id,
        staffCode: staff.staffCode,
        name: staff.name,
        gender: staff.gender,
        role: staff.role,
        specialization: staff.specialization,
        workingDays: staff.workingDays,
        workingHours: staff.workingHours,
        isActive: staff.isActive,
      }).from(staff).where(eq(staff.isActive, true));
    }

    res.json(allStaff);
  } catch (error: any) {
    try {
      await initializeDatabase();
      const allStaff = await db.select({
        id: staff.id,
        staffCode: staff.staffCode,
        name: staff.name,
        gender: staff.gender,
        role: staff.role,
        specialization: staff.specialization,
        workingDays: staff.workingDays,
        workingHours: staff.workingHours,
        isActive: staff.isActive,
      }).from(staff).where(eq(staff.isActive, true));
      return res.json(allStaff);
    } catch (retryErr: any) {
      console.error('Error fetching public staff:', retryErr);
      res.status(500).json({
        error: retryErr?.message || error?.message,
        detail: retryErr?.cause?.message || error?.cause?.message,
      });
    }
  }
});

// 5. Staff Dashboard: My Appointments
apiRouter.get('/staff/my-appointments', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (auth.role !== 'STAFF' && auth.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Staff authentication required.' });
    }

    const isAll = req.query.staffId === 'all';
    let staffId = (!isAll && req.query.staffId) ? Number(req.query.staffId) : auth.staffId;
    if (!isAll && (!staffId || isNaN(staffId))) {
      const first = await db.select().from(staff).where(eq(staff.isActive, true)).limit(1);
      staffId = first[0]?.id || 1;
    }

    const staffAppointments = isAll
      ? await db.select().from(appointments).orderBy(desc(appointments.date), appointments.startTime)
      : await db
          .select()
          .from(appointments)
          .where(
            or(
              eq(appointments.staffId, staffId!),
              sql`${appointments.notes} LIKE ${'%"staffId":' + staffId + '%'}`
            )
          )
          .orderBy(desc(appointments.date), appointments.startTime);

    // Enrich with services and parsed serviceAssignments
    const enriched = await Promise.all(
      staffAppointments.map(async (apt) => {
        const aptSvcs = await db
          .select()
          .from(appointmentServices)
          .where(eq(appointmentServices.appointmentId, apt.id));

        let serviceAssignments: any[] = [];
        if (apt.notes && apt.notes.includes('<!--SERVICE_ASSIGNMENTS:')) {
          try {
            const match = apt.notes.match(/<!--SERVICE_ASSIGNMENTS:(.*?)-->/);
            if (match && match[1]) {
              serviceAssignments = JSON.parse(match[1]);
            }
          } catch (e) {}
        }

        return {
          ...apt,
          services: aptSvcs,
          serviceAssignments,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Staff Dashboard: Book Appointment for Client
apiRouter.post('/staff/book-for-client', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (auth.role !== 'STAFF' && auth.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Staff authentication required.' });
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
      notes,
    } = req.body;

    if (!serviceId) {
      return res.status(400).json({ error: 'Please select a salon service.' });
    }
    if (!date || !startTime) {
      return res.status(400).json({ error: 'Please select an appointment date and time.' });
    }

    // Determine target staff: requested or logged-in staff
    const targetStaffId = requestedStaffId ? Number(requestedStaffId) : auth.staffId;
    if (!targetStaffId) {
      return res.status(400).json({ error: 'Target staff member is required.' });
    }

    const targetStaff = await db.select().from(staff).where(eq(staff.id, targetStaffId)).limit(1);
    if (!targetStaff[0]) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    // Fetch the service (strictly maintaining existing price!)
    const svc = await db.select().from(services).where(eq(services.id, Number(serviceId))).limit(1);
    if (!svc[0]) {
      return res.status(404).json({ error: 'Selected service not found.' });
    }
    const selectedService = svc[0];
    const duration = selectedService.duration || 30;
    const totalAmount = selectedService.price;

    // Calculate End Time
    const [startH, startM] = startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // CONFLICT DETECTION: Double-booking prevention
    const hasConflict = await hasStaffAppointmentConflict(targetStaffId, date, startTime, endTime);
    if (hasConflict) {
      return res.status(409).json({
        error: `Staff member ${targetStaff[0].name} is already booked from ${startTime} to ${endTime} on ${date}. Please select another time.`,
        conflict: true,
      });
    }

    // Resolve Customer
    let resolvedCustomerId: number;
    let resolvedCustomerName: string;
    let resolvedCustomerPhone: string;
    let resolvedCustomerEmail = customerEmail || null;

    if (customerId) {
      const existingCust = await db.select().from(customers).where(eq(customers.id, Number(customerId))).limit(1);
      if (!existingCust[0]) return res.status(404).json({ error: 'Customer not found.' });
      resolvedCustomerId = existingCust[0].id;
      resolvedCustomerName = existingCust[0].name;
      resolvedCustomerPhone = existingCust[0].phone;
      if (existingCust[0].email) resolvedCustomerEmail = existingCust[0].email;
    } else {
      if (!customerName || !customerPhone) {
        return res.status(400).json({ error: 'Client name and 10-digit mobile number are required.' });
      }
      const cleanedPhone = customerPhone.trim();
      const existingByPhone = await db.select().from(customers).where(eq(customers.phone, cleanedPhone)).limit(1);
      if (existingByPhone[0]) {
        resolvedCustomerId = existingByPhone[0].id;
        resolvedCustomerName = customerName.trim() || existingByPhone[0].name;
        resolvedCustomerPhone = existingByPhone[0].phone;
      } else {
        const newCust = await db.insert(customers).values({
          name: customerName.trim(),
          phone: cleanedPhone,
          email: customerEmail || null,
        }).returning();
        resolvedCustomerId = newCust[0].id;
        resolvedCustomerName = newCust[0].name;
        resolvedCustomerPhone = newCust[0].phone;
      }
    }

    // Unique Booking Code for Staff Booking
    const uniqueYear = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `BK-STF-${uniqueYear}-${randomCode}`;

    // Insert Appointment with Source = 'Staff Booking'
    const newAppointment = await db
      .insert(appointments)
      .values({
        bookingCode,
        source: 'Staff Booking',
        customerId: resolvedCustomerId,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        customerEmail: resolvedCustomerEmail,
        staffId: targetStaff[0].id,
        staffName: targetStaff[0].name,
        date,
        startTime,
        endTime,
        status: 'Confirmed',
        paymentStatus: 'Pending',
        notes: notes || 'Booked directly by staff for client',
        totalAmount,
      })
      .returning();

    // Insert Appointment Services
    await db.insert(appointmentServices).values({
      appointmentId: newAppointment[0].id,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      duration: selectedService.duration,
    });

    // Create Notification
    await db.insert(notifications).values({
      type: 'APPOINTMENT',
      title: `Staff Booking: ${resolvedCustomerName}`,
      message: `${targetStaff[0].name} booked an appointment for ${resolvedCustomerName} on ${date} at ${startTime} (${selectedService.name})`,
      referenceId: String(newAppointment[0].id),
    });

    // Activity Log
    await db.insert(activityLogs).values({
      action: 'STAFF_BOOKING_CREATED',
      description: `Staff member ${targetStaff[0].name} booked appointment #${newAppointment[0].id} for ${resolvedCustomerName} on ${date} at ${startTime}`,
      entityType: 'Appointment',
      entityId: String(newAppointment[0].id),
    });

    return res.json({
      success: true,
      bookingCode,
      appointment: newAppointment[0],
      service: selectedService,
      staff: targetStaff[0],
    });
  } catch (error: any) {
    console.error('Staff booking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Staff: Update Appointment Status
apiRouter.patch('/staff/appointments/:id/status', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (auth.role !== 'STAFF' && auth.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Staff authentication required.' });
    }

    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const apt = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!apt[0]) return res.status(404).json({ error: 'Appointment not found.' });

    // Verify staff owns this appointment if not admin
    if (auth.role === 'STAFF' && apt[0].staffId !== auth.staffId) {
      return res.status(403).json({ error: 'You can only manage appointments assigned to you.' });
    }

    const updated = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();

    return res.json({ success: true, appointment: updated[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. DASHBOARD STATS (100% REAL DATABASE DATA)
// ==========================================
apiRouter.get('/dashboard', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's Appointments
    const todayAppts = await db
      .select()
      .from(appointments)
      .where(eq(appointments.date, todayStr))
      .orderBy(appointments.startTime);

    // Today's Payments (Revenue)
    const todayPayments = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(eq(payments.date, todayStr));
    const todayRevenue = todayPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Today's Expenses
    const todayExp = await db
      .select({ amount: expenses.amount })
      .from(expenses)
      .where(eq(expenses.date, todayStr));
    const todayExpensesTotal = todayExp.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Pending Payments (sum of balance_amount from invoices)
    const pendingInvoices = await db
      .select({ balance: invoices.balanceAmount })
      .from(invoices)
      .where(sql`${invoices.balanceAmount} > 0`);
    const pendingPaymentsTotal = pendingInvoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);

    // Total Customers
    const totalCustomersRes = await db.select({ count: sql<number>`count(*)` }).from(customers);
    const totalCustomers = Number(totalCustomersRes[0]?.count || 0);

    // Active Staff
    const activeStaffRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(staff)
      .where(eq(staff.isActive, true));
    const activeStaffCount = Number(activeStaffRes[0]?.count || 0);

    // Low Stock Items
    const lowStockItems = await db
      .select()
      .from(inventoryProducts)
      .where(sql`${inventoryProducts.currentStock} <= ${inventoryProducts.minStockLevel}`);

    // Net Revenue = Today's Revenue - Today's Expenses
    const netRevenue = todayRevenue - todayExpensesTotal;

    // Revenue Overview Periods
    // All time revenue
    const allPayments = await db.select({ amount: payments.amount }).from(payments);
    const allTimeRevenue = allPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Recent 5 Invoices
    const recentInvoices = await db.select().from(invoices).orderBy(desc(invoices.id)).limit(5);

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
      recentInvoices,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. SETTINGS
// ==========================================
apiRouter.get('/settings', async (req, res) => {
  try {
    let list = await db.select().from(salonSettings).limit(1);
    if (list.length === 0) {
      await initializeDatabase();
      list = await db.select().from(salonSettings).limit(1);
    }
    res.json(list[0] || {});
  } catch (error: any) {
    try {
      await initializeDatabase();
      const list = await db.select().from(salonSettings).limit(1);
      return res.json(list[0] || {});
    } catch (retryErr: any) {
      console.error('Error fetching settings:', retryErr);
      res.status(500).json({
        error: retryErr?.message || error?.message,
        detail: retryErr?.cause?.message || error?.cause?.message,
      });
    }
  }
});

apiRouter.put('/settings', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const existing = await db.select().from(salonSettings).limit(1);
    const body = req.body;
    if (existing.length > 0) {
      const updated = await db
        .update(salonSettings)
        .set({
          salonName: body.salonName ?? existing[0].salonName,
          tagline: body.tagline ?? existing[0].tagline,
          phone: body.phone ?? existing[0].phone,
          email: body.email ?? existing[0].email,
          address: body.address ?? existing[0].address,
          gstNumber: body.gstNumber ?? existing[0].gstNumber,
          gstRate: body.gstRate ? Number(body.gstRate) : existing[0].gstRate,
          taxEnabled: body.taxEnabled !== undefined ? Boolean(body.taxEnabled) : existing[0].taxEnabled,
          currency: 'INR',
          invoicePrefix: body.invoicePrefix ?? existing[0].invoicePrefix,
          openingTime: body.openingTime ?? existing[0].openingTime,
          closingTime: body.closingTime ?? existing[0].closingTime,
          workingDays: body.workingDays ?? existing[0].workingDays,
          defaultAppointmentDuration: body.defaultAppointmentDuration ? Number(body.defaultAppointmentDuration) : existing[0].defaultAppointmentDuration,
          loyaltyPointsPer100: body.loyaltyPointsPer100 ? Number(body.loyaltyPointsPer100) : existing[0].loyaltyPointsPer100,
          loyaltyPointValueInr: body.loyaltyPointValueInr ? Number(body.loyaltyPointValueInr) : existing[0].loyaltyPointValueInr,
          loyaltyMinRedemptionPoints: body.loyaltyMinRedemptionPoints ? Number(body.loyaltyMinRedemptionPoints) : existing[0].loyaltyMinRedemptionPoints,
          acceptedPaymentMethods: body.acceptedPaymentMethods ?? existing[0].acceptedPaymentMethods,
          updatedAt: new Date(),
        })
        .where(eq(salonSettings.id, existing[0].id))
        .returning();
      res.json(updated[0]);
    } else {
      const created = await db.insert(salonSettings).values(body).returning();
      res.json(created[0]);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. SERVICES & CATEGORIES
// ==========================================
export function sanitizeErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  const msg = typeof err === 'string' ? err : err?.message || 'Database error occurred.';
  return msg
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgresql://***:***@')
    .replace(/password=[^\s;&]+/gi, 'password=***');
}

apiRouter.get('/services', async (req, res) => {
  try {
    let list = await db.select().from(services).orderBy(services.categoryName, services.name);
    if (list.length === 0) {
      await initializeDatabase();
      list = await db.select().from(services).orderBy(services.categoryName, services.name);
    }
    res.json(list);
  } catch (error: any) {
    console.error('Initial error fetching services:', error);
    try {
      await initializeDatabase();
      const list = await db.select().from(services).orderBy(services.categoryName, services.name);
      return res.json(list);
    } catch (retryErr: any) {
      console.error('Error fetching services after init retry:', retryErr);
      res.status(500).json({
        error: sanitizeErrorMessage(retryErr || error),
        detail: sanitizeErrorMessage(retryErr?.cause || error?.cause),
      });
    }
  }
});

apiRouter.post('/services', async (req, res) => {
  try {
    const { name, categoryName, price, duration, description, isActive } = req.body;
    if (!name || !categoryName || price === undefined || !duration) {
      return res.status(400).json({ error: 'Name, Category, Price in ₹ and Duration in minutes are required.' });
    }
    const created = await db
      .insert(services)
      .values({
        name,
        categoryName,
        price: Number(price),
        duration: Number(duration),
        description: description || '',
        isActive: isActive !== false,
      })
      .returning();

    await db.insert(activityLogs).values({
      action: 'SERVICE_CREATED',
      description: `Created service: ${name} (₹${price}, ${duration} mins)`,
      entityType: 'Service',
      entityId: String(created[0].id),
    });

    res.json(created[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/services/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, categoryName, price, duration, description, isActive } = req.body;
    const updated = await db
      .update(services)
      .set({
        name,
        categoryName,
        price: price !== undefined ? Number(price) : undefined,
        duration: duration !== undefined ? Number(duration) : undefined,
        description,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/services/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(services).where(eq(services.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/categories', async (req, res) => {
  try {
    let cats = await db.select().from(serviceCategories).orderBy(serviceCategories.displayOrder);
    if (cats.length === 0) {
      await initializeDatabase();
      cats = await db.select().from(serviceCategories).orderBy(serviceCategories.displayOrder);
    }
    res.json(cats);
  } catch (error: any) {
    try {
      await initializeDatabase();
      const cats = await db.select().from(serviceCategories).orderBy(serviceCategories.displayOrder);
      return res.json(cats);
    } catch (retryErr: any) {
      console.error('Error fetching categories:', retryErr);
      res.status(500).json({
        error: retryErr?.message || error?.message,
        detail: retryErr?.cause?.message || error?.cause?.message,
      });
    }
  }
});

// ==========================================
// 5. CUSTOMERS CRM
// ==========================================
apiRouter.get('/customers', async (req, res) => {
  try {
    const { search } = req.query;
    let list;
    if (search && typeof search === 'string') {
      const q = `%${search.trim()}%`;
      list = await db
        .select()
        .from(customers)
        .where(or(like(customers.name, q), like(customers.phone, q), like(customers.email, q)))
        .orderBy(desc(customers.id));
    } else {
      list = await db.select().from(customers).orderBy(desc(customers.id));
    }
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/customers/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cust = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!cust[0]) return res.status(404).json({ error: 'Customer not found' });

    // Customer appointments
    const custAppts = await db
      .select()
      .from(appointments)
      .where(eq(appointments.customerId, id))
      .orderBy(desc(appointments.date), desc(appointments.startTime));

    // Customer invoices
    const custInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, id))
      .orderBy(desc(invoices.id));

    // Customer payments
    const custPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.customerId, id))
      .orderBy(desc(payments.id));

    // Loyalty points
    const loyalty = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.customerId, id)).limit(1);

    res.json({
      customer: cust[0],
      appointments: custAppts,
      invoices: custInvoices,
      payments: custPayments,
      loyalty: loyalty[0] || { currentPoints: cust[0].loyaltyPoints, totalPointsEarned: cust[0].loyaltyPoints, totalPointsRedeemed: 0 },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/customers', async (req, res) => {
  try {
    const { name, phone, email, dob, gender, address, notes, preferences } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Customer name and phone number are required.' });
    }

    // Check duplicate phone
    const existingPhone = await db.select().from(customers).where(eq(customers.phone, phone.trim())).limit(1);
    if (existingPhone.length > 0) {
      return res.status(400).json({
        error: `Customer with phone ${phone} already exists (${existingPhone[0].name}).`,
        existingCustomer: existingPhone[0],
      });
    }

    const created = await db
      .insert(customers)
      .values({
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        dob: dob || null,
        gender: gender || 'Female',
        address: address || null,
        notes: notes || null,
        preferences: preferences || null,
      })
      .returning();

    // Create loyalty account
    await db.insert(loyaltyAccounts).values({
      customerId: created[0].id,
      customerName: created[0].name,
      currentPoints: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0,
    });

    await db.insert(activityLogs).values({
      action: 'CUSTOMER_CREATED',
      description: `Added new customer: ${name} (${phone})`,
      entityType: 'Customer',
      entityId: String(created[0].id),
    });

    res.json(created[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/customers/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, email, dob, gender, address, notes, preferences } = req.body;
    
    // Check if phone belongs to someone else
    if (phone) {
      const existingPhone = await db.select().from(customers).where(eq(customers.phone, phone.trim())).limit(1);
      if (existingPhone.length > 0 && existingPhone[0].id !== id) {
        return res.status(400).json({ error: `Phone number ${phone} is already registered to another customer (${existingPhone[0].name}).` });
      }
    }

    const updated = await db
      .update(customers)
      .set({
        name,
        phone,
        email,
        dob,
        gender,
        address,
        notes,
        preferences,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/customers/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(loyaltyTransactions).where(eq(loyaltyTransactions.customerId, id));
    await db.delete(loyaltyAccounts).where(eq(loyaltyAccounts.customerId, id));
    await db.delete(customers).where(eq(customers.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. STAFF MANAGEMENT
// ==========================================
apiRouter.get('/staff', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const staffList = await db.select().from(staff).orderBy(staff.name);

    // Calculate actual performance metrics from appointments and invoice_items
    const enriched = await Promise.all(
      staffList.map(async (st) => {
        const staffAppts = await db
          .select({ count: sql<number>`count(*)` })
          .from(appointments)
          .where(eq(appointments.staffId, st.id));
        const apptCount = Number(staffAppts[0]?.count || 0);

        // Revenue from invoices or invoice items
        const staffSales = await db
          .select({ total: sql<number>`sum(${invoiceItems.total})` })
          .from(invoiceItems)
          .where(eq(invoiceItems.staffId, st.id));
        const salesTotal = Number(staffSales[0]?.total || 0);

        const commission = Math.round((salesTotal * st.commissionPercentage) / 100);

        return {
          ...st,
          appointmentCount: apptCount,
          revenueGenerated: salesTotal,
          commissionEarned: commission,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/staff', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const { staffCode, name, phone, email, role, specialization, joiningDate, salary, commissionPercentage, workingDays, workingHours } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Staff name and phone are required.' });
    }

    let defaultComm = 5;
    if (role === 'Helper') {
      defaultComm = 4;
    }

    const created = await db
      .insert(staff)
      .values({
        staffCode: staffCode || `STF-${Date.now().toString().slice(-4)}`,
        name,
        phone,
        email: email || null,
        role: role || 'Hair Stylist',
        specialization: specialization || 'General',
        joiningDate: joiningDate || new Date().toISOString().split('T')[0],
        salary: salary ? Number(salary) : 25000,
        commissionPercentage: commissionPercentage !== undefined ? Number(commissionPercentage) : defaultComm,
        workingDays: workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat',
        workingHours: workingHours || '10:00 AM - 07:00 PM',
        isActive: true,
      })
      .returning();

    await db.insert(activityLogs).values({
      action: 'STAFF_ADDED',
      description: `Added staff member: ${name} (${role})`,
      entityType: 'Staff',
      entityId: String(created[0].id),
    });

    res.json(created[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/staff/:id', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const id = Number(req.params.id);
    const body = req.body;
    const updated = await db
      .update(staff)
      .set({
        ...body,
        staffCode: body.staffCode !== undefined ? body.staffCode : undefined,
        salary: body.salary !== undefined ? Number(body.salary) : undefined,
        commissionPercentage: body.commissionPercentage !== undefined ? Number(body.commissionPercentage) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(staff.id, id))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. APPOINTMENTS (WITH CONFLICT PREVENTION)
// ==========================================
apiRouter.get('/appointments', async (req, res) => {
  try {
    const { date, startDate, endDate, staffId, status } = req.query;
    let query = db.select().from(appointments);

    const conditions = [];
    if (date && typeof date === 'string') {
      conditions.push(eq(appointments.date, date));
    }
    if (startDate && typeof startDate === 'string' && endDate && typeof endDate === 'string') {
      conditions.push(gte(appointments.date, startDate));
      conditions.push(lte(appointments.date, endDate));
    }
    if (staffId) {
      conditions.push(eq(appointments.staffId, Number(staffId)));
    }
    if (status && typeof status === 'string' && status !== 'ALL') {
      conditions.push(eq(appointments.status, status));
    }

    const appts = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(appointments.date, appointments.startTime)
      : await query.orderBy(desc(appointments.date), appointments.startTime);

    // Get services for each appointment
    const enriched = await Promise.all(
      appts.map(async (apt) => {
        const aptSvcs = await db
          .select()
          .from(appointmentServices)
          .where(eq(appointmentServices.appointmentId, apt.id));
        return {
          ...apt,
          services: aptSvcs,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/appointments', async (req, res) => {
  try {
    const { customerId, staffId, serviceIds, date, startTime, notes } = req.body;

    if (!customerId || !staffId || !serviceIds || !serviceIds.length || !date || !startTime) {
      return res.status(400).json({ error: 'Customer, Staff, at least one Service, Date and Start Time are required.' });
    }

    // Fetch customer details
    const cust = await db.select().from(customers).where(eq(customers.id, Number(customerId))).limit(1);
    if (!cust[0]) return res.status(404).json({ error: 'Customer not found.' });

    // Fetch staff details
    const st = await db.select().from(staff).where(eq(staff.id, Number(staffId))).limit(1);
    if (!st[0]) return res.status(404).json({ error: 'Staff member not found.' });

    // Fetch services and calculate total duration and price
    const selectedServices = await db
      .select()
      .from(services)
      .where(sql`${services.id} IN (${sql.join(serviceIds.map((id: number) => sql`${id}`), sql`, `)})`);

    const totalDuration = selectedServices.reduce((acc, s) => acc + (s.duration || 30), 0);
    const totalAmount = selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);

    // Calculate End Time based on duration
    const [startH, startM] = startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + totalDuration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // CONFLICT DETECTION: Strictly reject overlapping bookings for the same staff!
    const hasConflict = await hasStaffAppointmentConflict(Number(staffId), date, startTime, endTime);
    if (hasConflict) {
      return res.status(409).json({
        error: `Staff member is already booked during this time (${startTime} - ${endTime} on ${date}). Please select another staff member or choose an alternative time slot.`,
        conflict: true,
      });
    }

    // Generate Booking Code & Source
    const uniqueYear = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const assignedBookingCode = req.body.bookingCode || `BK-ADM-${uniqueYear}-${randomSuffix}`;
    const bookingSource = req.body.source || 'Admin Booking';

    // Insert Appointment
    const apt = await db
      .insert(appointments)
      .values({
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
        status: req.body.status || 'Booked',
        paymentStatus: 'Pending',
        notes: notes || null,
        totalAmount,
      })
      .returning();

    // Insert Appointment Services
    for (const s of selectedServices) {
      await db.insert(appointmentServices).values({
        appointmentId: apt[0].id,
        serviceId: s.id,
        serviceName: s.name,
        price: s.price,
        duration: s.duration,
      });
    }

    // Create Notification
    await db.insert(notifications).values({
      type: 'APPOINTMENT',
      title: `New Appointment: ${cust[0].name}`,
      message: `Appointment booked with ${st[0].name} on ${date} at ${startTime} (${selectedServices.map((s) => s.name).join(', ')})`,
      referenceId: String(apt[0].id),
    });

    // Activity Log
    await db.insert(activityLogs).values({
      action: 'APPOINTMENT_CREATED',
      description: `Booked appointment #${apt[0].id} for ${cust[0].name} with ${st[0].name} on ${date} at ${startTime}`,
      entityType: 'Appointment',
      entityId: String(apt[0].id),
    });

    res.json({ ...apt[0], services: selectedServices });
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/appointments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, paymentStatus, staffId, date, startTime, endTime, notes } = req.body;

    const existing = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!existing[0]) return res.status(404).json({ error: 'Appointment not found' });

    // If rescheduling, check conflict
    const targetStaff = staffId ? Number(staffId) : existing[0].staffId;
    const targetDate = date || existing[0].date;
    const targetStart = startTime || existing[0].startTime;
    const targetEnd = endTime || existing[0].endTime;

    if (date || startTime || staffId) {
      const conflict = await hasStaffAppointmentConflict(targetStaff, targetDate, targetStart, targetEnd, id);
      if (conflict) {
        return res.status(409).json({
          error: `Staff member is already booked during this time (${targetStart} - ${targetEnd}).`,
          conflict: true,
        });
      }
    }

    const updated = await db
      .update(appointments)
      .set({
        status: status || existing[0].status,
        paymentStatus: paymentStatus || existing[0].paymentStatus,
        staffId: targetStaff,
        date: targetDate,
        startTime: targetStart,
        endTime: targetEnd,
        notes: notes !== undefined ? notes : existing[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    // If cancelled, send notification
    if (status === 'Cancelled' && existing[0].status !== 'Cancelled') {
      await db.insert(notifications).values({
        type: 'CANCELLATION',
        title: `Appointment Cancelled: #${id}`,
        message: `Appointment for ${existing[0].customerName} on ${existing[0].date} at ${existing[0].startTime} was cancelled.`,
        referenceId: String(id),
      });
    }

    await db.insert(activityLogs).values({
      action: 'APPOINTMENT_UPDATED',
      description: `Updated appointment #${id} status to ${status || existing[0].status}`,
      entityType: 'Appointment',
      entityId: String(id),
    });

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/appointments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(appointmentServices).where(eq(appointmentServices.appointmentId, id));
    await db.delete(appointments).where(eq(appointments.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper for mapping services to staff categories
function getEligibleStaffRolesForService(categoryName: string, serviceName: string): string[] {
  const cat = (categoryName || '').toUpperCase();
  const sName = (serviceName || '').toLowerCase();

  if (cat.includes('MAKEUP') || sName.includes('makeup') || sName.includes('bridal') || sName.includes('party makeup')) {
    return ['Makeup Artist'];
  }
  if (cat.includes('HAIR') || sName.includes('hair') || sName.includes('cut') || sName.includes('blowdry') || sName.includes('keratin') || sName.includes('color') || sName.includes('smoothening') || sName.includes('beard')) {
    return ['Hair Stylist'];
  }
  if (cat.includes('WAXING') || cat.includes('THREADING') || sName.includes('wax') || sName.includes('thread') || sName.includes('rica') || sName.includes('upper lip') || sName.includes('eyebrow')) {
    return ['Waxing & Threading Specialist'];
  }
  if (cat.includes('MANICURE') || cat.includes('PEDICURE') || sName.includes('nail') || sName.includes('manicure') || sName.includes('pedicure') || sName.includes('paraffin')) {
    return ['Manicure & Pedicure Specialist'];
  }
  if (cat.includes('SPA') || cat.includes('FACIAL') || cat.includes('SKIN') || sName.includes('massage') || sName.includes('spa') || sName.includes('facial') || sName.includes('bleach') || sName.includes('d-tan') || sName.includes('clean up')) {
    return ['Spa Specialist'];
  }
  if (cat.includes('FASHION') || sName.includes('draping') || sName.includes('saree') || sName.includes('styling')) {
    return ['Fashion Stylist'];
  }
  return ['Hair Stylist', 'Makeup Artist', 'Waxing & Threading Specialist', 'Manicure & Pedicure Specialist', 'Spa Specialist', 'Fashion Stylist'];
}

// ==========================================
// 7B. ONLINE BOOKING & AVAILABILITY ENGINE
// ==========================================

// Get available time slots for a specific date, services, and optional staff or multi-specialist assignments
apiRouter.get('/appointments/availability', async (req, res) => {
  try {
    const { date, serviceId, serviceIds, staffId, duration: customDuration, staffAssignments } = req.query;
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD).' });
    }

    // Standard salon operating slots (09:30 AM to 08:00 PM)
    const slotTimes = [
      '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
      '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
      '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
      '18:30', '19:00', '19:30', '20:00',
    ];

    let duration = 30;
    let targetRoles: string[] = [];

    // Parse service IDs (supports comma-separated string, single ID, or array)
    let parsedSvcIds: number[] = [];
    if (typeof serviceIds === 'string' && serviceIds.trim()) {
      parsedSvcIds = serviceIds
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);
    } else if (serviceId && !isNaN(Number(serviceId))) {
      parsedSvcIds = [Number(serviceId)];
    }

    let loadedServices: typeof services.$inferSelect[] = [];
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

    // Parse optional per-service specialist assignments
    let parsedAssignments: Record<string, any> = {};
    if (typeof staffAssignments === 'string' && staffAssignments.trim()) {
      try {
        parsedAssignments = JSON.parse(staffAssignments);
      } catch (e) {
        parsedAssignments = {};
      }
    }

    // Get all active staff
    const allActiveStaff = await db.select().from(staff).where(eq(staff.isActive, true));

    // Filter eligible staff for fallback/single-specialist mode
    let eligibleStaff = allActiveStaff;
    if (staffId && staffId !== 'ANY' && !isNaN(Number(staffId))) {
      eligibleStaff = allActiveStaff.filter((s) => s.id === Number(staffId));
    } else if (targetRoles.length > 0) {
      const roleSet = new Set(targetRoles);
      const matchingStaff = allActiveStaff.filter((s) => roleSet.has(s.role) && s.role !== 'Helper');
      if (matchingStaff.length > 0) {
        eligibleStaff = matchingStaff;
      }
    }

    // Today's date check for past hours
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = date === todayStr;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const results = await Promise.all(
      slotTimes.map(async (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        const slotStartM = h * 60 + m;

        // If today and time has already passed, mark unavailable
        if (isToday && slotStartM <= currentMinutes + 15) {
          return {
            time: timeStr,
            label: formatTimeLabel(timeStr),
            available: false,
            reason: 'Past time',
          };
        }

        const endM = slotStartM + duration;
        const endH = Math.floor(endM / 60);
        const endMin = endM % 60;
        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

        // If specific per-service specialist assignments were provided
        const hasPerServiceSelection = Object.keys(parsedAssignments).length > 0 && loadedServices.length > 0;

        if (hasPerServiceSelection) {
          let allServicesAvailable = true;
          const assignedStaffInThisSlot = new Set<number>();

          for (const s of loadedServices) {
            const chosenStaffVal = parsedAssignments[s.id];
            const allowedRoles = getEligibleStaffRolesForService(s.categoryName, s.name);

            if (chosenStaffVal && chosenStaffVal !== 'ANY' && !isNaN(Number(chosenStaffVal))) {
              const specStaffId = Number(chosenStaffVal);
              // Check conflict for this specific staff
              const conflict = await hasStaffAppointmentConflict(specStaffId, date, timeStr, endTimeStr);
              if (conflict) {
                allServicesAvailable = false;
                break;
              }
              assignedStaffInThisSlot.add(specStaffId);
            } else {
              // 'ANY' staff: find at least one active staff matching the service role who is not in conflict
              const roleMatchingStaff = allActiveStaff.filter(
                (st) => allowedRoles.includes(st.role) && st.role !== 'Helper'
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
            freeStaffCount: allServicesAvailable ? 1 : 0,
          };
        }

        // Standard/fallback check: Check if ANY eligible staff member has no conflict across duration
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
          freeStaffCount,
        };
      })
    );

    res.json({
      date,
      serviceDuration: duration,
      eligibleStaffCount: eligibleStaff.length,
      slots: results,
    });
  } catch (error: any) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: error.message });
  }
});

function formatTimeLabel(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

// Public Online Booking Endpoint (supports multiple services + individual specialist assignments per service)
apiRouter.post('/appointments/online-book', async (req, res) => {
  try {
    const {
      serviceId,
      serviceIds,
      staffId,
      staffAssignments, // Map of { [serviceId]: staffId | 'ANY' }
      date,
      startTime,
      customerName,
      customerPhone,
      customerEmail,
      notes,
    } = req.body;

    // Parse service IDs (array or single ID)
    let rawServiceIds: number[] = [];
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      rawServiceIds = serviceIds.map(Number).filter((n) => !isNaN(n) && n > 0);
    } else if (typeof serviceIds === 'string' && serviceIds.trim()) {
      rawServiceIds = serviceIds
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);
    } else if (serviceId && !isNaN(Number(serviceId))) {
      rawServiceIds = [Number(serviceId)];
    }

    // Strict validation
    if (rawServiceIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one salon service.' });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Please provide your full name.' });
    }
    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number.' });
    }
    if (!date || !startTime) {
      return res.status(400).json({ error: 'Please choose an appointment date and time.' });
    }

    // Verify date is not in the past
    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      return res.status(400).json({ error: 'Appointment date cannot be in the past.' });
    }

    // Fetch the services (preserving exact current prices!)
    const selectedServices = await db
      .select()
      .from(services)
      .where(inArray(services.id, rawServiceIds));

    if (selectedServices.length === 0) {
      return res.status(404).json({ error: 'Selected services were not found.' });
    }

    const duration = selectedServices.reduce((sum, s) => sum + (s.duration || 30), 0);
    const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0); // Exact prices preserved

    // Calculate End Time based on combined duration
    const [startH, startM] = startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // Get all active staff
    const allActiveStaff = await db.select().from(staff).where(eq(staff.isActive, true));

    // Parse staffAssignments if passed as object or JSON string
    let parsedStaffMap: Record<number, number | 'ANY'> = {};
    if (staffAssignments && typeof staffAssignments === 'object') {
      parsedStaffMap = staffAssignments;
    } else if (typeof staffAssignments === 'string' && staffAssignments.trim()) {
      try {
        parsedStaffMap = JSON.parse(staffAssignments);
      } catch (e) {
        parsedStaffMap = {};
      }
    }

    // Structure per-service specialist assignment
    // Rule: Customer can ONLY select a specialist whose specialty matches the service category!
    interface ServiceAssignment {
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
    }

    const resolvedAssignments: ServiceAssignment[] = [];
    const usedStaffIdsInThisBooking = new Set<number>();

    for (const s of selectedServices) {
      const allowedRoles = getEligibleStaffRolesForService(s.categoryName, s.name);
      const chosenStaffVal = parsedStaffMap[s.id] !== undefined ? parsedStaffMap[s.id] : staffId;

      let chosenStaff: typeof staff.$inferSelect | null = null;
      let isAutoAssigned = false;

      if (chosenStaffVal && chosenStaffVal !== 'ANY' && !isNaN(Number(chosenStaffVal))) {
        const targetStaffId = Number(chosenStaffVal);
        const st = allActiveStaff.find((item) => item.id === targetStaffId);

        if (!st) {
          return res.status(404).json({ error: `Selected specialist for ${s.name} was not found.` });
        }

        // Validate Service -> Specialist Rule (Specialist must match the service category)
        if (!allowedRoles.includes(st.role)) {
          return res.status(400).json({
            error: `Invalid specialist selection: ${st.name} is a ${st.role} and cannot be assigned to ${s.name} (${s.categoryName}). Please select a specialist matching this service.`,
          });
        }

        // Conflict check for requested staff
        const hasConflict = await hasStaffAppointmentConflict(st.id, date, startTime, endTime);
        if (hasConflict) {
          return res.status(409).json({
            error: `${st.name} is already booked at ${formatTimeLabel(startTime)}. Please choose another time or specialist.`,
            conflict: true,
          });
        }

        chosenStaff = st;
      } else {
        // Auto-assign any active, matching specialist for this service category who has no conflict
        isAutoAssigned = true;
        const matchingStaff = allActiveStaff.filter(
          (st) => allowedRoles.includes(st.role) && st.role !== 'Helper'
        );

        // Try to pick one without conflict
        for (const st of matchingStaff) {
          const hasConflict = await hasStaffAppointmentConflict(st.id, date, startTime, endTime);
          if (!hasConflict) {
            chosenStaff = st;
            break;
          }
        }

        // If none found in strict category, check any qualified staff
        if (!chosenStaff) {
          for (const st of allActiveStaff) {
            if (st.role !== 'Helper') {
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
            conflict: true,
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
        gender: chosenStaff.gender || 'Staff',
        role: chosenStaff.role,
        specialization: chosenStaff.specialization,
        isAutoAssigned,
      });
    }

    // Determine primary staff and aggregated staff display name
    const primaryStaff = allActiveStaff.find((st) => st.id === resolvedAssignments[0].staffId) || allActiveStaff[0];
    const uniqueStaffNames = Array.from(new Set(resolvedAssignments.map((a) => `${a.staffName} (${a.role})`)));
    const aggregateStaffName = uniqueStaffNames.length === 1 ? resolvedAssignments[0].staffName : uniqueStaffNames.join(', ');

    // Customer resolution or creation
    const cleanPhone = customerPhone.trim();
    const existingCust = await db.select().from(customers).where(eq(customers.phone, cleanPhone)).limit(1);
    let customerRecordId: number;

    if (existingCust[0]) {
      customerRecordId = existingCust[0].id;
      if (customerEmail && !existingCust[0].email) {
        await db.update(customers).set({ email: customerEmail.trim() }).where(eq(customers.id, customerRecordId));
      }
    } else {
      const newCust = await db
        .insert(customers)
        .values({
          name: customerName.trim(),
          phone: cleanPhone,
          email: customerEmail ? customerEmail.trim() : null,
          totalVisits: 1,
          loyaltyPoints: 0,
          totalSpent: 0,
          notes: 'Customer created via Online Booking Portal',
        })
        .returning();
      customerRecordId = newCust[0].id;
    }

    // Generate unique booking code
    const uniqueNum = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `BK-ONL-${new Date().getFullYear()}-${uniqueNum}`;

    // Format readable notes with complete specialist breakdown + embedded lossless JSON block
    const readableAssignments = resolvedAssignments
      .map((a) => `• ${a.serviceName} (₹${a.price}): ${a.staffName} [${a.role} • ${a.gender}]${a.isAutoAssigned ? ' (Auto-assigned)' : ''}`)
      .join('\n');

    const customerNotesPrefix = notes && notes.trim() ? `${notes.trim()}\n\n` : '';
    const structuredNotes = `${customerNotesPrefix}Specialist Assignments:\n${readableAssignments}\n\n<!--SERVICE_ASSIGNMENTS:${JSON.stringify(resolvedAssignments)}-->`;

    // Insert Appointment with totalAmount and Online Booking source
    const apt = await db
      .insert(appointments)
      .values({
        bookingCode,
        source: 'Online Booking',
        customerId: customerRecordId,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail ? customerEmail.trim() : null,
        staffId: primaryStaff.id,
        staffName: aggregateStaffName,
        date,
        startTime,
        endTime,
        status: 'Confirmed',
        paymentStatus: 'Pending',
        notes: structuredNotes,
        totalAmount,
      })
      .returning();

    // Insert Appointment Services for each selected service
    for (const s of selectedServices) {
      await db.insert(appointmentServices).values({
        appointmentId: apt[0].id,
        serviceId: s.id,
        serviceName: s.name,
        price: s.price,
        duration: s.duration || 30,
      });
    }

    const serviceSummary = selectedServices.map((s) => s.name).join(', ');

    // Create Notification for Owner
    await db.insert(notifications).values({
      type: 'APPOINTMENT',
      title: `🌐 Online Booking: ${customerName.trim()}`,
      message: `${serviceSummary} (${selectedServices.length} services) booked with ${aggregateStaffName} on ${date} at ${formatTimeLabel(startTime)} (${bookingCode})`,
      referenceId: String(apt[0].id),
    });

    // Activity Log
    await db.insert(activityLogs).values({
      action: 'ONLINE_BOOKING',
      description: `Online booking #${apt[0].id} (${bookingCode}) by ${customerName.trim()} for ${serviceSummary} with specialists: ${aggregateStaffName}`,
      entityType: 'Appointment',
      entityId: String(apt[0].id),
    });

    res.json({
      success: true,
      bookingCode,
      appointment: apt[0],
      services: selectedServices,
      service: selectedServices[0], // for backward compatibility
      staff: primaryStaff,
      serviceAssignments: resolvedAssignments,
      allAssignedStaff: Array.from(usedStaffIdsInThisBooking).map((id) => allActiveStaff.find((st) => st.id === id)),
    });
  } catch (error: any) {
    console.error('Online booking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Customer Public Booking Lookup (Secure: by exact Booking Code or Phone)
apiRouter.get('/appointments/lookup', async (req, res) => {
  try {
    const { code, phone } = req.query;
    if (!code && !phone) {
      return res.status(400).json({ error: 'Please provide either your Booking Code or Phone Number to look up your booking.' });
    }

    let results: any[] = [];

    if (code && typeof code === 'string') {
      const trimmedCode = code.trim().toUpperCase();
      results = await db
        .select()
        .from(appointments)
        .where(eq(appointments.bookingCode, trimmedCode))
        .limit(1);
    } else if (phone && typeof phone === 'string') {
      const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
      results = await db
        .select()
        .from(appointments)
        .where(eq(appointments.customerPhone, cleanPhone))
        .orderBy(desc(appointments.id))
        .limit(5);
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No booking found matching your details. Please verify your booking code or phone number.' });
    }

    // Attach services and parsed serviceAssignments for each appointment
    const sanitizedBookings = await Promise.all(
      results.map(async (apt) => {
        const aptSvcs = await db
          .select({
            serviceName: services.name,
            duration: services.duration,
            price: services.price,
          })
          .from(appointmentServices)
          .innerJoin(services, eq(appointmentServices.serviceId, services.id))
          .where(eq(appointmentServices.appointmentId, apt.id));

        let serviceAssignments: any[] = [];
        if (apt.notes && apt.notes.includes('<!--SERVICE_ASSIGNMENTS:')) {
          try {
            const match = apt.notes.match(/<!--SERVICE_ASSIGNMENTS:(.*?)-->/);
            if (match && match[1]) {
              serviceAssignments = JSON.parse(match[1]);
            }
          } catch (e) {}
        }

        // Clean notes without internal JSON comment
        const displayNotes = apt.notes ? apt.notes.replace(/<!--SERVICE_ASSIGNMENTS:.*?-->/s, '').trim() : '';

        return {
          id: apt.id,
          bookingCode: apt.bookingCode || `APT-${apt.id}`,
          customerName: apt.customerName,
          customerPhone: `******${apt.customerPhone.slice(-4)}`, // Privacy masking
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          staffName: apt.staffName,
          status: apt.status,
          paymentStatus: apt.paymentStatus,
          totalAmount: apt.totalAmount,
          services: aptSvcs,
          serviceAssignments,
          notes: displayNotes,
        };
      })
    );

    res.json({ success: true, bookings: sanitizedBookings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. POS & BILLING SYSTEM (FULL & PARTIAL PAYMENTS)
// ==========================================
apiRouter.post('/pos/bill', async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      items, // array of { serviceId, serviceName, staffId, staffName, price, quantity }
      discount,
      discountReason,
      paidAmount,
      paymentMethod,
      appointmentId,
      notes,
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'At least one service item is required to generate a bill.' });
    }

    // Handle Customer (Existing or New Walk-In)
    let finalCustomer;
    if (customerId) {
      const c = await db.select().from(customers).where(eq(customers.id, Number(customerId))).limit(1);
      finalCustomer = c[0];
    }

    if (!finalCustomer) {
      if (!customerName || !customerPhone) {
        return res.status(400).json({ error: 'Customer Name and Phone are required for walk-in customer.' });
      }
      // Check if phone exists
      const existing = await db.select().from(customers).where(eq(customers.phone, customerPhone.trim())).limit(1);
      if (existing.length > 0) {
        finalCustomer = existing[0];
      } else {
        const created = await db
          .insert(customers)
          .values({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            notes: 'Walk-in customer',
          })
          .returning();
        finalCustomer = created[0];
        // Create loyalty account
        await db.insert(loyaltyAccounts).values({
          customerId: finalCustomer.id,
          customerName: finalCustomer.name,
          currentPoints: 0,
          totalPointsEarned: 0,
          totalPointsRedeemed: 0,
        });
      }
    }

    // Fetch salon tax settings
    const settingsList = await db.select().from(salonSettings).limit(1);
    const settings = settingsList[0] || { gstRate: 18, taxEnabled: true };

    // Calculate Subtotal
    const subtotal = items.reduce((acc: number, item: any) => {
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

    let status = 'Pending';
    if (numericPaid >= calc.grandTotal) {
      status = 'Paid';
    } else if (numericPaid > 0) {
      status = 'Partial';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const invoiceNumber = await generateNextInvoiceNumber();

    // Primary staff from first item or null
    const primaryStaffId = items[0]?.staffId ? Number(items[0].staffId) : null;
    const primaryStaffName = items[0]?.staffName || null;

    // 1. Insert Invoice
    const inv = await db
      .insert(invoices)
      .values({
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
        paymentMethod: paymentMethod || 'UPI',
        notes: notes || null,
      })
      .returning();

    // 2. Insert Invoice Items
    for (const item of items) {
      const qty = item.quantity ? Number(item.quantity) : 1;
      const unitPrice = Number(item.price || item.unitPrice || 0);
      await db.insert(invoiceItems).values({
        invoiceId: inv[0].id,
        serviceId: item.serviceId ? Number(item.serviceId) : null,
        serviceName: item.serviceName || item.name || 'Salon Service',
        staffId: item.staffId ? Number(item.staffId) : primaryStaffId,
        staffName: item.staffName || primaryStaffName,
        unitPrice,
        quantity: qty,
        total: unitPrice * qty,
      });
    }

    // 3. Record Payment if paidAmount > 0
    let paymentRecord = null;
    if (numericPaid > 0) {
      const paymentNumber = await generateNextPaymentNumber();
      const p = await db
        .insert(payments)
        .values({
          paymentNumber,
          invoiceId: inv[0].id,
          invoiceNumber: inv[0].invoiceNumber,
          customerId: finalCustomer.id,
          customerName: finalCustomer.name,
          amount: numericPaid,
          paymentMethod: paymentMethod || 'UPI',
          status: status,
          date: todayStr,
          notes: `Initial payment for ${invoiceNumber}`,
        })
        .returning();
      paymentRecord = p[0];

      // 4. Update Loyalty Points: 1 point per ₹100 paid
      const earnedPoints = Math.floor(numericPaid / 100);
      if (earnedPoints > 0) {
        await db
          .update(customers)
          .set({
            loyaltyPoints: sql`${customers.loyaltyPoints} + ${earnedPoints}`,
            totalVisits: sql`${customers.totalVisits} + 1`,
            totalSpent: sql`${customers.totalSpent} + ${numericPaid}`,
            lastVisit: new Date(),
          })
          .where(eq(customers.id, finalCustomer.id));

        await db
          .update(loyaltyAccounts)
          .set({
            currentPoints: sql`${loyaltyAccounts.currentPoints} + ${earnedPoints}`,
            totalPointsEarned: sql`${loyaltyAccounts.totalPointsEarned} + ${earnedPoints}`,
            updatedAt: new Date(),
          })
          .where(eq(loyaltyAccounts.customerId, finalCustomer.id));

        await db.insert(loyaltyTransactions).values({
          customerId: finalCustomer.id,
          type: 'EARNED',
          points: earnedPoints,
          invoiceId: inv[0].id,
          description: `Earned ${earnedPoints} points on ${invoiceNumber} payment`,
          date: todayStr,
        });
      }
    }

    // 5. Update Appointment if linked
    if (appointmentId) {
      await db
        .update(appointments)
        .set({
          status: 'Completed',
          paymentStatus: status,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, Number(appointmentId)));
    }

    // 6. Notification if partial/pending
    if (balanceAmount > 0) {
      await db.insert(notifications).values({
        type: 'PAYMENT_PENDING',
        title: `Pending Payment: ${invoiceNumber}`,
        message: `${finalCustomer.name} has a pending balance of ₹${balanceAmount.toLocaleString('en-IN')}.`,
        referenceId: invoiceNumber,
      });
    }

    // 7. Activity Log
    await db.insert(activityLogs).values({
      action: 'INVOICE_CREATED',
      description: `Generated ${invoiceNumber} for ${finalCustomer.name}: Grand Total ₹${calc.grandTotal.toLocaleString('en-IN')}, Paid ₹${numericPaid.toLocaleString('en-IN')}`,
      entityType: 'Invoice',
      entityId: invoiceNumber,
    });

    res.json({
      invoice: inv[0],
      items,
      payment: paymentRecord,
      totals: calc,
    });
  } catch (error: any) {
    console.error('POS Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. INVOICES & ADDITIONAL PAYMENTS (PARTIAL PAYMENT WORKFLOW)
// ==========================================
apiRouter.get('/invoices', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const { status, search } = req.query;
    let query = db.select().from(invoices);

    const conditions = [];
    if (status && typeof status === 'string' && status !== 'ALL') {
      conditions.push(eq(invoices.status, status));
    }
    if (search && typeof search === 'string') {
      const q = `%${search.trim()}%`;
      conditions.push(or(like(invoices.invoiceNumber, q), like(invoices.customerName, q), like(invoices.customerPhone, q)));
    }

    const list = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(invoices.id))
      : await query.orderBy(desc(invoices.id));

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/invoices/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const inv = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv[0]) return res.status(404).json({ error: 'Invoice not found' });

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const invPayments = await db.select().from(payments).where(eq(payments.invoiceId, id)).orderBy(desc(payments.id));
    const salon = await db.select().from(salonSettings).limit(1);

    res.json({
      invoice: inv[0],
      items,
      payments: invPayments,
      salon: salon[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Partial Payment Workflow: Receive additional payment against an invoice
 * Total = ₹1,500, First Paid = ₹1,000, Balance = ₹500
 * Second Payment = ₹500 => Paid = ₹1,500, Balance = ₹0, Status = Paid
 */
apiRouter.post('/invoices/:id/pay', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, paymentMethod, transactionReference, notes } = req.body;

    const inv = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv[0]) return res.status(404).json({ error: 'Invoice not found' });

    const additionalAmount = Math.round(Number(amount));
    if (additionalAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    if (additionalAmount > inv[0].balanceAmount) {
      return res.status(400).json({
        error: `Payment amount ₹${additionalAmount.toLocaleString('en-IN')} exceeds remaining balance of ₹${inv[0].balanceAmount.toLocaleString('en-IN')}.`,
      });
    }

    const newPaidAmount = inv[0].paidAmount + additionalAmount;
    const newBalance = Math.max(0, inv[0].grandTotal - newPaidAmount);
    const newStatus = newBalance === 0 ? 'Paid' : 'Partial';

    // 1. Update Invoice
    const updatedInvoice = await db
      .update(invoices)
      .set({
        paidAmount: newPaidAmount,
        balanceAmount: newBalance,
        status: newStatus,
        paymentMethod: paymentMethod || inv[0].paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();

    // 2. Insert Payment Record
    const todayStr = new Date().toISOString().split('T')[0];
    const paymentNumber = await generateNextPaymentNumber();

    const payment = await db
      .insert(payments)
      .values({
        paymentNumber,
        invoiceId: id,
        invoiceNumber: inv[0].invoiceNumber,
        customerId: inv[0].customerId,
        customerName: inv[0].customerName,
        amount: additionalAmount,
        paymentMethod: paymentMethod || 'UPI',
        status: newStatus,
        transactionReference: transactionReference || null,
        notes: notes || `Installment payment for ${inv[0].invoiceNumber}`,
        date: todayStr,
      })
      .returning();

    // 3. Loyalty points for additional amount
    const earnedPoints = Math.floor(additionalAmount / 100);
    if (earnedPoints > 0) {
      await db
        .update(customers)
        .set({
          loyaltyPoints: sql`${customers.loyaltyPoints} + ${earnedPoints}`,
          totalSpent: sql`${customers.totalSpent} + ${additionalAmount}`,
        })
        .where(eq(customers.id, inv[0].customerId));

      await db
        .update(loyaltyAccounts)
        .set({
          currentPoints: sql`${loyaltyAccounts.currentPoints} + ${earnedPoints}`,
          totalPointsEarned: sql`${loyaltyAccounts.totalPointsEarned} + ${earnedPoints}`,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.customerId, inv[0].customerId));

      await db.insert(loyaltyTransactions).values({
        customerId: inv[0].customerId,
        type: 'EARNED',
        points: earnedPoints,
        invoiceId: id,
        description: `Earned ${earnedPoints} points on installment payment ${paymentNumber}`,
        date: todayStr,
      });
    }

    // 4. Update linked appointment if fully paid
    if (newStatus === 'Paid' && inv[0].appointmentId) {
      await db
        .update(appointments)
        .set({ paymentStatus: 'Paid', updatedAt: new Date() })
        .where(eq(appointments.id, inv[0].appointmentId));
    }

    // 5. Activity log
    await db.insert(activityLogs).values({
      action: 'PAYMENT_RECEIVED',
      description: `Received payment of ₹${additionalAmount.toLocaleString('en-IN')} for ${inv[0].invoiceNumber}. Remaining balance: ₹${newBalance.toLocaleString('en-IN')}`,
      entityType: 'Payment',
      entityId: paymentNumber,
    });

    res.json({
      invoice: updatedInvoice[0],
      payment: payment[0],
      message: `Payment of ₹${additionalAmount.toLocaleString('en-IN')} successfully recorded.`,
    });
  } catch (error: any) {
    console.error('Error applying payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 10. PAYMENTS LEDGER
// ==========================================
apiRouter.get('/payments', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const list = await db.select().from(payments).orderBy(desc(payments.id));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 11. EXPENSES
// ==========================================
apiRouter.get('/expenses', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const { category, startDate, endDate } = req.query;
    let query = db.select().from(expenses);
    const conditions = [];

    if (category && typeof category === 'string' && category !== 'ALL') {
      conditions.push(eq(expenses.category, category));
    }
    if (startDate && typeof startDate === 'string') {
      conditions.push(gte(expenses.date, startDate));
    }
    if (endDate && typeof endDate === 'string') {
      conditions.push(lte(expenses.date, endDate));
    }

    const list = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(expenses.date), desc(expenses.id))
      : await query.orderBy(desc(expenses.date), desc(expenses.id));

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/expenses', async (req, res) => {
  try {
    const { title, category, amount, date, paymentMethod, description, addedBy } = req.body;
    if (!title || !category || amount === undefined) {
      return res.status(400).json({ error: 'Title, Category, and Amount in ₹ are required.' });
    }

    const created = await db
      .insert(expenses)
      .values({
        title,
        category,
        amount: Math.round(Number(amount)),
        date: date || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod || 'Bank Transfer',
        description: description || null,
        addedBy: addedBy || 'Owner',
      })
      .returning();

    await db.insert(activityLogs).values({
      action: 'EXPENSE_ADDED',
      description: `Added expense: ${title} (₹${amount} - ${category})`,
      entityType: 'Expense',
      entityId: String(created[0].id),
    });

    res.json(created[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/expenses/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(expenses).where(eq(expenses.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 12. INVENTORY & STOCK MOVEMENTS
// ==========================================
apiRouter.get('/inventory', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const products = await db.select().from(inventoryProducts).orderBy(inventoryProducts.name);
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/inventory', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    const { name, category, sku, supplierId, purchasePrice, sellingPrice, currentStock, minStockLevel, unit, expiryDate } = req.body;
    if (!name || !category || !sku || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({ error: 'Product name, category, SKU, purchase price and selling price are required.' });
    }

    // Check SKU duplicate
    const existingSku = await db.select().from(inventoryProducts).where(eq(inventoryProducts.sku, sku.trim())).limit(1);
    if (existingSku.length > 0) {
      return res.status(400).json({ error: `Product with SKU ${sku} already exists.` });
    }

    // Lookup supplier
    let supplierName = null;
    if (supplierId) {
      const s = await db.select().from(suppliers).where(eq(suppliers.id, Number(supplierId))).limit(1);
      supplierName = s[0]?.name || null;
    }

    const initStock = Math.max(0, Math.round(Number(currentStock || 0)));

    const created = await db
      .insert(inventoryProducts)
      .values({
        name,
        category,
        sku: sku.trim(),
        supplierId: supplierId ? Number(supplierId) : null,
        supplierName,
        purchasePrice: Math.round(Number(purchasePrice)),
        sellingPrice: Math.round(Number(sellingPrice)),
        currentStock: initStock,
        minStockLevel: Math.round(Number(minStockLevel || 5)),
        unit: unit || 'Units',
        expiryDate: expiryDate || null,
        isActive: true,
      })
      .returning();

    // Record initial movement
    const todayStr = new Date().toISOString().split('T')[0];
    if (initStock > 0) {
      await db.insert(inventoryMovements).values({
        productId: created[0].id,
        productName: created[0].name,
        quantity: initStock,
        previousStock: 0,
        newStock: initStock,
        type: 'PURCHASE',
        reason: 'Initial opening stock',
        performedBy: 'Owner',
        date: todayStr,
      });
    }

    await db.insert(activityLogs).values({
      action: 'PRODUCT_ADDED',
      description: `Added product: ${name} (SKU: ${sku}, Stock: ${initStock})`,
      entityType: 'Product',
      entityId: String(created[0].id),
    });

    res.json(created[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stock Movement: In, Out, or Adjustment
 * Must record movement and prevent negative stock!
 */
apiRouter.post('/inventory/:id/movement', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { quantity, type, reason, performedBy } = req.body;

    const prod = await db.select().from(inventoryProducts).where(eq(inventoryProducts.id, id)).limit(1);
    if (!prod[0]) return res.status(404).json({ error: 'Product not found.' });

    const qty = Math.round(Number(quantity));
    if (qty === 0) {
      return res.status(400).json({ error: 'Quantity must not be zero.' });
    }

    const previousStock = prod[0].currentStock;
    let newStock = previousStock;

    if (type === 'PURCHASE' || type === 'STOCK_IN' || type === 'RETURN') {
      newStock = previousStock + Math.abs(qty);
    } else if (type === 'SALE' || type === 'STOCK_OUT' || type === 'USAGE' || type === 'WASTAGE') {
      const deduction = Math.abs(qty);
      if (previousStock - deduction < 0) {
        return res.status(400).json({
          error: `Insufficient stock! Current stock is ${previousStock}, cannot deduct ${deduction}. Negative stock is not allowed.`,
        });
      }
      newStock = previousStock - deduction;
    } else if (type === 'ADJUSTMENT') {
      if (qty < 0 && previousStock + qty < 0) {
        return res.status(400).json({ error: 'Adjustment would result in negative stock!' });
      }
      newStock = previousStock + qty;
    }

    // 1. Update product currentStock
    const updated = await db
      .update(inventoryProducts)
      .set({
        currentStock: newStock,
        updatedAt: new Date(),
      })
      .where(eq(inventoryProducts.id, id))
      .returning();

    // 2. Record inventory movement
    const todayStr = new Date().toISOString().split('T')[0];
    await db.insert(inventoryMovements).values({
      productId: id,
      productName: prod[0].name,
      quantity: newStock - previousStock,
      previousStock,
      newStock,
      type: type || 'ADJUSTMENT',
      reason: reason || 'Stock update',
      performedBy: performedBy || 'Owner',
      date: todayStr,
    });

    // 3. Low stock alert notification if triggered
    if (newStock <= prod[0].minStockLevel) {
      await db.insert(notifications).values({
        type: 'LOW_STOCK',
        title: `Low Stock Alert: ${prod[0].name}`,
        message: `Current stock has fallen to ${newStock} ${prod[0].unit} (Min: ${prod[0].minStockLevel}). Please reorder.`,
        referenceId: prod[0].sku,
      });
    }

    await db.insert(activityLogs).values({
      action: 'STOCK_CHANGED',
      description: `Stock for ${prod[0].name} changed from ${previousStock} to ${newStock} (${type})`,
      entityType: 'Product',
      entityId: String(id),
    });

    res.json({ product: updated[0], previousStock, newStock });
  } catch (error: any) {
    console.error('Stock movement error:', error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/inventory/movements', async (req, res) => {
  try {
    const movements = await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.id)).limit(100);
    res.json(movements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 13. SUPPLIERS
// ==========================================
apiRouter.get('/suppliers', async (req, res) => {
  try {
    const list = await db.select().from(suppliers).orderBy(suppliers.name);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/suppliers', async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, gstNumber, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Supplier name and phone are required.' });
    }
    const created = await db
      .insert(suppliers)
      .values({
        name,
        contactPerson: contactPerson || null,
        phone,
        email: email || null,
        address: address || null,
        gstNumber: gstNumber || null,
        notes: notes || null,
      })
      .returning();
    res.json(created[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 14. PACKAGES & OFFERS
// ==========================================
apiRouter.get('/packages', async (req, res) => {
  try {
    const pkgs = await db.select().from(packages).orderBy(packages.name);
    const enriched = await Promise.all(
      pkgs.map(async (p) => {
        const svcs = await db.select().from(packageServices).where(eq(packageServices.packageId, p.id));
        return { ...p, services: svcs };
      })
    );
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/packages', async (req, res) => {
  try {
    const { name, description, price, validityDays, serviceIds } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Package name and price are required.' });
    }
    const created = await db
      .insert(packages)
      .values({
        name,
        description: description || null,
        price: Math.round(Number(price)),
        validityDays: validityDays ? Number(validityDays) : 90,
        isActive: true,
      })
      .returning();

    if (serviceIds && serviceIds.length) {
      for (const sId of serviceIds) {
        const s = await db.select().from(services).where(eq(services.id, Number(sId))).limit(1);
        if (s[0]) {
          await db.insert(packageServices).values({
            packageId: created[0].id,
            serviceId: s[0].id,
            serviceName: s[0].name,
            sessionsCount: 1,
          });
        }
      }
    }
    res.json(created[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/offers', async (req, res) => {
  try {
    const list = await db.select().from(offers).orderBy(desc(offers.id));
    res.json(list);
  } catch (error: any) {
    try {
      await initializeDatabase();
      const list = await db.select().from(offers).orderBy(desc(offers.id));
      return res.json(list);
    } catch (retryErr: any) {
      console.error('Error fetching offers:', retryErr);
      res.json([]); // Return empty array gracefully if offers table is empty or querying
    }
  }
});

apiRouter.post('/offers', async (req, res) => {
  try {
    const { title, code, discountType, discountValue, minBillAmount, serviceCategory, startDate, endDate, description } = req.body;
    if (!title || !code || !discountType || discountValue === undefined) {
      return res.status(400).json({ error: 'Title, promo code, discount type and discount value are required.' });
    }

    const created = await db
      .insert(offers)
      .values({
        title,
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Math.round(Number(discountValue)),
        minBillAmount: minBillAmount ? Math.round(Number(minBillAmount)) : 0,
        serviceCategory: serviceCategory || 'ALL',
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || '2026-12-31',
        isActive: true,
        description: description || null,
      })
      .returning();

    res.json(created[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 15. LOYALTY PROGRAM
// ==========================================
apiRouter.get('/loyalty', async (req, res) => {
  try {
    const accounts = await db.select().from(loyaltyAccounts).orderBy(desc(loyaltyAccounts.currentPoints));
    const transactions = await db.select().from(loyaltyTransactions).orderBy(desc(loyaltyTransactions.id)).limit(50);
    const settings = await db.select().from(salonSettings).limit(1);

    res.json({
      accounts,
      transactions,
      settings: {
        pointsPer100: settings[0]?.loyaltyPointsPer100 || 1,
        pointValueInr: settings[0]?.loyaltyPointValueInr || 1,
        minRedemptionPoints: settings[0]?.loyaltyMinRedemptionPoints || 50,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 16. REPORTS & ANALYTICS (ONLY ACTUAL DATABASE DATA)
// ==========================================
apiRouter.get('/reports', async (req, res) => {
  try {
    if (!requireAdminAuth(req, res)) return;
    // 1. Payment methods breakdown
    const allPayments = await db.select().from(payments);
    const paymentMethods: Record<string, { count: number; total: number }> = {};
    for (const p of allPayments) {
      const method = p.paymentMethod || 'Other';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].total += p.amount || 0;
    }

    // 2. Service Performance from invoice items
    const allItems = await db.select().from(invoiceItems);
    const servicePerformance: Record<string, { bookings: number; revenue: number }> = {};
    for (const item of allItems) {
      const name = item.serviceName;
      if (!servicePerformance[name]) {
        servicePerformance[name] = { bookings: 0, revenue: 0 };
      }
      servicePerformance[name].bookings += item.quantity || 1;
      servicePerformance[name].revenue += item.total || 0;
    }
    const serviceRankings = Object.entries(servicePerformance)
      .map(([name, data]) => ({ service: name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // 3. Staff Performance
    const allStaff = await db.select().from(staff);
    const staffReport = await Promise.all(
      allStaff.map(async (st) => {
        const stAppts = await db
          .select({ count: sql<number>`count(*)` })
          .from(appointments)
          .where(eq(appointments.staffId, st.id));
        const stSales = await db
          .select({ total: sql<number>`sum(${invoiceItems.total})` })
          .from(invoiceItems)
          .where(eq(invoiceItems.staffId, st.id));

        const revenue = Number(stSales[0]?.total || 0);
        const commission = Math.round((revenue * st.commissionPercentage) / 100);

        return {
          staff: st.name,
          role: st.role,
          appointments: Number(stAppts[0]?.count || 0),
          revenue,
          commission,
        };
      })
    );

    // 4. Expenses by Category
    const allExpenses = await db.select().from(expenses);
    const expensesByCategory: Record<string, number> = {};
    let totalExpenseAmount = 0;
    for (const exp of allExpenses) {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
      totalExpenseAmount += exp.amount;
    }

    // 5. Total Revenue & Net Profit
    const totalRevenue = allPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const netRevenue = totalRevenue - totalExpenseAmount;

    // 6. Inventory Valuation
    const products = await db.select().from(inventoryProducts);
    let totalStockValue = 0;
    let lowStockCount = 0;
    for (const p of products) {
      totalStockValue += p.currentStock * p.purchasePrice;
      if (p.currentStock <= p.minStockLevel) {
        lowStockCount++;
      }
    }

    // 7. Customers Report
    const totalCustomersRes = await db.select({ count: sql<number>`count(*)` }).from(customers);
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
      totalCustomers: totalCustCount,
    });
  } catch (error: any) {
    console.error('Reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 17. NOTIFICATIONS & ACTIVITY LOGS
// ==========================================
apiRouter.get('/notifications', async (req, res) => {
  try {
    const list = await db.select().from(notifications).orderBy(desc(notifications.id)).limit(30);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/notifications/:id/read', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/notifications/read-all', async (req, res) => {
  try {
    await db.update(notifications).set({ isRead: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/activity-logs', async (req, res) => {
  try {
    const logs = await db.select().from(activityLogs).orderBy(desc(activityLogs.id)).limit(100);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
