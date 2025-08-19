export enum ErrorType {
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  STORAGE = 'STORAGE',
  ML_PROCESSING = 'ML_PROCESSING',
  SYNC = 'SYNC',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface RecoveryAction {
  label: string;
  action: () => Promise<void> | void;
  primary?: boolean;
}

export abstract class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly recoveryActions?: RecoveryAction[];
  public readonly userMessage: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    userMessage?: string,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.severity = severity;
    this.userMessage = userMessage || this.getDefaultUserMessage();
    this.context = context;
    this.recoveryActions = recoveryActions;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  protected abstract getDefaultUserMessage(): string;

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      userMessage: this.userMessage,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(message, ErrorType.NETWORK, severity, undefined, context, recoveryActions);
  }

  protected getDefaultUserMessage(): string {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
}

export class PermissionError extends AppError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(message, ErrorType.PERMISSION, severity, undefined, context, recoveryActions);
  }

  protected getDefaultUserMessage(): string {
    return 'Permission required. Please grant the necessary permissions to continue.';
  }
}

export class StorageError extends AppError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(message, ErrorType.STORAGE, severity, undefined, context, recoveryActions);
  }

  protected getDefaultUserMessage(): string {
    return 'Storage issue encountered. Please check available storage space.';
  }
}

export class MLProcessingError extends AppError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(message, ErrorType.ML_PROCESSING, severity, undefined, context, recoveryActions);
  }

  protected getDefaultUserMessage(): string {
    return 'AI processing temporarily unavailable. Some features may be limited.';
  }
}

export class SyncError extends AppError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(message, ErrorType.SYNC, severity, undefined, context, recoveryActions);
  }

  protected getDefaultUserMessage(): string {
    return 'Sync issue encountered. Your data is safe locally and will sync when connection is restored.';
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(message, ErrorType.AUTHENTICATION, severity, undefined, context, recoveryActions);
  }

  protected getDefaultUserMessage(): string {
    return 'Authentication required. Please sign in to continue.';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.LOW,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(message, ErrorType.VALIDATION, severity, undefined, context, recoveryActions);
  }

  protected getDefaultUserMessage(): string {
    return 'Invalid input. Please check your data and try again.';
  }
}