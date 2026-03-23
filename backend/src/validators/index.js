const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

// --- Common ---
const pagination = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().max(100),
  search: Joi.string().max(200).allow(''),
  searchFields: Joi.string().max(200),
  status: Joi.string().max(50),
  property: Joi.string().max(50),
  tenant: Joi.string().max(50),
});

// --- Auth ---
const userRegister = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().max(50).allow(''),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('owner', 'tenant'),
  phone: Joi.alternatives().try(Joi.string().pattern(/^\+?[\d\s-]{7,15}$/), Joi.string().allow('')),
  dateOfBirth: Joi.date().iso().less('now').allow(null),
  gender: Joi.string().valid('male', 'female', 'other'),
  address: Joi.object({
    street: Joi.string().max(200),
    city: Joi.string().max(100),
    state: Joi.string().max(100),
    zipCode: Joi.string().max(20),
    country: Joi.string().max(100),
  }),
  bio: Joi.string().max(500).allow(''),
});

const userLogin = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const userUpdate = Joi.object({
  firstName: Joi.string().trim().min(2).max(50),
  lastName: Joi.string().trim().max(50).allow(''),
  phone: Joi.alternatives().try(Joi.string().pattern(/^\+?[\d\s-]{7,15}$/), Joi.string().allow('')),
  dateOfBirth: Joi.date().iso().less('now').allow(null),
  gender: Joi.string().valid('male', 'female', 'other'),
  address: Joi.object({
    street: Joi.string().max(200).allow(''),
    city: Joi.string().max(100).allow(''),
    state: Joi.string().max(100).allow(''),
    zipCode: Joi.string().max(20).allow(''),
    country: Joi.string().max(100).allow(''),
  }),
  bio: Joi.string().max(500).allow(''),
  avatar: Joi.string().allow(null, ''),
});

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().required(),
});

const resetPassword = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

// --- Property ---
const propertyCreate = Joi.object({
  name: Joi.string().trim().max(100).required(),
  description: Joi.string().max(1000).allow(''),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().default('India'),
  }).required(),
  propertyType: Joi.string().valid('apartment', 'house', 'condo', 'studio', 'room', 'commercial', 'villa', 'pg').required(),
  totalUnits: Joi.number().integer().min(1).required(),
  availableUnits: Joi.number().integer().min(0),
  amenities: Joi.array().items(Joi.string().trim()),
  images: Joi.array().items(
    Joi.object({ url: Joi.string(), caption: Joi.string().allow(''), isPrimary: Joi.boolean() })
  ),
});

const propertyUpdate = Joi.object({
  name: Joi.string().trim().max(100),
  description: Joi.string().max(1000).allow(''),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string(),
  }),
  propertyType: Joi.string().valid('apartment', 'house', 'condo', 'studio', 'room', 'commercial', 'villa', 'pg'),
  totalUnits: Joi.number().integer().min(1),
  availableUnits: Joi.number().integer().min(0),
  amenities: Joi.array().items(Joi.string().trim()),
  images: Joi.array().items(
    Joi.object({ url: Joi.string(), caption: Joi.string().allow(''), isPrimary: Joi.boolean() })
  ),
  isActive: Joi.boolean(),
});

// --- Tenant ---
const occupantSchema = Joi.object({
  name: Joi.string().required(),
  relationship: Joi.string().valid('spouse', 'child', 'parent', 'sibling', 'relative', 'roommate', 'other'),
  dateOfBirth: Joi.date().iso().allow(null),
  phone: Joi.string().allow(''),
});

const emergencyContactSchema = Joi.object({
  name: Joi.string().required(),
  relationship: Joi.string().allow(''),
  phone: Joi.string().required(),
  email: Joi.string().email().allow(''),
  isPrimary: Joi.boolean(),
});

const tenantCreate = Joi.object({
  // User info — either existing userId or inline creation
  user: Joi.alternatives()
    .try(
      objectId,
      Joi.object({
        firstName: Joi.string().trim().min(2).max(50).required(),
        lastName: Joi.string().trim().max(50).allow(''),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(128).required(),
        phone: Joi.string().allow(''),
        dateOfBirth: Joi.date().iso().allow(null),
        gender: Joi.string().valid('male', 'female', 'other'),
      })
    )
    .required(),
  property: objectId.required(),
  unit: Joi.string().trim().required(),
  rentType: Joi.string().valid('monthly', 'lease').required(),
  monthlyRent: Joi.number().min(0).required(),
  leaseDetails: Joi.when('rentType', {
    is: 'lease',
    then: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
      securityDeposit: Joi.number().min(0).default(0),
      leaseType: Joi.string().valid('fixed', 'month-to-month', 'yearly'),
    }).required(),
    otherwise: Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      securityDeposit: Joi.number().min(0),
      leaseType: Joi.string().valid('fixed', 'month-to-month', 'yearly'),
    }).allow(null),
  }),
  occupantCount: Joi.number().integer().min(1).default(1),
  occupants: Joi.array().items(occupantSchema),
  emergencyContacts: Joi.array().items(emergencyContactSchema),
  preferences: Joi.object({
    notifications: Joi.object({
      email: Joi.boolean(),
      sms: Joi.boolean(),
      push: Joi.boolean(),
    }),
    paymentMethod: Joi.string().valid('cash', 'check', 'bank_transfer', 'online', 'other'),
  }),
  status: Joi.string().valid('active', 'inactive', 'pending'),
  moveInDate: Joi.date().iso(),
  notes: Joi.string().max(500).allow(''),
});

const tenantUpdate = Joi.object({
  unit: Joi.string().trim(),
  rentType: Joi.string().valid('monthly', 'lease'),
  monthlyRent: Joi.number().min(0),
  leaseDetails: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    securityDeposit: Joi.number().min(0),
    leaseType: Joi.string().valid('fixed', 'month-to-month', 'yearly'),
  }).allow(null),
  occupantCount: Joi.number().integer().min(1),
  occupants: Joi.array().items(occupantSchema),
  emergencyContacts: Joi.array().items(emergencyContactSchema),
  preferences: Joi.object({
    notifications: Joi.object({
      email: Joi.boolean(),
      sms: Joi.boolean(),
      push: Joi.boolean(),
    }),
    paymentMethod: Joi.string().valid('cash', 'check', 'bank_transfer', 'online', 'other'),
  }),
  status: Joi.string().valid('active', 'inactive', 'terminated', 'pending'),
  moveInDate: Joi.date().iso(),
  moveOutDate: Joi.date().iso(),
  // Allow updating user fields
  firstName: Joi.string().trim().min(2).max(50),
  lastName: Joi.string().trim().max(50).allow(''),
  phone: Joi.string().allow(''),
  dateOfBirth: Joi.date().iso().allow(null),
  gender: Joi.string().valid('male', 'female', 'other'),
  bio: Joi.string().max(500).allow(''),
});

// --- Bill ---
const billCreate = Joi.object({
  tenant: objectId.required(),
  billingPeriod: Joi.object({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).required(),
  }).required(),
  charges: Joi.object({
    rent: Joi.number().min(0).required(),
    utilities: Joi.object({
      water: Joi.number().min(0).default(0),
      electricity: Joi.number().min(0).default(0),
      gas: Joi.number().min(0).default(0),
      internet: Joi.number().min(0).default(0),
      trash: Joi.number().min(0).default(0),
      other: Joi.object({ amount: Joi.number().min(0), description: Joi.string() }),
    }),
    maintenance: Joi.number().min(0).default(0),
    parking: Joi.number().min(0).default(0),
    petFee: Joi.number().min(0).default(0),
    lateFee: Joi.number().min(0).default(0),
    additionalCharges: Joi.array().items(
      Joi.object({ description: Joi.string().required(), amount: Joi.number().min(0).required() })
    ),
  }).required(),
  credits: Joi.object({
    securityDepositRefund: Joi.number().min(0),
    prorationCredit: Joi.number().min(0),
    otherCredits: Joi.array().items(Joi.object({ description: Joi.string(), amount: Joi.number().min(0) })),
  }),
  previousBalance: Joi.number().default(0),
  dueDate: Joi.date().iso().required(),
  notes: Joi.string().max(500).allow(''),
});

const billUpdate = Joi.object({
  charges: Joi.object({
    rent: Joi.number().min(0),
    utilities: Joi.object({
      water: Joi.number().min(0),
      electricity: Joi.number().min(0),
      gas: Joi.number().min(0),
      internet: Joi.number().min(0),
      trash: Joi.number().min(0),
      other: Joi.object({ amount: Joi.number().min(0), description: Joi.string() }),
    }),
    maintenance: Joi.number().min(0),
    parking: Joi.number().min(0),
    petFee: Joi.number().min(0),
    lateFee: Joi.number().min(0),
    additionalCharges: Joi.array().items(
      Joi.object({ description: Joi.string().required(), amount: Joi.number().min(0).required() })
    ),
  }),
  credits: Joi.object({
    securityDepositRefund: Joi.number().min(0),
    prorationCredit: Joi.number().min(0),
    otherCredits: Joi.array().items(Joi.object({ description: Joi.string(), amount: Joi.number().min(0) })),
  }),
  previousBalance: Joi.number(),
  dueDate: Joi.date().iso(),
  status: Joi.string().valid('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'),
  notes: Joi.string().max(500).allow(''),
  paidAmount: Joi.number().min(0),
  paymentMethod: Joi.string().valid('cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'online', 'razorpay', 'other'),
});

// --- Payment ---
const paymentCreate = Joi.object({
  bill: objectId.required(),
  amount: Joi.number().min(0.01).required(),
  paymentDate: Joi.date().iso().default(() => new Date()),
  paymentMethod: Joi.string().valid('cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'online', 'razorpay', 'other').required(),
  transactionId: Joi.string().allow(''),
  razorpayOrderId: Joi.string().allow(''),
  razorpayPaymentId: Joi.string().allow(''),
  razorpaySignature: Joi.string().allow(''),
  checkNumber: Joi.string().allow(''),
  bankDetails: Joi.object({
    bankName: Joi.string(),
    accountLast4: Joi.string().max(4),
  }),
  notes: Joi.string().max(500).allow(''),
});

const paymentUpdate = Joi.object({
  status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled'),
  notes: Joi.string().max(500).allow(''),
});

module.exports = {
  pagination,
  userRegister,
  userLogin,
  userUpdate,
  changePassword,
  forgotPassword,
  resetPassword,
  propertyCreate,
  propertyUpdate,
  tenantCreate,
  tenantUpdate,
  billCreate,
  billUpdate,
  paymentCreate,
  paymentUpdate,
};
