import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  json,
  boolean,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'owner',
  'tenant',
  'admin',
]);

export const roomStatusEnum = pgEnum('room_status', [
  'available',
  'occupied',
  'maintenance',
]);

export const roomTypeEnum = pgEnum('room_type', [
  'single',
  'double',
  'suite',
]);

export const leaseStatusEnum = pgEnum('lease_status', [
  'active',
  'expired',
  'terminated',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'overdue',
]);

export const maintenanceStatusEnum = pgEnum('maintenance_status', [
  'open',
  'in_progress',
  'completed',
]);

export const maintenancePriorityEnum = pgEnum('maintenance_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'pending',
  'paid',
  'overdue',
  'cancelled',
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'cash',
  'aba',
  'acleda',
  'wing',
]);

export const paymentTransactionStatusEnum = pgEnum(
  'payment_transaction_status',
  [
    'pending',
    'paid',
    'failed',
    'expired',
  ]
);
// Tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('tenant'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const properties = pgTable('properties', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  zip: varchar('zip', { length: 20 }).notNull(),
  description: text('description'),
  khqrImageUrl: varchar('khqr_image_url', {
    length: 1000,
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id')
    .notNull()
    .references(() => properties.id),
  roomNumber: varchar('room_number', { length: 50 }).notNull(),
  type: roomTypeEnum('type').notNull(),
  capacity: integer('capacity').notNull(),
  pricePerMonth: decimal('price_per_month', {
    precision: 10,
    scale: 2,
  }).notNull(),
  status: roomStatusEnum('status').notNull().default('available'),
  amenities: json('amenities').$type<string[]>().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  phone: varchar('phone', { length: 20 }).notNull(),
  emergencyContact: varchar('emergency_contact', { length: 255 }),
  employmentVerification: boolean('employment_verification').default(false),
  imageUrl: varchar('image_url', { length: 512 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const leases = pgTable('leases', {
  id: serial('id').primaryKey(),
  roomId: integer('room_id')
    .notNull()
    .references(() => rooms.id),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  monthlyRent: decimal('monthly_rent', {
    precision: 10,
    scale: 2,
  }).notNull(),
  depositAmount: decimal('deposit_amount', {
    precision: 10,
    scale: 2,
  }).notNull(),
  status: leaseStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  leaseId: integer('lease_id')
    .notNull()
    .references(() => leases.id),
  tenantId: integer('tenant_id')
    .references(() => tenants.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentDate: date('payment_date'),
  dueDate: date('due_date').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: serial('id').primaryKey(),

    invoiceId: integer('invoice_id')
      .notNull()
      .references(() => invoices.id),

    amountUsd: decimal('amount_usd', {
      precision: 10,
      scale: 2,
    }).notNull(),

    amountRiel: integer('amount_riel'),

    provider: paymentProviderEnum('provider')
      .default('aba')
      .notNull(),

    transactionRef: varchar('transaction_ref', {
      length: 255,
    }),

    qrReference: varchar('qr_reference', {
      length: 255,
    }),

    status: paymentTransactionStatusEnum('status')
      .default('pending')
      .notNull(),

    paidAt: timestamp('paid_at'),

    createdAt: timestamp('created_at')
      .defaultNow()
      .notNull(),
  }
);

export const maintenanceRequests = pgTable('maintenance_requests', {
  id: serial('id').primaryKey(),
  roomId: integer('room_id')
    .notNull()
    .references(() => rooms.id),
  reportedByUserId: integer('reported_by_user_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  priority: maintenancePriorityEnum('priority').notNull().default('medium'),
  status: maintenanceStatusEnum('status').notNull().default('open'),
  estimatedCost: decimal('estimated_cost', {
    precision: 10,
    scale: 2,
  }),
  actualCost: decimal('actual_cost', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const inspections = pgTable('inspections', {
  id: serial('id').primaryKey(),
  roomId: integer('room_id')
    .notNull()
    .references(() => rooms.id),
  inspectorId: integer('inspector_id')
    .notNull()
    .references(() => users.id),
  inspectionDate: date('inspection_date').notNull(),
  conditionNotes: text('condition_notes'),
  issuesFound: json('issues_found').$type<Array<{
    issue: string;
    severity: string;
  }>>().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .references(() => tenants.id),
  documentType: varchar('document_type', { length: 100 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  leaseId: integer('lease_id')
    .notNull()
    .references(() => leases.id),
  roomNumber: varchar('room_number', { length: 50 }).notNull(),
  tenantName: varchar('tenant_name', { length: 255 }).notNull(),
  
  // Water readings
  waterLastMonth: integer('water_last_month').notNull(),
  waterThisMonth: integer('water_this_month').notNull(),
  waterUsage: integer('water_usage').notNull(),
  waterRate: decimal('water_rate', { precision: 10, scale: 2 }).notNull(),
  waterTotal: decimal('water_total', { precision: 10, scale: 2 }).notNull(),

  // Electricity readings
  electricityLastMonth: integer('electricity_last_month').notNull(),
  electricityThisMonth: integer('electricity_this_month').notNull(),
  electricityUsage: integer('electricity_usage').notNull(),
  electricityRate: decimal('electricity_rate', { precision: 10, scale: 2 }).notNull(),
  electricityTotal: decimal('electricity_total', { precision: 10, scale: 2 }).notNull(),

  // Fixed Costs
  roomRent: decimal('room_rent', { precision: 10, scale: 2 }).notNull(),
  grandTotal: decimal('grand_total', { precision: 10, scale: 2 }).notNull(),
  
  status: invoiceStatusEnum('status').default('pending').notNull(),
  billingPeriod: varchar('billing_period', { length: 50 }).notNull(),
  dueDate: date('due_date').notNull(),
   paymentReference: varchar(
    'payment_reference',
    { length: 255 }
  ),

  paidAt: timestamp('paid_at'),

  paymentScreenshot: varchar(
    'payment_screenshot',
    { length: 1000 }
  ),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});


// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  tenants: many(tenants),
  maintenanceRequests: many(maintenanceRequests),
  inspections: many(inspections),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerId],
    references: [users.id],
  }),
  rooms: many(rooms),
}));


export const roomsRelations = relations(rooms, ({ one, many }) => ({
  property: one(properties, {
    fields: [rooms.propertyId],
    references: [properties.id],
  }),
  leases: many(leases),
  maintenanceRequests: many(maintenanceRequests),
  inspections: many(inspections),
}));




export const leasesRelations = relations(leases, ({ one, many }) => ({
  room: one(rooms, {
    fields: [leases.roomId],
    references: [rooms.id],
  }),
  tenant: one(tenants, {
    fields: [leases.tenantId],
    references: [tenants.id],
  }),
  payments: many(payments),
  documents: many(documents),
  invoices: many(invoices),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  lease: one(leases, {
    fields: [payments.leaseId],
    references: [leases.id],
  }),
}));

export const maintenanceRequestsRelations = relations(
  maintenanceRequests,
  ({ one }) => ({
    room: one(rooms, {
      fields: [maintenanceRequests.roomId],
      references: [rooms.id],
    }),
    reportedBy: one(users, {
      fields: [maintenanceRequests.reportedByUserId],
      references: [users.id],
    }),
  })
);

export const inspectionsRelations = relations(
  inspections,
  ({ one }) => ({
    room: one(rooms, {
      fields: [inspections.roomId],
      references: [rooms.id],
    }),
    inspector: one(users, {
      fields: [inspections.inspectorId],
      references: [users.id],
    }),
  })
);



export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  user: one(users, {
    fields: [tenants.userId],
    references: [users.id],
  }),
  leases: many(leases),
  documents: many(documents), // <-- Enables the .with.documents relation block
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
}));

export const paymentTransactionsRelations =
  relations(
    paymentTransactions,
    ({ one }) => ({
      invoice: one(invoices, {
        fields: [paymentTransactions.invoiceId],
        references: [invoices.id],
      }),
    })
  );

  export const invoicesRelations = relations(
  invoices,
  ({ one, many }) => ({
    lease: one(leases, {
      fields: [invoices.leaseId],
      references: [leases.id],
    }),

    paymentTransactions: many(
      paymentTransactions
    ),
  })
);