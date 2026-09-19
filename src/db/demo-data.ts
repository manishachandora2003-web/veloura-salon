import { db } from './index.ts';
import {
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
  services,
} from './schema.ts';
import { INITIAL_35_STAFF } from './initial-staff.ts';
import { sql } from 'drizzle-orm';

export async function clearAllDemoData() {
  // Clear transactional and CRM data in reverse foreign key order
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
  // Do NOT delete staff to retain the 25 staff members
  await db.delete(customers);
  await db.delete(offers);
  await db.delete(notifications);
  await db.delete(activityLogs);

  await db.insert(activityLogs).values({
    userName: 'Anita Sharma (Owner)',
    userRole: 'OWNER',
    action: 'DEMO_DATA_CLEARED',
    description: 'Cleared all demo transactions, customers, and inventory data.',
    entityType: 'System',
  });

  return { success: true, message: 'All demo data successfully cleared. 25 staff members, base 31 services and settings retained.' };
}

export async function loadIndianSalonDemoData() {
  // First clear existing transactional data to prevent duplicates
  await clearAllDemoData();

  const allServices = await db.select().from(services);
  const findService = (name: string) => allServices.find((s) => s.name === name) || allServices[0];

  // 1. Staff - ensure the 35 staff members are present
  let existingStaff = await db.select().from(staff);
  if (existingStaff.length < 35) {
    await db.delete(staff);
    existingStaff = await db.insert(staff).values(INITIAL_35_STAFF).returning();
  }
  const insertedStaff = existingStaff;

  // 2. Customers
  const customersData = [
    {
      name: 'Priya Patel',
      phone: '+91 98765 43211',
      email: 'priya.patel@gmail.com',
      dob: '1994-08-14',
      gender: 'Female',
      address: '12th Main, HAL 2nd Stage, Indiranagar',
      notes: 'Sensitive scalp, prefers herbal conditioner',
      preferences: 'Tea without sugar, lukewarm water',
      loyaltyPoints: 120,
      totalVisits: 5,
      totalSpent: 12500,
    },
    {
      name: 'Sneha Rao',
      phone: '+91 98765 43212',
      email: 'sneha.rao@outlook.com',
      dob: '1998-11-22',
      gender: 'Female',
      address: '7th Cross, Koramangala 4th Block',
      notes: 'Wedding scheduled next month; booked bridal package',
      preferences: 'Gold facial fan, loves relaxing head massage',
      loyaltyPoints: 85,
      totalVisits: 3,
      totalSpent: 8900,
    },
    {
      name: 'Ananya Iyer',
      phone: '+91 98765 43213',
      email: 'ananya.iyer@gmail.com',
      dob: '1992-04-05',
      gender: 'Female',
      address: 'B-402, Prestige Palms, Domlur',
      notes: 'Always books with Pooja for haircut',
      preferences: 'Blow dry with soft waves',
      loyaltyPoints: 40,
      totalVisits: 2,
      totalSpent: 3500,
    },
    {
      name: 'Vikram Malhotra',
      phone: '+91 98765 43214',
      email: 'vikram.m@techcorp.in',
      dob: '1989-12-30',
      gender: 'Male',
      address: 'Diamond District, Old Airport Road',
      notes: 'Head massage and regular hair wash',
      preferences: 'Evening appointments after 6 PM',
      loyaltyPoints: 15,
      totalVisits: 1,
      totalSpent: 1500,
    },
    {
      name: 'Pooja Verma',
      phone: '+91 98765 43215',
      email: 'pooja.verma@yahoo.com',
      dob: '2001-07-19',
      gender: 'Female',
      address: 'Defence Colony, Indiranagar',
      notes: 'College student; active on Instagram',
      preferences: 'Nail spa & fruit facial',
      loyaltyPoints: 25,
      totalVisits: 2,
      totalSpent: 2200,
    },
  ];

  const insertedCustomers = await db.insert(customers).values(customersData).returning();

  // Create loyalty accounts for each customer
  for (const c of insertedCustomers) {
    await db.insert(loyaltyAccounts).values({
      customerId: c.id,
      customerName: c.name,
      currentPoints: c.loyaltyPoints,
      totalPointsEarned: c.loyaltyPoints,
      totalPointsRedeemed: 0,
    });
  }

  // 3. Suppliers
  const suppliersData = [
    {
      name: "L'Oréal Professional India",
      contactPerson: 'Arun Nair',
      phone: '+91 98200 11223',
      email: 'orders@loreal-pro-in.com',
      address: 'Whitefield Trade Centre, Bengaluru',
      gstNumber: '29AAACL1234F1Z1',
      notes: 'Next-day delivery on orders above ₹10,000',
    },
    {
      name: 'Vedic Glow Botanicals',
      contactPerson: 'Meera Nambiar',
      phone: '+91 98450 33445',
      email: 'sales@vedicglow.in',
      address: 'Peenya Industrial Area, Bengaluru',
      gstNumber: '29AABCV5678G1Z2',
      notes: 'Organic ayurvedic massage oils and herbal facial packs',
    },
    {
      name: 'Rica Wax & Salon Essentials',
      contactPerson: 'Suresh Kumar',
      phone: '+91 98800 55667',
      email: 'suresh@ricawaxdist.in',
      address: 'Brigade Road Commercial Hub, Bengaluru',
      gstNumber: '29AADCR9012H1Z3',
      notes: 'Italian liposoluble wax, strips and spatulas',
    },
  ];
  const insertedSuppliers = await db.insert(suppliers).values(suppliersData).returning();

  // 4. Inventory Products & Movements
  const productsData = [
    {
      name: "L'Oréal Serie Expert Keratin Shampoo 500ml",
      category: 'Hair Care',
      sku: 'SKU-LOR-KER-500',
      supplierId: insertedSuppliers[0].id,
      supplierName: insertedSuppliers[0].name,
      purchasePrice: 650,
      sellingPrice: 950,
      currentStock: 14,
      minStockLevel: 5,
      unit: 'Bottles',
      expiryDate: '2027-10-31',
    },
    {
      name: "L'Oréal Mythic Oil Serum 100ml",
      category: 'Hair Care',
      sku: 'SKU-LOR-MYTH-100',
      supplierId: insertedSuppliers[0].id,
      supplierName: insertedSuppliers[0].name,
      purchasePrice: 780,
      sellingPrice: 1200,
      currentStock: 8,
      minStockLevel: 4,
      unit: 'Bottles',
      expiryDate: '2027-08-15',
    },
    {
      name: 'Vedic Gold Facial Radiance Kit (5 Sessions)',
      category: 'Skin Care',
      sku: 'SKU-VED-GOLD-KIT',
      supplierId: insertedSuppliers[1].id,
      supplierName: insertedSuppliers[1].name,
      purchasePrice: 1800,
      sellingPrice: 3200,
      currentStock: 3, // LOW STOCK to demonstrate alert!
      minStockLevel: 5,
      unit: 'Kits',
      expiryDate: '2026-12-31',
    },
    {
      name: 'Rica White Chocolate Wax Tin 800ml',
      category: 'Consumables',
      sku: 'SKU-RIC-WAX-800',
      supplierId: insertedSuppliers[2].id,
      supplierName: insertedSuppliers[2].name,
      purchasePrice: 850,
      sellingPrice: 1350,
      currentStock: 6,
      minStockLevel: 4,
      unit: 'Tins',
      expiryDate: '2028-01-01',
    },
    {
      name: 'Ayurvedic Bhringraj Scalp Oil 1L',
      category: 'Consumables',
      sku: 'SKU-AYU-BHR-1000',
      supplierId: insertedSuppliers[1].id,
      supplierName: insertedSuppliers[1].name,
      purchasePrice: 550,
      sellingPrice: 900,
      currentStock: 2, // LOW STOCK alert!
      minStockLevel: 4,
      unit: 'Litres',
      expiryDate: '2027-05-30',
    },
  ];

  const insertedProducts = await db.insert(inventoryProducts).values(productsData).returning();

  const todayStr = new Date().toISOString().split('T')[0];

  // Record stock movements
  for (const p of insertedProducts) {
    await db.insert(inventoryMovements).values({
      productId: p.id,
      productName: p.name,
      quantity: p.currentStock,
      previousStock: 0,
      newStock: p.currentStock,
      type: 'PURCHASE',
      reason: 'Initial opening stock consignment',
      performedBy: 'Anita Sharma (Owner)',
      date: todayStr,
    });
  }

  // 5. Offers
  await db.insert(offers).values([
    {
      title: 'Monsoon Glow 15% Off',
      code: 'MONSOON15',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minBillAmount: 1000,
      serviceCategory: 'FACIAL & SKIN',
      startDate: todayStr,
      endDate: '2026-12-31',
      isActive: true,
      description: 'Get 15% off on all facial and skin glow treatments above ₹1,000',
    },
    {
      title: 'Bridal Makeover Flat ₹500 Off',
      code: 'BRIDAL500',
      discountType: 'FIXED_INR',
      discountValue: 500,
      minBillAmount: 4000,
      serviceCategory: 'MAKEUP',
      startDate: todayStr,
      endDate: '2026-12-31',
      isActive: true,
      description: 'Flat ₹500 off on bridal and engagement makeup bookings',
    },
  ]);

  // 6. Packages
  const pkg = await db.insert(packages).values({
    name: 'Bridal Radiance Royal Package',
    description: 'Comprehensive 4-session head-to-toe bridal transformation',
    price: 9999,
    validityDays: 120,
    isActive: true,
  }).returning();

  const bridalMakeupSvc = findService('Bridal Makeup');
  const goldFacialSvc = findService('Gold Facial');
  const hairSpaSvc = findService('Hair Spa');

  await db.insert(packageServices).values([
    { packageId: pkg[0].id, serviceId: bridalMakeupSvc.id, serviceName: bridalMakeupSvc.name, sessionsCount: 1 },
    { packageId: pkg[0].id, serviceId: goldFacialSvc.id, serviceName: goldFacialSvc.name, sessionsCount: 2 },
    { packageId: pkg[0].id, serviceId: hairSpaSvc.id, serviceName: hairSpaSvc.name, sessionsCount: 1 },
  ]);

  // 7. Realistic Appointments for Today
  const s1 = findService('Haircut');
  const s2 = findService('Hair Spa');
  const s3 = findService('Gold Facial');
  const s4 = findService('Head Massage');

  const apt1 = await db.insert(appointments).values({
    customerId: insertedCustomers[0].id,
    customerName: insertedCustomers[0].name,
    customerPhone: insertedCustomers[0].phone,
    staffId: insertedStaff[0].id, // Pooja
    staffName: insertedStaff[0].name,
    date: todayStr,
    startTime: '10:00',
    endTime: '11:00',
    status: 'Completed',
    paymentStatus: 'Paid',
    totalAmount: s2.price,
    notes: 'Regular customer; deep conditioning requested',
  }).returning();

  await db.insert(appointmentServices).values({
    appointmentId: apt1[0].id,
    serviceId: s2.id,
    serviceName: s2.name,
    price: s2.price,
    duration: s2.duration,
  });

  const apt2 = await db.insert(appointments).values({
    customerId: insertedCustomers[1].id,
    customerName: insertedCustomers[1].name,
    customerPhone: insertedCustomers[1].phone,
    staffId: insertedStaff[1].id, // Kavita
    staffName: insertedStaff[1].name,
    date: todayStr,
    startTime: '11:30',
    endTime: '12:30',
    status: 'In Progress',
    paymentStatus: 'Partial',
    totalAmount: s3.price,
    notes: 'Pre-wedding consultation and facial',
  }).returning();

  await db.insert(appointmentServices).values({
    appointmentId: apt2[0].id,
    serviceId: s3.id,
    serviceName: s3.name,
    price: s3.price,
    duration: s3.duration,
  });

  const apt3 = await db.insert(appointments).values({
    customerId: insertedCustomers[2].id,
    customerName: insertedCustomers[2].name,
    customerPhone: insertedCustomers[2].phone,
    staffId: insertedStaff[2].id, // Rahul
    staffName: insertedStaff[2].name,
    date: todayStr,
    startTime: '14:00',
    endTime: '14:30',
    status: 'Confirmed',
    paymentStatus: 'Pending',
    totalAmount: s1.price,
    notes: 'Afternoon haircut slot',
  }).returning();

  await db.insert(appointmentServices).values({
    appointmentId: apt3[0].id,
    serviceId: s1.id,
    serviceName: s1.name,
    price: s1.price,
    duration: s1.duration,
  });

  // 8. Invoices & Payments (Demonstrating Paid, Partial, and Pending)
  // Bill 1: Fully Paid (Hair Spa ₹800 + Hair Wash ₹150 = ₹950 subtotal - ₹50 discount = ₹900 taxable + 18% GST ₹162 = ₹1,062)
  const inv1 = await db.insert(invoices).values({
    invoiceNumber: 'INV-2026-0001',
    appointmentId: apt1[0].id,
    customerId: insertedCustomers[0].id,
    customerName: insertedCustomers[0].name,
    customerPhone: insertedCustomers[0].phone,
    staffId: insertedStaff[0].id,
    staffName: insertedStaff[0].name,
    date: todayStr,
    subtotal: 950,
    discount: 50,
    discountReason: 'Regular Customer Courtesy',
    taxRate: 18,
    taxAmount: 162,
    grandTotal: 1062,
    paidAmount: 1062,
    balanceAmount: 0,
    status: 'Paid',
    paymentMethod: 'UPI',
    notes: 'Paid via GPay UPI',
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
      total: 800,
    },
    {
      invoiceId: inv1[0].id,
      serviceId: findService('Hair Wash').id,
      serviceName: 'Hair Wash',
      staffId: insertedStaff[0].id,
      staffName: insertedStaff[0].name,
      unitPrice: 150,
      quantity: 1,
      total: 150,
    },
  ]);

  await db.insert(payments).values({
    paymentNumber: 'PAY-2026-0001',
    invoiceId: inv1[0].id,
    invoiceNumber: 'INV-2026-0001',
    customerId: insertedCustomers[0].id,
    customerName: insertedCustomers[0].name,
    amount: 1062,
    paymentMethod: 'UPI',
    status: 'Paid',
    transactionReference: 'UPI-REF-9843210452',
    date: todayStr,
    notes: 'GPay UPI confirmation',
  });

  // Loyalty transaction for Bill 1
  await db.insert(loyaltyTransactions).values({
    customerId: insertedCustomers[0].id,
    type: 'EARNED',
    points: 10,
    invoiceId: inv1[0].id,
    description: '10 points earned on INV-2026-0001 payment',
    date: todayStr,
  });

  // Bill 2: PARTIAL PAYMENT (Section 36 demonstration!)
  // Total = ₹1,500 (Subtotal ₹1,271 + 18% GST ₹229 = ₹1,500)
  // First payment: ₹1,000 paid, Balance: ₹500, Status: Partial
  const inv2 = await db.insert(invoices).values({
    invoiceNumber: 'INV-2026-0002',
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
    paidAmount: 1000,
    balanceAmount: 500,
    status: 'Partial',
    paymentMethod: 'Cash',
    notes: 'Advance cash ₹1,000 paid; balance ₹500 due on service finish',
  }).returning();

  await db.insert(invoiceItems).values({
    invoiceId: inv2[0].id,
    serviceId: s3.id,
    serviceName: s3.name,
    staffId: insertedStaff[1].id,
    staffName: insertedStaff[1].name,
    unitPrice: 1271,
    quantity: 1,
    total: 1271,
  });

  await db.insert(payments).values({
    paymentNumber: 'PAY-2026-0002',
    invoiceId: inv2[0].id,
    invoiceNumber: 'INV-2026-0002',
    customerId: insertedCustomers[1].id,
    customerName: insertedCustomers[1].name,
    amount: 1000,
    paymentMethod: 'Cash',
    status: 'Partial',
    date: todayStr,
    notes: 'First installment cash payment',
  });

  // 9. Realistic Salon Expenses
  await db.insert(expenses).values([
    {
      title: 'BESCOM Electricity Bill - Salon Floor',
      category: 'Electricity',
      amount: 4850,
      date: todayStr,
      paymentMethod: 'Bank Transfer',
      description: 'Monthly commercial tariff electricity payment',
      addedBy: 'Anita Sharma (Owner)',
    },
    {
      title: 'Salon Towels Laundry & Steam Wash',
      category: 'Maintenance',
      amount: 650,
      date: todayStr,
      paymentMethod: 'UPI',
      description: 'Weekly bulk towel sanitation and laundry',
      addedBy: 'Anita Sharma (Owner)',
    },
    {
      title: 'Refreshments (Coffee, Green Tea & Biscuits)',
      category: 'Other',
      amount: 420,
      date: todayStr,
      paymentMethod: 'Cash',
      description: 'Customer and staff hospitality pantry supplies',
      addedBy: 'Anita Sharma (Owner)',
    },
  ]);

  // 10. Notifications
  await db.insert(notifications).values([
    {
      type: 'LOW_STOCK',
      title: 'Low Stock Alert: Ayurvedic Bhringraj Scalp Oil',
      message: 'Current stock is 2 Litres (below threshold of 4 Litres). Reorder from Vedic Glow Botanicals.',
      referenceId: 'SKU-AYU-BHR-1000',
      isRead: false,
    },
    {
      type: 'PAYMENT_PENDING',
      title: 'Pending Balance: Sneha Rao (INV-2026-0002)',
      message: 'Balance of ₹500 is pending against invoice INV-2026-0002.',
      referenceId: 'INV-2026-0002',
      isRead: false,
    },
    {
      type: 'APPOINTMENT',
      title: 'Upcoming Appointment: Ananya Iyer at 02:00 PM',
      message: 'Confirmed Haircut appointment with Rahul Verma at 02:00 PM.',
      referenceId: String(apt3[0].id),
      isRead: false,
    },
  ]);

  // 11. Activity Log
  await db.insert(activityLogs).values([
    {
      userName: 'Anita Sharma (Owner)',
      userRole: 'OWNER',
      action: 'DEMO_DATA_LOADED',
      description: 'Loaded realistic Indian salon operational data with customers, staff, appointments and inventory.',
      entityType: 'System',
    },
    {
      userName: 'Pooja Deshmukh',
      userRole: 'STAFF',
      action: 'APPOINTMENT_COMPLETED',
      description: 'Completed Hair Spa service for Priya Patel.',
      entityType: 'Appointment',
      entityId: String(apt1[0].id),
    },
    {
      userName: 'Anita Sharma (Owner)',
      userRole: 'OWNER',
      action: 'INVOICE_GENERATED',
      description: 'Generated invoice INV-2026-0001 for Priya Patel totaling ₹1,062.',
      entityType: 'Invoice',
      entityId: 'INV-2026-0001',
    },
  ]);

  return {
    success: true,
    message: 'Realistic Indian salon demo data successfully loaded into PostgreSQL database.',
  };
}
