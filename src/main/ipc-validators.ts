import Joi from 'joi';

/**
 * IPC Input Validation Schemas
 *
 * Validates all data received via IPC channels from the renderer process
 * to prevent injection attacks and malformed data from reaching main process logic.
 */

// Schema for project:save arguments
export const projectSaveSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().max(200).required(),
  version: Joi.string().required(),
  circuit: Joi.object().required(),
  sketch: Joi.object().required(),
  configuration: Joi.object().optional(),
  metadata: Joi.object().optional(),
}).unknown(true);

// Schema for file path arguments
export const filePathSchema = Joi.string()
  .max(1000)
  .pattern(/^[^<>"|?*]+$/) // No invalid path characters
  .required();

// Schema for virtual port config
export const serialConfigSchema = Joi.object({
  baudRate: Joi.number()
    .valid(9600, 19200, 38400, 57600, 115200)
    .required(),
  dataBits: Joi.number().valid(5, 6, 7, 8).default(8),
  stopBits: Joi.number().valid(1, 1.5, 2).default(1),
  parity: Joi.string()
    .valid('none', 'even', 'odd', 'mark', 'space')
    .default('none'),
  flowControl: Joi.boolean().default(false),
}).required();

// Schema for port name
export const portNameSchema = Joi.string()
  .max(100)
  .pattern(/^[a-zA-Z0-9/._-]+$/)
  .required();

// Schema for export format
export const exportFormatSchema = Joi.string()
  .valid('arduino', 'pdf', 'image')
  .required();

// Schema for file content (must be a string, limited size)
export const fileContentSchema = Joi.string()
  .max(10 * 1024 * 1024) // 10MB max
  .required();

/**
 * Validates data against a Joi schema and returns typed result.
 * Returns an object with either the validated value or an error message.
 */
export function validate<T>(
  schema: Joi.Schema,
  data: unknown,
): { value: T; error?: string } {
  const result = schema.validate(data, { stripUnknown: false });
  if (result.error) {
    return { value: data as T, error: result.error.message };
  }
  return { value: result.value as T };
}
