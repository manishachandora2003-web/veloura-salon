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
 * Initializes database with default salon settings, exact 31 predefined Indian salon services,
 * and the 35 dedicated staff members across 7 categories.
 */
export async function initializeDatabase() {
  try {
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
      // Keep prices in sync with the 50% increased values
      for (const s of PREDEFINED_SERVICES) {
        await db.update(services)
          .set({ price: s.price })
          .where(eq(services.name, s.name));
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
