// App Configuration Constants

export const AppConfig = {
  // App Identity
  APP_NAME: 'FaceAttend',
  VERSION: '1.0.0',
  BADGE_NAME: 'जितेंद्र कुमार',
  BADGE_DEPT: 'COPA',

  // Recognition Settings
  DEFAULT_RECOGNITION_THRESHOLD: 0.85,
  DUPLICATE_THRESHOLD: 0.90,
  CAMERA_TIMEOUT_SECONDS: 8,
  RESULT_DISPLAY_SECONDS: 2.5,

  // Face Quality Thresholds (provisional — calibrate with real model)
  FACE_MIN_RATIO: 0.12,
  FACE_MAX_RATIO: 0.75,
  FACE_MAX_TILT_DEG: 30,

  // Registration
  MIN_REGISTRATION_PHOTOS: 3,
  MAX_REGISTRATION_PHOTOS: 5,

  // Registration Angle Ranges (provisional — verify with device testing)
  ANGLES: {
    FRONT: { rotY: [-12, 12], rotX: [-12, 12] },
    LEFT: { rotY: [-35, -10], rotX: [-20, 20] },
    RIGHT: { rotY: [10, 35], rotX: [-20, 20] },
    UP: { rotY: [-20, 20], rotX: [-30, -8] },
    DOWN: { rotY: [-20, 20], rotX: [8, 30] },
  },

  // Face Crop Padding (provisional)
  CROP_PADDING_X: 0.20,
  CROP_PADDING_Y: 0.25,

  // TFLite Model (provisional — verify with actual model metadata)
  MODEL_INPUT_SIZE: 112,
  MODEL_INPUT_CHANNELS: 3,
  MODEL_EMBEDDING_DIM: 128,
  MODEL_NORMALIZE_MEAN: 127.5,
  MODEL_NORMALIZE_SCALE: 127.5,

  // Pagination
  ROWS_PER_PAGE: 12,

  // Backup
  BACKUP_INTERVAL_MS: 3 * 60 * 60 * 1000, // ~3 hours

  // Sync
  SYNC_INTERVAL_MS: 20 * 1000, // ~20 seconds

  // Database
  DB_NAME: 'face_attendance.db',
};

export const AttendanceColumns = [
  { key: 'column_1', label: 'Roll No', editable: true },
  { key: 'column_2', label: 'Class', editable: true },
  { key: 'column_3', label: 'Subject', editable: true },
  { key: 'column_4', label: 'Period', editable: true },
  { key: 'column_5', label: 'Status', editable: true },
  { key: 'column_6', label: 'Remarks', editable: true },
  { key: 'column_7', label: 'Col 7', editable: true },
  { key: 'column_8', label: 'Col 8', editable: true },
];

export default AppConfig;
