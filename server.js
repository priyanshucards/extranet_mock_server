const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// ── Response Catalog ────────────────────────────────────────────────
const RESPONSES = {
  "auth/register": {
    success: {
      status: 201,
      body: {
        success: true,
        message: "OTP sent to your email for verification.",
        data: {
          otp_request_id: "otpreq_7f3a2b1c9d8e",
          email: "admin@hotelname.com",
          otp_expires_at: "__OTP_EXPIRES__",
        },
      },
    },
    EMAIL_ALREADY_EXISTS: {
      status: 409,
      body: {
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists.",
        },
      },
    },
    INVALID_EMAIL_FORMAT: {
      status: 422,
      body: {
        success: false,
        error: { code: "INVALID_EMAIL_FORMAT", message: "Must be a valid email address." },
      },
    },
    WEAK_PASSWORD: {
      status: 422,
      body: {
        success: false,
        error: { code: "WEAK_PASSWORD", message: "Password doesn't meet policy. Must be at least 8 characters with uppercase, lowercase, number and special character." },
      },
    },
    VALIDATION_ERROR: {
      status: 422,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          details: { email: "Must be a valid email address.", password: "Must be at least 8 characters." },
        },
      },
    },
    TOO_MANY_REQUESTS: {
      status: 429,
      body: {
        success: false,
        error: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." },
      },
    },
  },

  "auth/verify-otp": {
    // "success" = smart mode: validates OTP (123456) and reads context from request body
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — response depends on OTP + context sent in request." },
    },
    // Force specific errors from the control panel regardless of OTP
    OTP_EXPIRED: {
      status: 400,
      body: { success: false, error: { code: "OTP_EXPIRED", message: "This OTP has expired. Please request a new one." } },
    },
    OTP_ALREADY_USED: {
      status: 400,
      body: { success: false, error: { code: "OTP_ALREADY_USED", message: "This OTP has already been used." } },
    },
    INVALID_OTP_REQUEST_ID: {
      status: 400,
      body: { success: false, error: { code: "INVALID_OTP_REQUEST_ID", message: "Invalid or mismatched OTP request." } },
    },
    EMAIL_NOT_FOUND: {
      status: 404,
      body: { success: false, error: { code: "EMAIL_NOT_FOUND", message: "No pending registration found for this email." } },
    },
    TOO_MANY_ATTEMPTS: {
      status: 429,
      body: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Too many incorrect attempts. Please try again later." } },
    },
  },

  "auth/resend-otp": {
    success: {
      status: 200,
      body: {
        success: true,
        message: "A new OTP has been sent to your email.",
        data: {
          otp_request_id: "otpreq_resend_new",
          otp_expires_at: "__OTP_EXPIRES__",
          resend_allowed_after: "__RESEND_AFTER__",
        },
      },
    },
    RESEND_COOLDOWN: {
      status: 429,
      body: { success: false, error: { code: "RESEND_COOLDOWN", message: "Please wait before requesting another OTP." } },
    },
    MAX_RESEND_LIMIT: {
      status: 429,
      body: { success: false, error: { code: "MAX_RESEND_LIMIT", message: "Maximum resend attempts exceeded." } },
    },
    EMAIL_NOT_FOUND: {
      status: 404,
      body: { success: false, error: { code: "EMAIL_NOT_FOUND", message: "No pending session found for this email." } },
    },
  },

  "auth/login": {
    success: {
      status: 200,
      body: {
        success: true,
        message: "Password verified. OTP sent to your email.",
        data: {
          otp_request_id: "otpreq_4c3b2a1d9e8f",
          email: "admin@hotelname.com",
          otp_expires_at: "__OTP_EXPIRES__",
        },
      },
    },
    INVALID_CREDENTIALS: {
      status: 401,
      body: { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } },
    },
    EMAIL_NOT_VERIFIED: {
      status: 403,
      body: { success: false, error: { code: "EMAIL_NOT_VERIFIED", message: "Please verify your email before logging in." } },
    },
    ACCOUNT_DISABLED: {
      status: 403,
      body: { success: false, error: { code: "ACCOUNT_DISABLED", message: "Your account has been suspended. Contact support." } },
    },
    ACCOUNT_NOT_FOUND: {
      status: 404,
      body: { success: false, error: { code: "ACCOUNT_NOT_FOUND", message: "No account found with this email." } },
    },
    TOO_MANY_ATTEMPTS: {
      status: 429,
      body: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Account temporarily locked due to too many failed attempts." } },
    },
  },

  "auth/token/refresh": {
    success: {
      status: 200,
      body: {
        success: true,
        data: {
          access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_refreshed_access_token",
          access_token_expires_at: "__ACCESS_EXPIRES__",
        },
      },
    },
    INVALID_REFRESH_TOKEN: {
      status: 401,
      body: { success: false, error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token is invalid or tampered." } },
    },
    REFRESH_TOKEN_EXPIRED: {
      status: 401,
      body: { success: false, error: { code: "REFRESH_TOKEN_EXPIRED", message: "Refresh token has expired. Please log in again." } },
    },
    REFRESH_TOKEN_REVOKED: {
      status: 401,
      body: { success: false, error: { code: "REFRESH_TOKEN_REVOKED", message: "Refresh token has been revoked." } },
    },
  },

  "auth/logout": {
    success: {
      status: 200,
      body: { success: true, message: "Logged out successfully." },
    },
  },

  "auth/password/reset-request": {
    success: {
      status: 200,
      body: {
        success: true,
        message: "If this email is registered, an OTP has been sent.",
        data: {
          otp_request_id: "otpreq_9a8b7c6d5e4f",
          otp_expires_at: "__OTP_EXPIRES__",
          resend_allowed_after: "__RESEND_AFTER__",
        },
      },
    },
    INVALID_EMAIL_FORMAT: {
      status: 422,
      body: { success: false, error: { code: "INVALID_EMAIL_FORMAT", message: "Must be a valid email address." } },
    },
    TOO_MANY_REQUESTS: {
      status: 429,
      body: { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." } },
    },
  },

  "auth/password/reset": {
    success: {
      status: 200,
      body: { success: true, message: "Password reset successfully. Please log in with your new password." },
    },
    INVALID_OTP_REQUEST_ID: {
      status: 400,
      body: { success: false, error: { code: "INVALID_OTP_REQUEST_ID", message: "Invalid or mismatched OTP request." } },
    },
    INVALID_VERIFICATION_TOKEN: {
      status: 400,
      body: { success: false, error: { code: "INVALID_VERIFICATION_TOKEN", message: "Verification token is invalid or tampered." } },
    },
    VERIFICATION_TOKEN_EXPIRED: {
      status: 400,
      body: { success: false, error: { code: "VERIFICATION_TOKEN_EXPIRED", message: "Verification token has expired (10 min window)." } },
    },
    VERIFICATION_TOKEN_ALREADY_USED: {
      status: 400,
      body: { success: false, error: { code: "VERIFICATION_TOKEN_ALREADY_USED", message: "This reset has already been completed." } },
    },
    WEAK_PASSWORD: {
      status: 422,
      body: { success: false, error: { code: "WEAK_PASSWORD", message: "Password doesn't meet policy requirements." } },
    },
    SAME_AS_OLD_PASSWORD: {
      status: 422,
      body: { success: false, error: { code: "SAME_AS_OLD_PASSWORD", message: "New password cannot be the same as the current password." } },
    },
  },

  "properties/hotel-search": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — returns filtered/paginated property list." },
    },
    UNAUTHORIZED: {
      status: 401,
      body: { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } },
    },
    NO_PROPERTIES_WHITELISTED: {
      status: 404,
      body: { success: false, error: { code: "NO_PROPERTIES_WHITELISTED", message: "No properties are whitelisted for your account. Please contact support." } },
    },
    UPSTREAM_FETCH_FAILED: {
      status: 502,
      body: { success: false, error: { code: "UPSTREAM_FETCH_FAILED", message: "Unable to fetch property data at the moment. Please try again.", details: { retry_after: 30 } } },
    },
  },

  "properties/preview": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — returns property detail by hotel_id." },
    },
    UNAUTHORIZED: {
      status: 401,
      body: { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } },
    },
    PROPERTY_NOT_WHITELISTED: {
      status: 403,
      body: { success: false, error: { code: "PROPERTY_NOT_WHITELISTED", message: "You do not have access to this property." } },
    },
    PROPERTY_NOT_FOUND: {
      status: 404,
      body: { success: false, error: { code: "PROPERTY_NOT_FOUND", message: "The requested property was not found." } },
    },
    UPSTREAM_FETCH_FAILED: {
      status: 502,
      body: { success: false, error: { code: "UPSTREAM_FETCH_FAILED", message: "Unable to fetch property data at the moment. Please try again.", details: { retry_after: 30 } } },
    },
  },

  // ── Property Info Step ─────────────────────────────────────────────

  "property-info/prefetch": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — returns onboarding state." },
    },
    ONBOARDING_ACCESS_DENIED: {
      status: 403,
      body: { success: false, error: { code: "ONBOARDING_ACCESS_DENIED", message: "This onboarding does not belong to your account." } },
    },
    ONBOARDING_NOT_FOUND: {
      status: 404,
      body: { success: false, error: { code: "ONBOARDING_NOT_FOUND", message: "Invalid onboarding ID." } },
    },
  },

  "property-info/basic-info": {
    success: {
      status: 200,
      body: { success: true, message: "Basic info saved.", data: { section: "basic_info", status: "completed", next_section: "images" } },
    },
    VALIDATION_ERROR: {
      status: 422,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed.",
          details: {
            property_name: "Property name is required.",
            star_rating: "Star rating must be between 1 and 5.",
            "contact.email": "Email must be verified before proceeding.",
            "contact.phone": "Phone must be verified before proceeding.",
          },
        },
      },
    },
  },

  "property-info/send-otp": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — OTP sent." },
    },
    INVALID_EMAIL_FORMAT: {
      status: 422,
      body: { success: false, error: { code: "INVALID_EMAIL_FORMAT", message: "Must be a valid email address." } },
    },
    INVALID_PHONE_FORMAT: {
      status: 422,
      body: { success: false, error: { code: "INVALID_PHONE_FORMAT", message: "Must be a valid phone number with country code." } },
    },
    RESEND_COOLDOWN: {
      status: 429,
      body: { success: false, error: { code: "RESEND_COOLDOWN", message: "Please wait before requesting another OTP." } },
    },
    MAX_RESEND_LIMIT: {
      status: 429,
      body: { success: false, error: { code: "MAX_RESEND_LIMIT", message: "Maximum OTP resend attempts exceeded." } },
    },
  },

  "property-info/verify-otp": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — verifies OTP (123456)." },
    },
    INVALID_OTP: {
      status: 400,
      body: { success: false, error: { code: "INVALID_OTP", message: "The OTP you entered is incorrect." } },
    },
    OTP_EXPIRED: {
      status: 400,
      body: { success: false, error: { code: "OTP_EXPIRED", message: "This OTP has expired. Please request a new one." } },
    },
    OTP_ALREADY_USED: {
      status: 400,
      body: { success: false, error: { code: "OTP_ALREADY_USED", message: "This OTP has already been used." } },
    },
    TOO_MANY_ATTEMPTS: {
      status: 429,
      body: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Too many incorrect attempts. Please try again later." } },
    },
  },

  "property-info/images/upload-url": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — returns pre-signed S3 URL." },
    },
    INVALID_FILE_TYPE: {
      status: 422,
      body: { success: false, error: { code: "INVALID_FILE_TYPE", message: "Only JPEG, PNG, and WebP images are accepted." } },
    },
    FILE_TOO_LARGE: {
      status: 422,
      body: { success: false, error: { code: "FILE_TOO_LARGE", message: "File exceeds maximum allowed size of 10 MB." } },
    },
    UPLOAD_LIMIT_REACHED: {
      status: 429,
      body: { success: false, error: { code: "UPLOAD_LIMIT_REACHED", message: "Maximum image upload count reached for this property." } },
    },
  },

  "property-info/images/check-duplicate": {
    success: {
      status: 200,
      body: { success: true, data: { is_duplicate: false } },
    },
    DUPLICATE_FOUND: {
      status: 200,
      body: {
        success: true,
        data: {
          is_duplicate: true,
          duplicate_of: { image_id: "img_001", url: "https://cdn.scapia.com/hotels/MMT_HTL_001234/img_001.jpg", tag: "exterior" },
        },
      },
    },
  },

  "property-info/images/confirm": {
    success: {
      status: 201,
      body: { success: true, message: "Smart mode — confirms uploaded image." },
    },
    UPLOAD_URL_EXPIRED: {
      status: 400,
      body: { success: false, error: { code: "UPLOAD_URL_EXPIRED", message: "The S3 upload URL has expired. Please request a new one." } },
    },
    IMAGE_NOT_UPLOADED: {
      status: 400,
      body: { success: false, error: { code: "IMAGE_NOT_UPLOADED", message: "Image was not found in S3. Upload before confirming." } },
    },
    IMAGE_ALREADY_CONFIRMED: {
      status: 409,
      body: { success: false, error: { code: "IMAGE_ALREADY_CONFIRMED", message: "This image has already been confirmed." } },
    },
  },

  "property-info/images/update": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — updates images." },
    },
    HERO_IMAGE_DELETED: {
      status: 400,
      body: { success: false, error: { code: "HERO_IMAGE_DELETED", message: "Cannot delete the hero image. Set another image as hero first." } },
    },
    MULTIPLE_HERO_FLAGS: {
      status: 400,
      body: { success: false, error: { code: "MULTIPLE_HERO_FLAGS", message: "Only one image can be marked as hero." } },
    },
    DUPLICATE_ORDER_VALUES: {
      status: 400,
      body: { success: false, error: { code: "DUPLICATE_ORDER_VALUES", message: "Two or more images have the same order value." } },
    },
    IMAGE_NOT_FOUND: {
      status: 404,
      body: { success: false, error: { code: "IMAGE_NOT_FOUND", message: "One or more image IDs do not belong to this onboarding." } },
    },
  },

  "property-info/amenities/master": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — returns amenities master list." },
    },
    ONBOARDING_ACCESS_DENIED: {
      status: 403,
      body: { success: false, error: { code: "ONBOARDING_ACCESS_DENIED", message: "This onboarding does not belong to your account." } },
    },
  },

  // ── Rooms Step ─────────────────────────────────────────────────────

  "rooms/add": {
    success: {
      status: 201,
      body: { success: true, message: "Smart mode — creates room from request body." },
    },
    VALIDATION_ERROR: {
      status: 422,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed.",
          details: { room_name: "Room name is required.", "occupancy.max_occupancy": "Max occupancy cannot be less than max adults." },
        },
      },
    },
    DUPLICATE_ROOM_NAME: {
      status: 409,
      body: { success: false, error: { code: "DUPLICATE_ROOM_NAME", message: "A room with this name already exists." } },
    },
  },

  "rooms/detail": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — returns room detail." },
    },
    ROOM_NOT_FOUND: {
      status: 404,
      body: { success: false, error: { code: "ROOM_NOT_FOUND", message: "Room not found." } },
    },
  },

  "rooms/update": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — updates room fields." },
    },
    VALIDATION_ERROR: {
      status: 422,
      body: { success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed.", details: {} } },
    },
    ROOM_NOT_FOUND: {
      status: 404,
      body: { success: false, error: { code: "ROOM_NOT_FOUND", message: "Room not found." } },
    },
  },

  "rooms/delete": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — deletes room." },
    },
    ROOM_NOT_FOUND: {
      status: 404,
      body: { success: false, error: { code: "ROOM_NOT_FOUND", message: "Room not found." } },
    },
    CANNOT_DELETE_LAST_ROOM: {
      status: 400,
      body: { success: false, error: { code: "CANNOT_DELETE_LAST_ROOM", message: "At least one room must exist." } },
    },
  },

  "rooms/submit": {
    success: {
      status: 200,
      body: { success: true, message: "Smart mode — submits rooms step." },
    },
    NO_ROOMS_ADDED: {
      status: 400,
      body: { success: false, error: { code: "NO_ROOMS_ADDED", message: "You must add at least one room before continuing." } },
    },
    UNVERIFIED_ROOMS_EXIST: {
      status: 400,
      body: { success: false, error: { code: "UNVERIFIED_ROOMS_EXIST", message: "All rooms must be verified before submitting." } },
    },
  },

};

// ── State ───────────────────────────────────────────────────────────
const activeResponses = {};
for (const endpoint of Object.keys(RESPONSES)) {
  // Pick the first key as default (which is a success variant)
  activeResponses[endpoint] = Object.keys(RESPONSES[endpoint])[0];
}
let responseDelay = 300;
const requestLog = [];

// ── Request logger middleware (BEFORE routes) ───────────────────────
const BASE = "/api/onboarding";
app.use(BASE, (req, _res, next) => {
  requestLog.unshift({
    time: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    body: req.body,
  });
  if (requestLog.length > 50) requestLog.pop();
  next();
});

// ── Timestamp replacer ─────────────────────────────────────────────
function freshTimestamps(obj) {
  const str = JSON.stringify(obj);
  const now = Date.now();
  return JSON.parse(
    str
      .replace(/"__OTP_EXPIRES__"/g, JSON.stringify(new Date(now + 5 * 60000).toISOString()))
      .replace(/"__ACCESS_EXPIRES__"/g, JSON.stringify(new Date(now + 60 * 60000).toISOString()))
      .replace(/"__VERIFICATION_EXPIRES__"/g, JSON.stringify(new Date(now + 10 * 60000).toISOString()))
      .replace(/"__RESEND_AFTER__"/g, JSON.stringify(new Date(now + 90000).toISOString()))
  );
}

// ── Magic OTP for testing ────────────────────────────────────────────
const VALID_OTP = "123456";
const OTP_TTL_MS = 5 * 60 * 1000;
const propertyInfoOtpSessions = new Map();

// ── Smart registration responses ────────────────────────────────────
const REGISTER_SUCCESS = {
  status: 201,
  body: {
    success: true,
    message: "OTP sent to your email for verification.",
    data: {
      otp_request_id: "otpreq_7f3a2b1c9d8e",
      email: "admin@hotelname.com",
      otp_expires_at: "__OTP_EXPIRES__",
    },
  },
};

const REGISTER_ERRORS = {
  INVALID_EMAIL: {
    status: 422,
    body: { success: false, error: { code: "INVALID_EMAIL_FORMAT", message: "Must be a valid email address." } },
  },
  WEAK_PASSWORD: {
    status: 422,
    body: {
      success: false,
      error: {
        code: "WEAK_PASSWORD",
        message: "Password must be at least 8 characters with uppercase, lowercase, number and special character.",
      },
    },
  },
  MISSING_FIELDS: {
    status: 422,
    body: {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: {},
      },
    },
  },
};

// ── OTP verification responses (not in dropdown — driven by request) ─
const OTP_VERIFY_RESPONSES = {
  "registration": {
    status: 200,
    body: {
      success: true,
      message: "Email verified and account activated successfully.",
      data: {
        access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_access_token",
        refresh_token: "mock_refresh_token_dGhpcyBpcyBhIHJlZnJlc2g",
        access_token_expires_at: "__ACCESS_EXPIRES__",
        user: { id: "usr_9f8e7d6c5b4a", email: "admin@hotelname.com" },
      },
    },
  },
  "login": {
    status: 200,
    body: {
      success: true,
      message: "Login successful.",
      data: {
        access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_access_token",
        refresh_token: "mock_refresh_token_dGhpcyBpcyBhIHJlZnJlc2g",
        access_token_expires_at: "__ACCESS_EXPIRES__",
        user: { id: "usr_9f8e7d6c5b4a", email: "admin@hotelname.com" },
      },
    },
  },
  "reset_password": {
    status: 200,
    body: {
      success: true,
      message: "OTP verified. You may now reset your password.",
      data: {
        email: "admin@hotelname.com",
        verification_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_reset_verification_token",
        verification_token_expires_at: "__VERIFICATION_EXPIRES__",
      },
    },
  },
};

const OTP_ERROR_RESPONSES = {
  INVALID_OTP: { status: 400, body: { success: false, error: { code: "INVALID_OTP", message: "The OTP you entered is incorrect." } } },
  MISSING_FIELDS: { status: 400, body: { success: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields: otp_request_id, otp, and context are required." } } },
  INVALID_CONTEXT: { status: 400, body: { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid context. Must be one of: registration, login, reset_password." } } },
};

// ── Mock property data ──────────────────────────────────────────────
const MOCK_PROPERTIES = [
  // ── Bengaluru ──
  {
    hotel_id: "MMT_HTL_001234",
    name: "The Grand Leela Palace",
    chain_name: "The Leela Group",
    star_rating: 5,
    location: { city: "Bengaluru", state: "Karnataka", country: "India", address: "23, Old Airport Road, Kodihalli, Bengaluru - 560008" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_001234/thumb.jpg"],
    onboarding_status: "not_started",
  },
  {
    hotel_id: "MMT_HTL_005678",
    name: "Taj MG Road",
    chain_name: "Taj Hotels",
    star_rating: 5,
    location: { city: "Bengaluru", state: "Karnataka", country: "India", address: "41/3, MG Road, Bengaluru - 560001" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_005678/thumb.jpg"],
    onboarding_status: "in_progress",
  },
  {
    hotel_id: "MMT_HTL_009012",
    name: "Radisson Blu Atria",
    chain_name: "Radisson Hotel Group",
    star_rating: 4,
    location: { city: "Bengaluru", state: "Karnataka", country: "India", address: "1, Palace Road, Bengaluru - 560001" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_009012/thumb.jpg"],
    onboarding_status: "completed",
  },
  {
    hotel_id: "MMT_HTL_001500",
    name: "ITC Windsor",
    chain_name: "ITC Hotels",
    star_rating: 5,
    location: { city: "Bengaluru", state: "Karnataka", country: "India", address: "25, Windsor Square, Golf Course Road, Bengaluru - 560052" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_001500/thumb.jpg"],
    onboarding_status: "not_started",
  },
  {
    hotel_id: "MMT_HTL_001600",
    name: "Shangri-La Bengaluru",
    chain_name: "Shangri-La Hotels",
    star_rating: 5,
    location: { city: "Bengaluru", state: "Karnataka", country: "India", address: "56/6B, Palace Road, Bengaluru - 560052" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_001600/thumb.jpg"],
    onboarding_status: "completed",
  },
  // ── Mumbai ──
  {
    hotel_id: "MMT_HTL_002001",
    name: "The Taj Mahal Palace",
    chain_name: "Taj Hotels",
    star_rating: 5,
    location: { city: "Mumbai", state: "Maharashtra", country: "India", address: "Apollo Bunder, Colaba, Mumbai - 400001" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_002001/thumb.jpg"],
    onboarding_status: "not_started",
  },
  {
    hotel_id: "MMT_HTL_002002",
    name: "JW Marriott Mumbai Juhu",
    chain_name: "Marriott International",
    star_rating: 5,
    location: { city: "Mumbai", state: "Maharashtra", country: "India", address: "Juhu Tara Road, Juhu, Mumbai - 400049" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_002002/thumb.jpg"],
    onboarding_status: "in_progress",
  },
  {
    hotel_id: "MMT_HTL_002003",
    name: "The Oberoi Mumbai",
    chain_name: "Oberoi Hotels",
    star_rating: 5,
    location: { city: "Mumbai", state: "Maharashtra", country: "India", address: "Nariman Point, Mumbai - 400021" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_002003/thumb.jpg"],
    onboarding_status: "not_started",
  },
  {
    hotel_id: "MMT_HTL_002004",
    name: "Trident Nariman Point",
    chain_name: "Oberoi Hotels",
    star_rating: 5,
    location: { city: "Mumbai", state: "Maharashtra", country: "India", address: "Nariman Point, Mumbai - 400021" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_002004/thumb.jpg"],
    onboarding_status: "completed",
  },
  // ── Delhi / NCR ──
  {
    hotel_id: "MMT_HTL_003001",
    name: "The Leela Palace New Delhi",
    chain_name: "The Leela Group",
    star_rating: 5,
    location: { city: "New Delhi", state: "Delhi", country: "India", address: "Diplomatic Enclave, Chanakyapuri, New Delhi - 110023" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_003001/thumb.jpg"],
    onboarding_status: "not_started",
  },
  {
    hotel_id: "MMT_HTL_003002",
    name: "ITC Maurya",
    chain_name: "ITC Hotels",
    star_rating: 5,
    location: { city: "New Delhi", state: "Delhi", country: "India", address: "Sardar Patel Marg, Diplomatic Enclave, New Delhi - 110021" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_003002/thumb.jpg"],
    onboarding_status: "in_progress",
  },
  {
    hotel_id: "MMT_HTL_003003",
    name: "Hyatt Regency Delhi",
    chain_name: "Hyatt Hotels",
    star_rating: 5,
    location: { city: "New Delhi", state: "Delhi", country: "India", address: "Bhikaiji Cama Place, Ring Road, New Delhi - 110066" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_003003/thumb.jpg"],
    onboarding_status: "not_started",
  },
  // ── Jaipur ──
  {
    hotel_id: "MMT_HTL_004001",
    name: "Rambagh Palace",
    chain_name: "Taj Hotels",
    star_rating: 5,
    location: { city: "Jaipur", state: "Rajasthan", country: "India", address: "Bhawani Singh Road, Jaipur - 302005" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_004001/thumb.jpg"],
    onboarding_status: "not_started",
  },
  {
    hotel_id: "MMT_HTL_004002",
    name: "ITC Rajputana",
    chain_name: "ITC Hotels",
    star_rating: 5,
    location: { city: "Jaipur", state: "Rajasthan", country: "India", address: "Palace Road, Jaipur - 302006" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_004002/thumb.jpg"],
    onboarding_status: "completed",
  },
  // ── Goa ──
  {
    hotel_id: "MMT_HTL_005001",
    name: "Taj Fort Aguada Resort & Spa",
    chain_name: "Taj Hotels",
    star_rating: 5,
    location: { city: "Candolim", state: "Goa", country: "India", address: "Sinquerim, Bardez, Candolim, Goa - 403515" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_005001/thumb.jpg"],
    onboarding_status: "not_started",
  },
  {
    hotel_id: "MMT_HTL_005002",
    name: "W Goa",
    chain_name: "Marriott International",
    star_rating: 5,
    location: { city: "Vagator", state: "Goa", country: "India", address: "Vagator Beach, Bardez, Goa - 403509" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_005002/thumb.jpg"],
    onboarding_status: "in_progress",
  },
  // ── Udaipur ──
  {
    hotel_id: "MMT_HTL_006001",
    name: "Taj Lake Palace",
    chain_name: "Taj Hotels",
    star_rating: 5,
    location: { city: "Udaipur", state: "Rajasthan", country: "India", address: "Pichola Lake, Udaipur - 313001" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_006001/thumb.jpg"],
    onboarding_status: "not_started",
  },
  {
    hotel_id: "MMT_HTL_006002",
    name: "The Oberoi Udaivilas",
    chain_name: "Oberoi Hotels",
    star_rating: 5,
    location: { city: "Udaipur", state: "Rajasthan", country: "India", address: "Haridasji Ki Magri, Udaipur - 313001" },
    images: ["https://cdn.scapia.com/hotels/MMT_HTL_006002/thumb.jpg"],
    onboarding_status: "not_started",
  },
];

const MOCK_PROPERTY_DETAILS = {
  "MMT_HTL_001234": {
    hotel_id: "MMT_HTL_001234",
    name: "The Grand Leela Palace",
    chain_name: "The Leela Group",
    star_rating: 5,
    location: { city: "Bengaluru", state: "Karnataka", country: "India", address: "23, Old Airport Road, Kodihalli, Bengaluru - 560008", latitude: 12.9611, longitude: 77.6478, pincode: "560008" },
    images: [
      { category: "exterior", images: ["https://cdn.scapia.com/hotels/MMT_HTL_001234/ext_001.jpg", "https://cdn.scapia.com/hotels/MMT_HTL_001234/ext_002.jpg"] },
      { category: "lobby", images: ["https://cdn.scapia.com/hotels/MMT_HTL_001234/lob_001.jpg", "https://cdn.scapia.com/hotels/MMT_HTL_001234/lob_002.jpg"] },
      { category: "room", images: ["https://cdn.scapia.com/hotels/MMT_HTL_001234/rm_001.jpg", "https://cdn.scapia.com/hotels/MMT_HTL_001234/rm_002.jpg"] },
      { category: "pool", images: ["https://cdn.scapia.com/hotels/MMT_HTL_001234/pool_001.jpg", "https://cdn.scapia.com/hotels/MMT_HTL_001234/pool_002.jpg"] },
    ],
    amenities: [
      { amenity_id: "AMN_101", label: "Air Conditioning", image_url: "https://cdn.scapia.com/amenities/ac.svg", category: "Comfort", subcategory: "Climate Control", is_selected: true },
      { amenity_id: "AMN_102", label: "Mini Bar", image_url: "https://cdn.scapia.com/amenities/minibar.svg", category: "Food & Beverage", subcategory: "In-Room", is_selected: true },
      { amenity_id: "AMN_103", label: "Free Wi-Fi", image_url: "https://cdn.scapia.com/amenities/wifi.svg", category: "Connectivity", subcategory: "Internet", is_selected: true },
      { amenity_id: "AMN_104", label: "Swimming Pool", image_url: "https://cdn.scapia.com/amenities/pool.svg", category: "Recreation", subcategory: "Outdoor", is_selected: true },
      { amenity_id: "AMN_105", label: "Spa & Wellness", image_url: "https://cdn.scapia.com/amenities/spa.svg", category: "Recreation", subcategory: "Wellness", is_selected: true },
    ],
    rooms: [
      {
        room_id: "rm_001",
        room_name: "Deluxe King Room",
        room_size: { value: 450, unit: "ft" },
        room_view: { id: "RV_001", label: "Pool View" },
        number_of_rooms: 12,
        has_balcony: true,
        smoking_allowed: false,
        bathrooms: { count: 1, attached: true },
        bed: { type_id: "BT_001", type_label: "King", count: 1 },
        extra_bed_provided: false,
        occupancy: { base_adults: 2, max_adults: 2, max_children: 1, max_occupancy: 3 },
        images: [
          { url: "https://cdn.scapia.com/hotels/MMT_HTL_001234/rm_001/img_001.jpg", tag: "room", is_hero: true },
          { url: "https://cdn.scapia.com/hotels/MMT_HTL_001234/rm_001/img_002.jpg", tag: "bathroom", is_hero: false },
        ],
        amenities: [
          { amenity_id: "AMN_101", label: "Air Conditioning", image_url: "https://cdn.scapia.com/amenities/ac.svg", category: "Comfort", subcategory: "Climate Control", is_selected: true },
          { amenity_id: "AMN_102", label: "Mini Bar", image_url: "https://cdn.scapia.com/amenities/minibar.svg", category: "Food & Beverage", subcategory: "In-Room", is_selected: true },
        ],
        verification_status: "verified",
      },
      {
        room_id: "rm_002",
        room_name: "Premium Suite",
        room_size: { value: 750, unit: "ft" },
        room_view: { id: "RV_002", label: "City View" },
        number_of_rooms: 6,
        has_balcony: true,
        smoking_allowed: false,
        bathrooms: { count: 2, attached: true },
        bed: { type_id: "BT_001", type_label: "King", count: 1 },
        extra_bed_provided: true,
        occupancy: { base_adults: 2, max_adults: 3, max_children: 2, max_occupancy: 4 },
        images: [
          { url: "https://cdn.scapia.com/hotels/MMT_HTL_001234/rm_002/img_001.jpg", tag: "room", is_hero: true },
          { url: "https://cdn.scapia.com/hotels/MMT_HTL_001234/rm_002/img_002.jpg", tag: "bathroom", is_hero: false },
        ],
        amenities: [
          { amenity_id: "AMN_101", label: "Air Conditioning", image_url: "https://cdn.scapia.com/amenities/ac.svg", category: "Comfort", subcategory: "Climate Control", is_selected: true },
          { amenity_id: "AMN_102", label: "Mini Bar", image_url: "https://cdn.scapia.com/amenities/minibar.svg", category: "Food & Beverage", subcategory: "In-Room", is_selected: true },
          { amenity_id: "AMN_103", label: "Free Wi-Fi", image_url: "https://cdn.scapia.com/amenities/wifi.svg", category: "Connectivity", subcategory: "Internet", is_selected: true },
        ],
        verification_status: "verified",
      },
    ],
  },
  "MMT_HTL_005678": {
    hotel_id: "MMT_HTL_005678",
    name: "Taj MG Road",
    chain_name: "Taj Hotels",
    star_rating: 5,
    location: { city: "Bengaluru", state: "Karnataka", country: "India", address: "41/3, MG Road, Bengaluru - 560001", latitude: 12.9758, longitude: 77.6045, pincode: "560001" },
    images: [
      { category: "exterior", images: ["https://cdn.scapia.com/hotels/MMT_HTL_005678/ext_001.jpg", "https://cdn.scapia.com/hotels/MMT_HTL_005678/ext_002.jpg"] },
      { category: "lobby", images: ["https://cdn.scapia.com/hotels/MMT_HTL_005678/lob_001.jpg"] },
      { category: "room", images: ["https://cdn.scapia.com/hotels/MMT_HTL_005678/rm_001.jpg", "https://cdn.scapia.com/hotels/MMT_HTL_005678/rm_002.jpg"] },
    ],
    amenities: [
      { amenity_id: "AMN_101", label: "Air Conditioning", image_url: "https://cdn.scapia.com/amenities/ac.svg", category: "Comfort", subcategory: "Climate Control", is_selected: true },
      { amenity_id: "AMN_103", label: "Free Wi-Fi", image_url: "https://cdn.scapia.com/amenities/wifi.svg", category: "Connectivity", subcategory: "Internet", is_selected: true },
      { amenity_id: "AMN_106", label: "Restaurant", image_url: "https://cdn.scapia.com/amenities/restaurant.svg", category: "Food & Beverage", subcategory: "Dining", is_selected: true },
      { amenity_id: "AMN_107", label: "Fitness Center", image_url: "https://cdn.scapia.com/amenities/gym.svg", category: "Recreation", subcategory: "Fitness", is_selected: true },
    ],
    rooms: [
      {
        room_id: "rm_001",
        room_name: "Superior Room",
        room_size: { value: 350, unit: "ft" },
        room_view: { id: "RV_003", label: "Garden View" },
        number_of_rooms: 20,
        has_balcony: false,
        smoking_allowed: false,
        bathrooms: { count: 1, attached: true },
        bed: { type_id: "BT_002", type_label: "Queen", count: 1 },
        extra_bed_provided: true,
        occupancy: { base_adults: 2, max_adults: 2, max_children: 1, max_occupancy: 3 },
        images: [
          { url: "https://cdn.scapia.com/hotels/MMT_HTL_005678/rm_001/img_001.jpg", tag: "room", is_hero: true },
          { url: "https://cdn.scapia.com/hotels/MMT_HTL_005678/rm_001/img_002.jpg", tag: "bathroom", is_hero: false },
        ],
        amenities: [
          { amenity_id: "AMN_101", label: "Air Conditioning", image_url: "https://cdn.scapia.com/amenities/ac.svg", category: "Comfort", subcategory: "Climate Control", is_selected: true },
          { amenity_id: "AMN_103", label: "Free Wi-Fi", image_url: "https://cdn.scapia.com/amenities/wifi.svg", category: "Connectivity", subcategory: "Internet", is_selected: true },
        ],
        verification_status: "verified",
      },
    ],
  },
  "MMT_HTL_009012": {
    hotel_id: "MMT_HTL_009012",
    name: "Radisson Blu Atria",
    chain_name: "Radisson Hotel Group",
    star_rating: 4,
    location: { city: "Bengaluru", state: "Karnataka", country: "India", address: "1, Palace Road, Bengaluru - 560001", latitude: 12.9850, longitude: 77.5870, pincode: "560001" },
    images: [
      { category: "exterior", images: ["https://cdn.scapia.com/hotels/MMT_HTL_009012/ext_001.jpg", "https://cdn.scapia.com/hotels/MMT_HTL_009012/ext_002.jpg"] },
      { category: "lobby", images: ["https://cdn.scapia.com/hotels/MMT_HTL_009012/lob_001.jpg"] },
      { category: "room", images: ["https://cdn.scapia.com/hotels/MMT_HTL_009012/rm_001.jpg"] },
    ],
    amenities: [
      { amenity_id: "AMN_101", label: "Air Conditioning", image_url: "https://cdn.scapia.com/amenities/ac.svg", category: "Comfort", subcategory: "Climate Control", is_selected: true },
      { amenity_id: "AMN_103", label: "Free Wi-Fi", image_url: "https://cdn.scapia.com/amenities/wifi.svg", category: "Connectivity", subcategory: "Internet", is_selected: true },
      { amenity_id: "AMN_108", label: "Parking", image_url: "https://cdn.scapia.com/amenities/parking.svg", category: "Convenience", subcategory: "Transport", is_selected: true },
    ],
    rooms: [
      {
        room_id: "rm_001",
        room_name: "Standard Double Room",
        room_size: { value: 300, unit: "ft" },
        room_view: { id: "RV_004", label: "Street View" },
        number_of_rooms: 30,
        has_balcony: false,
        smoking_allowed: false,
        bathrooms: { count: 1, attached: true },
        bed: { type_id: "BT_003", type_label: "Double", count: 2 },
        extra_bed_provided: false,
        occupancy: { base_adults: 2, max_adults: 2, max_children: 1, max_occupancy: 3 },
        images: [
          { url: "https://cdn.scapia.com/hotels/MMT_HTL_009012/rm_001/img_001.jpg", tag: "room", is_hero: true },
        ],
        amenities: [
          { amenity_id: "AMN_101", label: "Air Conditioning", image_url: "https://cdn.scapia.com/amenities/ac.svg", category: "Comfort", subcategory: "Climate Control", is_selected: true },
        ],
        verification_status: "pending",
      },
    ],
  },
};

// ── Property Info — Mock Onboarding State ────────────────────────────
const MOCK_ONBOARDING_STATE = {
  onboarding_step: "property",
  "extranet-id": "onb_mock_001",
  sections: {
    basic_info: {
      data: {
        property_name: "The Grand Leela Palace",
        star_rating: 5,
        property_type: { id: "PT_001", label: "Hotel" },
        chain: { id: "CH_012", label: "The Leela Group" },
        channel_manager: { id: "CM_003", label: "Staah" },
        contact: {
          email: null,
          email_verified: false,
          phone: null,
          phone_verified: false,
        },
      },
    },
    images: {
      data: {
        images: [
          {
            image_id: "img_001",
            url: "https://cdn.scapia.com/hotels/MMT_HTL_001234/img_001.jpg",
            tag: "exterior",
            is_hero: true,
          },
          {
            image_id: "img_002",
            url: "https://cdn.scapia.com/hotels/MMT_HTL_001234/img_002.jpg",
            tag: "lobby",
            is_hero: false,
          },
          {
            image_id: "img_003",
            url: "https://cdn.scapia.com/hotels/MMT_HTL_001234/img_003.jpg",
            tag: "pool",
            is_hero: false,
          },
        ],
      },
    },
    location: {
      data: {
        latitude: 12.9611,
        longitude: 77.6478,
        address_line1: "23, Old Airport Road",
        address_line2: "Kodihalli",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        pincode: "560008",
      },
    },
    amenities: {
      status: "not_started",
      data: {
        selected_amenity_ids: ["AMN_001", "AMN_005", "AMN_023"],
      },
    },
  },
  presentation_info: {
    enums: {
      property_types: [
        { id: "PT_001", label: "Hotel" },
        { id: "PT_002", label: "Resort" },
        { id: "PT_003", label: "Villa" },
        { id: "PT_004", label: "Homestay" },
        { id: "PT_005", label: "Serviced Apartment" },
      ],
      star_ratings: [1, 2, 3, 4, 5],
      chains: [
        { id: "CH_001", label: "Taj Hotels" },
        { id: "CH_012", label: "The Leela Group" },
        { id: "CH_999", label: "Independent" },
      ],
      channel_managers: [
        { id: "CM_001", label: "RateGain" },
        { id: "CM_002", label: "Siteminder" },
        { id: "CM_003", label: "Staah" },
        { id: "CM_004", label: "None" },
      ],
    },
  },
};

// ── Property Info — Amenities Master List ────────────────────────────
const MOCK_AMENITIES_MASTER = [
  {
    category_id: "CAT_001",
    category_label: "Food & Beverage",
    subcategories: [
      {
        subcategory_id: "SUB_001",
        subcategory_label: "Dining",
        amenities: [
          { amenity_id: "AMN_001", label: "Restaurant", image_url: "https://cdn.scapia.com/amenities/restaurant.svg", is_selected: true },
          { amenity_id: "AMN_002", label: "Bar", image_url: "https://cdn.scapia.com/amenities/bar.svg", is_selected: false },
        ],
      },
      {
        subcategory_id: "SUB_002",
        subcategory_label: "Room Service",
        amenities: [
          { amenity_id: "AMN_003", label: "24hr Room Service", image_url: "https://cdn.scapia.com/amenities/room_service.svg", is_selected: true },
        ],
      },
    ],
  },
  {
    category_id: "CAT_002",
    category_label: "Wellness",
    subcategories: [
      {
        subcategory_id: "SUB_003",
        subcategory_label: "Fitness",
        amenities: [
          { amenity_id: "AMN_004", label: "Gym", image_url: "https://cdn.scapia.com/amenities/gym.svg", is_selected: false },
          { amenity_id: "AMN_005", label: "Yoga Room", image_url: "https://cdn.scapia.com/amenities/yoga.svg", is_selected: true },
        ],
      },
      {
        subcategory_id: "SUB_004",
        subcategory_label: "Spa",
        amenities: [
          { amenity_id: "AMN_006", label: "Full-Service Spa", image_url: "https://cdn.scapia.com/amenities/spa.svg", is_selected: false },
        ],
      },
    ],
  },
  {
    category_id: "CAT_003",
    category_label: "Connectivity",
    subcategories: [
      {
        subcategory_id: "SUB_005",
        subcategory_label: "Internet",
        amenities: [
          { amenity_id: "AMN_007", label: "Free Wi-Fi", image_url: "https://cdn.scapia.com/amenities/wifi.svg", is_selected: true },
          { amenity_id: "AMN_008", label: "Business Center", image_url: "https://cdn.scapia.com/amenities/business_center.svg", is_selected: false },
        ],
      },
    ],
  },
  {
    category_id: "CAT_004",
    category_label: "Recreation",
    subcategories: [
      {
        subcategory_id: "SUB_006",
        subcategory_label: "Outdoor",
        amenities: [
          { amenity_id: "AMN_009", label: "Swimming Pool", image_url: "https://cdn.scapia.com/amenities/pool.svg", is_selected: true },
          { amenity_id: "AMN_010", label: "Garden", image_url: "https://cdn.scapia.com/amenities/garden.svg", is_selected: false },
        ],
      },
      {
        subcategory_id: "SUB_007",
        subcategory_label: "Indoor",
        amenities: [
          { amenity_id: "AMN_011", label: "Game Room", image_url: "https://cdn.scapia.com/amenities/game_room.svg", is_selected: false },
          { amenity_id: "AMN_012", label: "Library", image_url: "https://cdn.scapia.com/amenities/library.svg", is_selected: false },
        ],
      },
    ],
  },
  {
    category_id: "CAT_005",
    category_label: "Convenience",
    subcategories: [
      {
        subcategory_id: "SUB_008",
        subcategory_label: "Transport",
        amenities: [
          { amenity_id: "AMN_013", label: "Parking", image_url: "https://cdn.scapia.com/amenities/parking.svg", is_selected: true },
          { amenity_id: "AMN_014", label: "Airport Shuttle", image_url: "https://cdn.scapia.com/amenities/shuttle.svg", is_selected: false },
        ],
      },
      {
        subcategory_id: "SUB_009",
        subcategory_label: "Services",
        amenities: [
          { amenity_id: "AMN_015", label: "Concierge", image_url: "https://cdn.scapia.com/amenities/concierge.svg", is_selected: true },
          { amenity_id: "AMN_016", label: "Laundry", image_url: "https://cdn.scapia.com/amenities/laundry.svg", is_selected: false },
          { amenity_id: "AMN_017", label: "24hr Front Desk", image_url: "https://cdn.scapia.com/amenities/front_desk.svg", is_selected: true },
        ],
      },
    ],
  },
  {
    category_id: "CAT_006",
    category_label: "Safety",
    subcategories: [
      {
        subcategory_id: "SUB_010",
        subcategory_label: "Security",
        amenities: [
          { amenity_id: "AMN_018", label: "CCTV Surveillance", image_url: "https://cdn.scapia.com/amenities/cctv.svg", is_selected: true },
          { amenity_id: "AMN_019", label: "Fire Extinguisher", image_url: "https://cdn.scapia.com/amenities/fire_ext.svg", is_selected: true },
          { amenity_id: "AMN_020", label: "First Aid Kit", image_url: "https://cdn.scapia.com/amenities/first_aid.svg", is_selected: false },
        ],
      },
    ],
  },
  {
    category_id: "CAT_007",
    category_label: "Accessibility",
    subcategories: [
      {
        subcategory_id: "SUB_011",
        subcategory_label: "Mobility",
        amenities: [
          { amenity_id: "AMN_021", label: "Wheelchair Accessible", image_url: "https://cdn.scapia.com/amenities/wheelchair.svg", is_selected: false },
          { amenity_id: "AMN_022", label: "Elevator", image_url: "https://cdn.scapia.com/amenities/elevator.svg", is_selected: true },
          { amenity_id: "AMN_023", label: "Ramps", image_url: "https://cdn.scapia.com/amenities/ramp.svg", is_selected: true },
        ],
      },
    ],
  },
];

// ── Rooms — Enums & In-Memory Store ──────────────────────────────
const ROOM_ENUMS = {
  room_size_units: ["ft", "m"],
  room_views: [
    { id: "city_view", label: "City View" },
    { id: "garden_view", label: "Garden View" },
    { id: "hill_view", label: "Hill View" },
    { id: "pool_view", label: "Pool View" },
    { id: "sea_view", label: "Sea View" },
    { id: "no_view", label: "No View" },
    { id: "airport_view", label: "Airport View" },
    { id: "beach_view", label: "Beach View" },
    { id: "mountain_view", label: "Mountain View" },
    { id: "lake_view", label: "Lake View" },
    { id: "river_view", label: "River View" },
    { id: "ocean_view", label: "Ocean View" },
    { id: "park_view", label: "Park View" },
  ],
  bed_types: [
    { id: "king_bed", label: "King Bed" },
    { id: "queen_bed", label: "Queen Bed" },
    { id: "twin_bed", label: "Twin Bed" },
    { id: "single_bed", label: "Single Bed" },
    { id: "bunk_bed", label: "Bunk Bed" },
  ],
};

// In-memory rooms store keyed by extranetId
const roomsStore = new Map();

function getRooms(extranetId) {
  if (!roomsStore.has(extranetId)) {
    roomsStore.set(extranetId, []);
  }
  return roomsStore.get(extranetId);
}

function getRoomsSummary(extranetId) {
  const rooms = getRooms(extranetId);
  const verified = rooms.filter(r => r.verification_status === "verified").length;
  return { total: rooms.length, verified, unverified: rooms.length - verified };
}

function resolveViewLabel(viewId) {
  const view = ROOM_ENUMS.room_views.find(v => v.id === viewId);
  return view ? view.label : viewId;
}

function resolveBedTypeLabel(typeId) {
  const bed = ROOM_ENUMS.bed_types.find(b => b.id === typeId);
  return bed ? bed.label : typeId;
}

// ── Auth helper ─────────────────────────────────────────────────────
function requireAuth(req) {
  const auth = req.headers.authorization;
  return auth && auth.startsWith("Bearer ") && auth.length > 10;
}

// ── Mock response sender ────────────────────────────────────────────
function sendMock(endpoint, req, res) {
  const key = activeResponses[endpoint] || Object.keys(RESPONSES[endpoint])[0];
  const mock = RESPONSES[endpoint]?.[key];
  if (!mock) return res.status(500).json({ error: "No mock configured" });

  const body = freshTimestamps(mock.body);

  // Inject email from request if present
  if (req.body.email && body.data?.email) {
    body.data.email = req.body.email;
  }
  if (req.body.email && body.data?.user?.email) {
    body.data.user.email = req.body.email;
  }

  setTimeout(() => res.status(mock.status).json(body), responseDelay);
}

// ── Smart OTP verification handler ──────────────────────────────────
function handleVerifyOtp(req, res) {
  const { otp_request_id, otp, context } = req.body;

  // 1. Check required fields
  if (!otp_request_id || !otp || !context) {
    const r = OTP_ERROR_RESPONSES.MISSING_FIELDS;
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }

  // 2. Validate context
  const validContexts = ["registration", "login", "reset_password"];
  if (!validContexts.includes(context)) {
    const r = OTP_ERROR_RESPONSES.INVALID_CONTEXT;
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }

  // 3. Check if a forced error is selected in the control panel
  const panelKey = activeResponses["auth/verify-otp"];
  const isAuto = !panelKey || panelKey === "success";
  if (!isAuto) {
    const forced = RESPONSES["auth/verify-otp"]?.[panelKey];
    if (forced) {
      return setTimeout(() => res.status(forced.status).json(freshTimestamps(forced.body)), responseDelay);
    }
  }

  // 4. Validate OTP — 123456 is the magic code
  if (otp !== VALID_OTP) {
    const r = OTP_ERROR_RESPONSES.INVALID_OTP;
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }

  // 5. OTP correct → return context-appropriate success
  const successMock = OTP_VERIFY_RESPONSES[context];
  const body = freshTimestamps(successMock.body);

  setTimeout(() => res.status(successMock.status).json(body), responseDelay);
}

// ── Smart registration handler ──────────────────────────────────────
function handleRegister(req, res) {
  const { email, password } = req.body;

  // 1. Check if a forced error is selected in the control panel
  const panelKey = activeResponses["auth/register"];
  const isAuto = !panelKey || panelKey.startsWith("auto");
  if (!isAuto) {
    const forced = RESPONSES["auth/register"]?.[panelKey];
    if (forced) {
      const b = freshTimestamps(forced.body);
      if (email && b.data?.email) b.data.email = email;
      return setTimeout(() => res.status(forced.status).json(b), responseDelay);
    }
  }

  // 2. Check required fields
  if (!email && !password) {
    const r = JSON.parse(JSON.stringify(REGISTER_ERRORS.MISSING_FIELDS));
    r.body.error.details = { email: "Email is required.", password: "Password is required." };
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }
  if (!email) {
    const r = JSON.parse(JSON.stringify(REGISTER_ERRORS.MISSING_FIELDS));
    r.body.error.details = { email: "Email is required." };
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }
  if (!password) {
    const r = JSON.parse(JSON.stringify(REGISTER_ERRORS.MISSING_FIELDS));
    r.body.error.details = { password: "Password is required." };
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }

  // 3. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const r = REGISTER_ERRORS.INVALID_EMAIL;
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }

  // 4. Validate password strength (min 8 chars, upper, lower, number, special)
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLongEnough = password.length >= 8;

  if (!isLongEnough || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    const r = REGISTER_ERRORS.WEAK_PASSWORD;
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }

  // 5. All good → success with OTP sent
  const body = freshTimestamps(REGISTER_SUCCESS.body);
  body.data.email = email;
  // Generate a deterministic otp_request_id from email
  body.data.otp_request_id = "otpreq_" + Buffer.from(email).toString("hex").slice(0, 12);

  setTimeout(() => res.status(REGISTER_SUCCESS.status).json(body), responseDelay);
}

// ── Smart login handler ─────────────────────────────────────────────
function handleLogin(req, res) {
  const { email, password } = req.body;

  // 1. Check if a forced error is selected in the control panel
  const panelKey = activeResponses["auth/login"];
  const isAuto = !panelKey || panelKey.startsWith("auto");
  if (!isAuto) {
    const forced = RESPONSES["auth/login"]?.[panelKey];
    if (forced) {
      return setTimeout(() => res.status(forced.status).json(freshTimestamps(forced.body)), responseDelay);
    }
  }

  // 2. Check required fields
  if (!email || !password) {
    return setTimeout(() => res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Email and password are required." },
    }), responseDelay);
  }

  // 3. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return setTimeout(() => res.status(401).json({
      success: false,
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
    }), responseDelay);
  }

  // 4. Accept any valid-looking email + password combo → send OTP
  const body = freshTimestamps({
    success: true,
    message: "Password verified. OTP sent to your email.",
    data: {
      otp_request_id: "otpreq_" + Buffer.from(email).toString("hex").slice(0, 12),
      email: email,
      otp_expires_at: "__OTP_EXPIRES__",
    },
  });

  setTimeout(() => res.status(200).json(body), responseDelay);
}

// ── Smart property search handler ───────────────────────────────────
function handleHotelSearch(req, res) {
  const panelKey = activeResponses["properties/hotel-search"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["properties/hotel-search"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    const r = RESPONSES["properties/hotel-search"].UNAUTHORIZED;
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }

  const search = (req.query.search || "").toLowerCase();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));

  let filtered = MOCK_PROPERTIES;
  if (search) {
    filtered = MOCK_PROPERTIES.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.location.city.toLowerCase().includes(search) ||
      p.hotel_id.toLowerCase().includes(search)
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const body = {
    success: true,
    data: {
      properties: paged,
      pagination: { total, page, limit, total_pages: totalPages },
      search_query: search || null,
    },
  };

  setTimeout(() => res.status(200).json(body), responseDelay);
}

// ── Smart property preview handler ──────────────────────────────────
function handlePropertyPreview(req, res) {
  const panelKey = activeResponses["properties/preview"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["properties/preview"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    const r = RESPONSES["properties/preview"].UNAUTHORIZED;
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }

  const hotelId = req.params.hotel_id;
  const detail = MOCK_PROPERTY_DETAILS[hotelId];

  if (!detail) {
    const r = RESPONSES["properties/preview"].PROPERTY_NOT_FOUND;
    return setTimeout(() => res.status(r.status).json(r.body), responseDelay);
  }

  setTimeout(() => res.status(200).json({ success: true, data: detail }), responseDelay);
}

// ── Property Info — Prefetch handler ─────────────────────────────────
function handlePropertyInfoPrefetch(req, res) {
  const panelKey = activeResponses["property-info/prefetch"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/prefetch"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const extranetId = req.params.extranet_id;
  const state = JSON.parse(JSON.stringify(MOCK_ONBOARDING_STATE));
  state["extranet-id"] = extranetId;

  // Include rooms data so the rooms step can consume the same endpoint
  state.extranet_id = extranetId;
  state.rooms = getRooms(extranetId);
  state.rooms_summary = getRoomsSummary(extranetId);
  state.presentationInfo = { enums: ROOM_ENUMS };

  setTimeout(() => res.status(200).json({ success: true, data: state }), responseDelay);
}

// ── Property Info — Prefetch by name (no extranet ID) ────────────────
function handlePropertyInfoPrefetchByName(req, res) {
  const panelKey = activeResponses["property-info/prefetch"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/prefetch"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const name = req.query.name;
  if (!name) {
    return setTimeout(() => res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Either extranet ID or name query parameter is required." },
    }), responseDelay);
  }

  const state = {
    onboarding_step: "property",
    "extranet-id": null,
    name: name,
    sections: {
      basic_info: { data: null },
      images: null,
      location: null,
      amenities: null,
    },
    presentation_info: {
      enums: MOCK_ONBOARDING_STATE.presentation_info.enums,
    },
  };

  setTimeout(() => res.status(200).json({ success: true, data: state }), responseDelay);
}

// ── Property Info — Save Basic Info handler ──────────────────────────
function handleBasicInfoSave(req, res) {
  const panelKey = activeResponses["property-info/basic-info"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/basic-info"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const action = req.query.action || "draft";
  const { property_name, star_rating } = req.body;

  if (action === "next") {
    const details = {};
    if (!property_name) details.property_name = "Property name is required.";
    if (!star_rating || star_rating < 1 || star_rating > 5) details.star_rating = "Star rating must be between 1 and 5.";

    if (Object.keys(details).length > 0) {
      return setTimeout(() => res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Validation failed.", details },
      }), responseDelay);
    }
  }

  setTimeout(() => res.status(200).json({
    success: true,
    message: "Basic info saved.",
    data: { section: "basic_info", status: action === "next" ? "completed" : "in_progress", next_section: "images" },
  }), responseDelay);
}

// ── Property Info — Send Contact OTP handler ─────────────────────────
function handlePropertyInfoSendOtp(req, res) {
  const panelKey = activeResponses["property-info/send-otp"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/send-otp"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const { type, value } = req.body;

  if (type === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value || !emailRegex.test(value)) {
      return setTimeout(() => res.status(422).json({
        success: false, error: { code: "INVALID_EMAIL_FORMAT", message: "Must be a valid email address." },
      }), responseDelay);
    }
  } else if (type === "phone") {
    // Keep regex aligned with frontend pre-validation.
    if (!value || !/^\+?\d{10,15}$/.test(value)) {
      return setTimeout(() => res.status(422).json({
        success: false, error: { code: "INVALID_PHONE_FORMAT", message: "Must be a valid phone number with country code." },
      }), responseDelay);
    }
  } else {
    return setTimeout(() => res.status(422).json({
      success: false, error: { code: "VALIDATION_ERROR", message: "type must be either email or phone." },
    }), responseDelay);
  }

  const now = Date.now();
  const otpRequestId = "otpreq_pi_" + Buffer.from(value || "").toString("hex").slice(0, 10);
  propertyInfoOtpSessions.set(otpRequestId, {
    type,
    value,
    otp: VALID_OTP,
    expiresAt: now + OTP_TTL_MS,
  });
  const body = {
    success: true,
    message: `OTP sent to ${value}.`,
    data: {
      type,
      otp_request_id: otpRequestId,
      value,
      otp_expires_at: new Date(now + 5 * 60000).toISOString(),
      resend_allowed_after: new Date(now + 90000).toISOString(),
    },
  };

  setTimeout(() => res.status(200).json(body), responseDelay);
}

// ── Property Info — Verify Contact OTP handler ───────────────────────
function handlePropertyInfoVerifyOtp(req, res) {
  const panelKey = activeResponses["property-info/verify-otp"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/verify-otp"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(freshTimestamps(forced.body)), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const { type, value, otp, otp_request_id } = req.body;
  const normalizedOtp = String(otp ?? "").trim();

  if (!type || !value || !otp_request_id || !normalizedOtp) {
    return setTimeout(() => res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "type, value, otp and otp_request_id are required." },
    }), responseDelay);
  }

  const session = propertyInfoOtpSessions.get(otp_request_id);
  if (!session || session.type !== type || session.value !== value) {
    return setTimeout(() => res.status(400).json({
      success: false,
      error: { code: "INVALID_OTP", message: "The OTP you entered is incorrect." },
    }), responseDelay);
  }

  if (Date.now() > session.expiresAt) {
    propertyInfoOtpSessions.delete(otp_request_id);
    return setTimeout(() => res.status(400).json({
      success: false,
      error: { code: "OTP_EXPIRED", message: "This OTP has expired. Please request a new one." },
    }), responseDelay);
  }

  if (normalizedOtp !== session.otp) {
    return setTimeout(() => res.status(400).json({
      success: false, error: { code: "INVALID_OTP", message: "The OTP you entered is incorrect." },
    }), responseDelay);
  }

  propertyInfoOtpSessions.delete(otp_request_id);

  setTimeout(() => res.status(200).json({
    success: true,
    message: `${type === "email" ? "Email" : "Phone"} verified successfully.`,
    data: { type, value, verified: true },
  }), responseDelay);
}

// ── Property Info — Get S3 Upload URL handler ────────────────────────
function handleImagesUploadUrl(req, res) {
  const panelKey = activeResponses["property-info/images/upload-url"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/images/upload-url"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const { file_name, file_type, file_size_bytes } = req.body;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 10485760;

  if (!allowedTypes.includes(file_type)) {
    return setTimeout(() => res.status(422).json({
      success: false, error: { code: "INVALID_FILE_TYPE", message: "Only JPEG, PNG, and WebP images are accepted." },
    }), responseDelay);
  }

  if (file_size_bytes > maxSize) {
    return setTimeout(() => res.status(422).json({
      success: false, error: { code: "FILE_TOO_LARGE", message: "File exceeds maximum allowed size of 10 MB." },
    }), responseDelay);
  }

  const imageId = "img_tmp_" + Math.random().toString(36).slice(2, 8);
  const extranetId = req.params.extranet_id;

  setTimeout(() => res.status(200).json({
    success: true,
    data: {
      upload_url: `https://s3.amazonaws.com/scapia-hotels/${extranetId}/${imageId}?X-Amz-Signature=mock_signature_${Date.now()}`,
      image_id: imageId,
      expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
      max_file_size_bytes: maxSize,
    },
  }), responseDelay);
}

// ── Property Info — Check Duplicate Image handler ────────────────────
function handleImagesCheckDuplicate(req, res) {
  const panelKey = activeResponses["property-info/images/check-duplicate"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/images/check-duplicate"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  setTimeout(() => res.status(200).json({ success: true, data: { is_duplicate: false } }), responseDelay);
}

// ── Property Info — Confirm Image Upload handler ─────────────────────
function handleImagesConfirm(req, res) {
  const panelKey = activeResponses["property-info/images/confirm"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/images/confirm"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const { image_id, tag, is_hero } = req.body;
  const extranetId = req.params.extranet_id;

  setTimeout(() => res.status(201).json({
    success: true,
    data: {
      image_id,
      url: `https://cdn.scapia.com/hotels/${extranetId}/${image_id}.jpg`,
      tag: tag || "other",
      is_hero: is_hero || false,
      order: Math.floor(Math.random() * 10) + 1,
      source: "uploaded",
    },
  }), responseDelay);
}

// ── Property Info — Update Images handler ────────────────────────────
function handleImagesUpdate(req, res) {
  const panelKey = activeResponses["property-info/images/update"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/images/update"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const { updates, delete: toDelete } = req.body;

  if (updates) {
    const heroCount = updates.filter(u => u.is_hero).length;
    if (heroCount > 1) {
      return setTimeout(() => res.status(400).json({
        success: false, error: { code: "MULTIPLE_HERO_FLAGS", message: "Only one image can be marked as hero." },
      }), responseDelay);
    }
  }

  const remainingImages = (updates || []).map((img, i) => ({
    url: img.url,
    tag: img.tag,
    is_hero: img.is_hero || false,
  }));

  setTimeout(() => res.status(200).json({
    success: true,
    message: "Images updated.",
    data: { images: remainingImages },
  }), responseDelay);
}

// ── Property Info — Amenities Master List handler ────────────────────
function handleAmenitiesMaster(req, res) {
  const panelKey = activeResponses["property-info/amenities/master"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["property-info/amenities/master"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  setTimeout(() => res.status(200).json({
    success: true,
    data: { amenities: MOCK_AMENITIES_MASTER },
  }), responseDelay);
}

// ── Rooms — Add Room handler ─────────────────────────────────────
function handleAddRoom(req, res) {
  const panelKey = activeResponses["rooms/add"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["rooms/add"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const extranetId = req.params.extranet_id;
  const body = req.body;

  // Validate required fields
  if (!body.room_name || !body.room_name.trim()) {
    return setTimeout(() => res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Validation failed.", details: { room_name: "Room name is required." } },
    }), responseDelay);
  }

  // Check duplicate name
  const rooms = getRooms(extranetId);
  if (rooms.some(r => r.room_name.toLowerCase() === body.room_name.trim().toLowerCase())) {
    return setTimeout(() => res.status(409).json({
      success: false,
      error: { code: "DUPLICATE_ROOM_NAME", message: "A room with this name already exists." },
    }), responseDelay);
  }

  // Create room
  const roomId = "rm_" + Math.random().toString(36).slice(2, 8);
  const newRoom = {
    room_id: roomId,
    room_name: body.room_name.trim(),
    room_size: body.room_size || { value: 0, unit: "ft" },
    room_view: { id: body.room_view_id, label: resolveViewLabel(body.room_view_id) },
    number_of_rooms: body.number_of_rooms || 1,
    has_balcony: body.has_balcony || false,
    smoking_allowed: body.smoking_allowed || false,
    bathrooms: body.bathrooms || { count: 1, attached: true },
    bed: {
      type_id: body.bed?.type_id || "",
      type_label: resolveBedTypeLabel(body.bed?.type_id || ""),
      count: body.bed?.count || 1,
    },
    extra_bed_provided: body.extra_bed_provided || false,
    occupancy: body.occupancy || { base_adults: 1, max_adults: 2, max_children: 1, max_occupancy: 3 },
    images: body.images || [],
    amenities: body.amenities || [],
    amenities_count: body.amenities_count || 0,
    verification_status: body.verification_status || "verified",
    source: "manual",
  };

  rooms.push(newRoom);

  setTimeout(() => res.status(201).json({
    success: true,
    data: {
      room_id: newRoom.room_id,
      room_name: newRoom.room_name,
      room_size: newRoom.room_size,
      room_view: newRoom.room_view,
      number_of_rooms: newRoom.number_of_rooms,
      has_balcony: newRoom.has_balcony,
      smoking_allowed: newRoom.smoking_allowed,
      bathrooms: newRoom.bathrooms,
      bed: newRoom.bed,
      extra_bed_provided: newRoom.extra_bed_provided,
      occupancy: newRoom.occupancy,
      images: newRoom.images,
      amenities_count: newRoom.amenities_count,
      source: newRoom.source,
      verification_status: newRoom.verification_status,
    },
  }), responseDelay);
}

// ── Rooms — Get Room Detail handler ──────────────────────────────
function handleGetRoomDetail(req, res) {
  const panelKey = activeResponses["rooms/detail"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["rooms/detail"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const { room_id, extranet_id } = req.params;
  const rooms = getRooms(extranet_id);
  const room = rooms.find(r => r.room_id === room_id);

  if (!room) {
    return setTimeout(() => res.status(404).json({
      success: false,
      error: { code: "ROOM_NOT_FOUND", message: "Room not found." },
    }), responseDelay);
  }

  setTimeout(() => res.status(200).json({ success: true, data: room }), responseDelay);
}

// ── Rooms — Update Room handler ──────────────────────────────────
function handleUpdateRoom(req, res) {
  const panelKey = activeResponses["rooms/update"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["rooms/update"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const { room_id, extranet_id } = req.params;
  const rooms = getRooms(extranet_id);
  const roomIndex = rooms.findIndex(r => r.room_id === room_id);

  if (roomIndex === -1) {
    return setTimeout(() => res.status(404).json({
      success: false,
      error: { code: "ROOM_NOT_FOUND", message: "Room not found." },
    }), responseDelay);
  }

  const fields = req.body;
  const updatedFields = [];

  for (const [key, value] of Object.entries(fields)) {
    if (key === "room_view_id") {
      rooms[roomIndex].room_view = { id: value, label: resolveViewLabel(value) };
      updatedFields.push("room_view");
    } else if (key === "bed") {
      rooms[roomIndex].bed = { type_id: value.type_id, type_label: resolveBedTypeLabel(value.type_id), count: value.count };
      updatedFields.push("bed");
    } else if (key in rooms[roomIndex]) {
      rooms[roomIndex][key] = value;
      updatedFields.push(key);
    }
  }

  // Mark as needing reverification if edited
  if (updatedFields.length > 0 && !fields.verification_status) {
    rooms[roomIndex].verification_status = "needs_reverification";
  }

  setTimeout(() => res.status(200).json({
    success: true,
    data: { room_id, verification_status: rooms[roomIndex].verification_status, updated_fields: updatedFields },
  }), responseDelay);
}

// ── Rooms — Delete Room handler ──────────────────────────────────
function handleDeleteRoom(req, res) {
  const panelKey = activeResponses["rooms/delete"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["rooms/delete"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const { room_id, extranet_id } = req.params;
  const rooms = getRooms(extranet_id);
  const roomIndex = rooms.findIndex(r => r.room_id === room_id);

  if (roomIndex === -1) {
    return setTimeout(() => res.status(404).json({
      success: false,
      error: { code: "ROOM_NOT_FOUND", message: "Room not found." },
    }), responseDelay);
  }

  rooms.splice(roomIndex, 1);
  const summary = getRoomsSummary(extranet_id);

  setTimeout(() => res.status(200).json({
    success: true,
    data: { room_id, rooms_summary: summary, can_submit_step: summary.total > 0 && summary.unverified === 0 },
  }), responseDelay);
}

// ── Rooms — Submit Step handler ──────────────────────────────────
function handleSubmitRoomsStep(req, res) {
  const panelKey = activeResponses["rooms/submit"];
  const isSuccess = !panelKey || panelKey === "success";

  if (!isSuccess) {
    const forced = RESPONSES["rooms/submit"]?.[panelKey];
    if (forced) return setTimeout(() => res.status(forced.status).json(forced.body), responseDelay);
  }

  if (!requireAuth(req)) {
    return setTimeout(() => res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." } }), responseDelay);
  }

  const extranetId = req.params.extranet_id;
  const rooms = getRooms(extranetId);

  if (rooms.length === 0) {
    return setTimeout(() => res.status(400).json({
      success: false,
      error: { code: "NO_ROOMS_ADDED", message: "You must add at least one room before continuing." },
    }), responseDelay);
  }

  const unverified = rooms.filter(r => r.verification_status !== "verified");
  if (unverified.length > 0) {
    return setTimeout(() => res.status(400).json({
      success: false,
      error: {
        code: "UNVERIFIED_ROOMS_EXIST",
        message: "All rooms must be verified before submitting.",
        details: { unverified_room_ids: unverified.map(r => r.room_id) },
      },
    }), responseDelay);
  }

  setTimeout(() => res.status(200).json({
    success: true,
    data: { onboarding_step: "pricing", completed_steps: ["property", "rooms"] },
  }), responseDelay);
}

// ── Auth API Routes ─────────────────────────────────────────────────
app.post(BASE + "/auth/register", handleRegister);
app.post(BASE + "/auth/verify-otp", handleVerifyOtp);
app.post(BASE + "/auth/resend-otp", (req, res) => sendMock("auth/resend-otp", req, res));
app.post(BASE + "/auth/login", handleLogin);
app.post(BASE + "/auth/token/refresh", (req, res) => sendMock("auth/token/refresh", req, res));
app.post(BASE + "/auth/logout", (req, res) => sendMock("auth/logout", req, res));
app.post(BASE + "/auth/password/reset-request", (req, res) => sendMock("auth/password/reset-request", req, res));
app.post(BASE + "/auth/password/reset", (req, res) => sendMock("auth/password/reset", req, res));

// ── Property API Routes ─────────────────────────────────────────────
app.get(BASE + "/properties/hotel-search", handleHotelSearch);
app.get(BASE + "/properties/preview/:hotel_id", handlePropertyPreview);

// ── Property Info Step Routes ────────────────────────────────────────
app.get(BASE, handlePropertyInfoPrefetchByName);
app.get(BASE + "/:extranet_id", handlePropertyInfoPrefetch);
app.patch(BASE + "/:onboarding_id/property-info/basic-info", handleBasicInfoSave);
app.post(BASE + "/property-info/send-otp/:extranet_id", handlePropertyInfoSendOtp);
app.post(BASE + "/property-info/contact/verify-otp/:extranet_id", handlePropertyInfoVerifyOtp);
app.post(BASE + "/property-info/images/upload-url/:extranet_id", handleImagesUploadUrl);
app.post(BASE + "/property-info/images/check-duplicate/:extranet_id", handleImagesCheckDuplicate);
app.post(BASE + "/property-info/images/confirm/:extranet_id", handleImagesConfirm);
app.patch(BASE + "/property-info/images/:extranet_id", handleImagesUpdate);
app.get(BASE + "/property-info/amenities/master/:extranet_id", handleAmenitiesMaster);

// ── Rooms Step Routes ─────────────────────────────────────────────
app.post(BASE + "/add-rooms/:extranet_id", handleAddRoom);
app.post(BASE + "/rooms/submit/:extranet_id", handleSubmitRoomsStep);
app.get(BASE + "/rooms/:room_id/:extranet_id", handleGetRoomDetail);
app.patch(BASE + "/rooms/:room_id/:extranet_id", handleUpdateRoom);
app.delete(BASE + "/rooms/:room_id/:extranet_id", handleDeleteRoom);

// ── Control Panel API ───────────────────────────────────────────────
app.get("/api/mock/config", (_req, res) => {
  const config = {};
  for (const [endpoint, responses] of Object.entries(RESPONSES)) {
    config[endpoint] = {
      active: activeResponses[endpoint],
      options: Object.keys(responses),
    };
  }
  res.json({ config, delay: responseDelay });
});

app.post("/api/mock/config", (req, res) => {
  const { endpoint, response, delay } = req.body;
  if (delay !== undefined) {
    responseDelay = Math.max(0, Math.min(Number(delay), 10000));
  }
  if (endpoint && response) {
    if (!RESPONSES[endpoint]) return res.status(400).json({ error: "Unknown endpoint" });
    if (!RESPONSES[endpoint][response]) return res.status(400).json({ error: "Unknown response type" });
    activeResponses[endpoint] = response;
  }
  res.json({ success: true, activeResponses, delay: responseDelay });
});

app.get("/api/mock/log", (_req, res) => res.json(requestLog));
app.delete("/api/mock/log", (_req, res) => {
  requestLog.length = 0;
  res.json({ success: true });
});

// ── Control Panel UI ────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.type("html").send(CONTROL_PANEL_HTML);
});

const CONTROL_PANEL_HTML = /*html*/`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Auth Mock Server — Control Panel</title>
<style>
  :root {
    --bg: #0a0a0f; --surface: #12121a; --border: #1e1e2e;
    --text: #e4e4ef; --muted: #6b6b80; --accent: #6366f1;
    --green: #22c55e; --red: #ef4444; --radius: 8px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

  .header {
    padding: 20px 32px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .header h1 { font-size: 18px; font-weight: 600; }
  .header h1 em { font-style: normal; color: var(--accent); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); display: inline-block; margin-right: 8px; }
  .header-right { display: flex; align-items: center; gap: 16px; font-size: 13px; color: var(--muted); }

  .container { max-width: 1100px; margin: 0 auto; padding: 24px 32px; }

  .delay-bar {
    display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
    padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  }
  .delay-bar label { font-size: 13px; font-weight: 500; white-space: nowrap; }
  .delay-bar input[type=range] { flex: 1; accent-color: var(--accent); }
  .delay-val { font-size: 13px; color: var(--accent); font-weight: 600; min-width: 55px; text-align: right; }

  .gtitle {
    font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--muted); margin: 28px 0 10px; padding-left: 2px;
  }
  .gtitle:first-child { margin-top: 0; }

  .ep {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 12px 16px; margin-bottom: 6px;
    display: flex; align-items: center; gap: 12px;
  }
  .ep:hover { border-color: #2a2a3e; }
  .ep .m {
    font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;
    background: rgba(99,102,241,0.15); color: var(--accent); letter-spacing: 0.04em; flex-shrink: 0;
  }
  .ep .p { font-size: 13px; font-family: monospace; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ep .b {
    font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;
    min-width: 36px; text-align: center; flex-shrink: 0;
  }
  .b-ok { background: rgba(34,197,94,0.15); color: var(--green); }
  .b-err { background: rgba(239,68,68,0.15); color: var(--red); }

  .ep select {
    appearance: none; background: var(--bg); color: var(--text);
    border: 1px solid var(--border); border-radius: 6px;
    padding: 6px 30px 6px 10px; font-size: 12px; font-family: monospace;
    cursor: pointer; min-width: 260px; flex-shrink: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%236b6b80'%3E%3Cpath d='M1 3l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
  }
  .ep select:focus { outline: none; border-color: var(--accent); }

  .btn {
    font-size: 12px; color: var(--muted); background: none; border: 1px solid var(--border);
    border-radius: 6px; padding: 5px 14px; cursor: pointer; transition: all 0.15s;
  }
  .btn:hover { border-color: var(--accent); color: var(--accent); }

  .log-section { margin-top: 36px; }
  .log-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .log-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .log-table th { text-align: left; padding: 8px 12px; color: var(--muted); border-bottom: 1px solid var(--border); font-weight: 500; }
  .log-table td { padding: 6px 12px; border-bottom: 1px solid var(--border); font-family: monospace; vertical-align: top; }
  .log-table tr:hover td { background: rgba(99,102,241,0.04); }
  .lt { color: var(--muted); }
  .lu { color: var(--accent); }
  .lb { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); cursor: pointer; }
  .lb:hover { white-space: normal; color: var(--text); word-break: break-all; }
  .le { padding: 24px; text-align: center; color: var(--muted); font-size: 13px; }

  #error-banner { display: none; padding: 12px 16px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--red); border-radius: var(--radius); margin-bottom: 16px; font-size: 13px; }
</style>
</head>
<body>

<div class="header">
  <h1><em>&#9889;</em> Auth Mock Server</h1>
  <div class="header-right">
    <button class="btn" id="resetBtn">&#8634; Reset All to Success</button>
    <div><span class="dot"></span>Port 3000</div>
  </div>
</div>

<div class="container">
  <div id="error-banner"></div>

  <div class="delay-bar">
    <label>Response Delay</label>
    <input type="range" id="delaySlider" min="0" max="3000" step="50" value="300">
    <div class="delay-val" id="delayVal">300 ms</div>
  </div>

  <div id="endpoints"><div class="le">Loading endpoints...</div></div>

  <div class="log-section">
    <div class="log-hdr">
      <div class="gtitle" style="margin:0">Request Log</div>
      <button class="btn" id="clearLogBtn">Clear</button>
    </div>
    <table class="log-table">
      <thead><tr><th style="width:90px">Time</th><th style="width:60px">Method</th><th>URL</th><th>Body</th></tr></thead>
      <tbody id="logBody"><tr><td colspan="4" class="le">No requests yet</td></tr></tbody>
    </table>
  </div>
</div>

<script>
(function() {
  // ── Config ──
  var GROUPS = [
    { label: "Registration", eps: ["auth/register", "auth/verify-otp", "auth/resend-otp"] },
    { label: "Login", eps: ["auth/login"] },
    { label: "Session", eps: ["auth/token/refresh", "auth/logout"] },
    { label: "Password Reset", eps: ["auth/password/reset-request", "auth/password/reset"] },
    { label: "Properties", eps: ["properties/hotel-search", "properties/preview"] },
    { label: "Property Info — Basic", eps: ["property-info/prefetch", "property-info/basic-info", "property-info/send-otp", "property-info/verify-otp"] },
    { label: "Property Info — Images", eps: ["property-info/images/upload-url", "property-info/images/check-duplicate", "property-info/images/confirm", "property-info/images/update"] },
    { label: "Property Info — Amenities", eps: ["property-info/amenities/master"] },
    { label: "Rooms", eps: ["rooms/add", "rooms/detail", "rooms/update", "rooms/delete", "rooms/submit"] }
  ];

  var config = null;

  function statusFor(ep, opt) {
    if (opt.indexOf("success") === 0) return ep === "auth/register" ? 201 : 200;
    var m = {
      EMAIL_ALREADY_EXISTS:409, INVALID_EMAIL_FORMAT:422, WEAK_PASSWORD:422,
      VALIDATION_ERROR:422, SAME_AS_OLD_PASSWORD:422,
      INVALID_CREDENTIALS:401, INVALID_REFRESH_TOKEN:401, REFRESH_TOKEN_EXPIRED:401, REFRESH_TOKEN_REVOKED:401,
      EMAIL_NOT_VERIFIED:403, ACCOUNT_DISABLED:403,
      ACCOUNT_NOT_FOUND:404, EMAIL_NOT_FOUND:404,
      TOO_MANY_REQUESTS:429, TOO_MANY_ATTEMPTS:429, RESEND_COOLDOWN:429, MAX_RESEND_LIMIT:429,
      UNAUTHORIZED:401, NO_PROPERTIES_WHITELISTED:404, PROPERTY_NOT_WHITELISTED:403, PROPERTY_NOT_FOUND:404, UPSTREAM_FETCH_FAILED:502,
      ONBOARDING_ACCESS_DENIED:403, ONBOARDING_NOT_FOUND:404,
      INVALID_PHONE_FORMAT:422, INVALID_OTP:400, OTP_EXPIRED:400, OTP_ALREADY_USED:400,
      INVALID_FILE_TYPE:422, FILE_TOO_LARGE:422, UPLOAD_LIMIT_REACHED:429,
      DUPLICATE_FOUND:200,
      UPLOAD_URL_EXPIRED:400, IMAGE_NOT_UPLOADED:400, IMAGE_ALREADY_CONFIRMED:409,
      HERO_IMAGE_DELETED:400, MULTIPLE_HERO_FLAGS:400, DUPLICATE_ORDER_VALUES:400, IMAGE_NOT_FOUND:404,
      DUPLICATE_ROOM_NAME:409, ROOM_NOT_FOUND:404, CANNOT_DELETE_LAST_ROOM:400, NO_ROOMS_ADDED:400, UNVERIFIED_ROOMS_EXIST:400
    };
    return m[opt] || 400;
  }

  function escHtml(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  function showError(msg) {
    var b = document.getElementById("error-banner");
    b.textContent = msg;
    b.style.display = "block";
    setTimeout(function(){ b.style.display = "none"; }, 5000);
  }

  // ── Render endpoints ──
  function render() {
    var el = document.getElementById("endpoints");
    if (!config) { el.innerHTML = '<div class="le">Failed to load config</div>'; return; }

    var parts = [];
    var i, j, k, g, ep, c, st, opts, opt, sel;

    for (i = 0; i < GROUPS.length; i++) {
      g = GROUPS[i];
      parts.push('<div class="gtitle">' + escHtml(g.label) + ' (' + g.eps.length + ')</div>');

      for (j = 0; j < g.eps.length; j++) {
        ep = g.eps[j];
        c = config[ep];
        if (!c) {
          parts.push('<div class="ep" style="color:var(--red)">Missing config: ' + escHtml(ep) + '</div>');
          continue;
        }

        st = statusFor(ep, c.active);
        opts = c.options;

        parts.push('<div class="ep">');
        var meth = "POST";
        if (ep === "properties/hotel-search" || ep === "properties/preview" || ep === "property-info/prefetch" || ep === "property-info/amenities/master" || ep === "rooms/detail") meth = "GET";
        else if (ep === "property-info/basic-info" || ep === "property-info/images/update" || ep === "rooms/update") meth = "PATCH";
        else if (ep === "rooms/delete") meth = "DELETE";
        parts.push('<span class="m">' + meth + '</span>');
        parts.push('<span class="p">/api/onboarding/' + escHtml(ep) + '</span>');
        parts.push('<span class="b ' + (st < 400 ? 'b-ok' : 'b-err') + '">' + st + '</span>');
        parts.push('<select id="sel-' + i + '-' + j + '">');

        for (k = 0; k < opts.length; k++) {
          opt = opts[k];
          sel = (opt === c.active) ? ' selected' : '';
          parts.push('<option value="' + escHtml(opt) + '"' + sel + '>' + (opt === 'success' ? '&#10003; ' : '&#10007; ') + escHtml(opt) + '</option>');
        }

        parts.push('</select>');
        parts.push('</div>');
      }
    }

    el.innerHTML = parts.join('\\n');

    // Bind change handlers
    for (i = 0; i < GROUPS.length; i++) {
      for (j = 0; j < GROUPS[i].eps.length; j++) {
        (function(endpoint, selId) {
          var selEl = document.getElementById(selId);
          if (selEl) {
            selEl.onchange = function() {
              setResponse(endpoint, selEl.value);
            };
          }
        })(GROUPS[i].eps[j], 'sel-' + i + '-' + j);
      }
    }
  }

  // ── Load config from server ──
  function loadConfig() {
    fetch("/api/mock/config")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        config = data.config;
        document.getElementById("delaySlider").value = data.delay;
        document.getElementById("delayVal").textContent = data.delay + " ms";
        render();
      })
      .catch(function(err) {
        showError("Failed to load config: " + err.message);
        document.getElementById("endpoints").innerHTML = '<div class="le" style="color:var(--red)">Could not connect to server. Is it running?</div>';
      });
  }

  // ── Set response for an endpoint ──
  function setResponse(endpoint, response) {
    fetch("/api/mock/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: endpoint, response: response })
    })
    .then(function() { loadConfig(); })
    .catch(function(err) { showError("Failed to update: " + err.message); });
  }

  // ── Delay slider ──
  var slider = document.getElementById("delaySlider");
  var delayLabel = document.getElementById("delayVal");
  var delayTimer = null;

  slider.oninput = function() {
    delayLabel.textContent = slider.value + " ms";
    clearTimeout(delayTimer);
    delayTimer = setTimeout(function() {
      fetch("/api/mock/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delay: parseInt(slider.value) })
      }).catch(function(err) { showError("Delay update failed: " + err.message); });
    }, 300);
  };

  // ── Reset all ──
  document.getElementById("resetBtn").onclick = function() {
    if (!config) return;
    var endpoints = Object.keys(config);
    var chain = Promise.resolve();
    endpoints.forEach(function(ep) {
      var firstOpt = config[ep].options[0];
      chain = chain.then(function() {
        return fetch("/api/mock/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: ep, response: firstOpt })
        });
      });
    });
    chain.then(function() { loadConfig(); });
  };

  // ── Log polling ──
  function pollLog() {
    fetch("/api/mock/log")
      .then(function(r) { return r.json(); })
      .then(function(log) {
        var tbody = document.getElementById("logBody");
        if (!log || log.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="le">No requests yet</td></tr>';
          return;
        }
        var rows = [];
        for (var i = 0; i < log.length; i++) {
          var e = log[i];
          var t = new Date(e.time).toLocaleTimeString();
          var b = (e.body && Object.keys(e.body).length > 0) ? escHtml(JSON.stringify(e.body)) : "—";
          rows.push('<tr><td class="lt">' + t + '</td><td>' + escHtml(e.method) + '</td><td class="lu">' + escHtml(e.url) + '</td><td class="lb">' + b + '</td></tr>');
        }
        tbody.innerHTML = rows.join('');
      })
      .catch(function() {});
  }

  document.getElementById("clearLogBtn").onclick = function() {
    fetch("/api/mock/log", { method: "DELETE" }).then(pollLog);
  };

  // ── Init ──
  loadConfig();
  setInterval(pollLog, 1500);
})();
</script>

</body>
</html>`;

// ── Start ───────────────────────────────────────────────────────────
app.listen(3000, () => {
  console.log("");
  console.log("  ⚡ Auth Mock Server running on http://localhost:3000");
  console.log("  📋 Control Panel:  http://localhost:3000");
  console.log("  🔌 API Base:       http://localhost:3000/api/onboarding/auth/");
  console.log("");
});