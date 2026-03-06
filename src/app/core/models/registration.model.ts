/**
 * Domain models for the Landing Page registration flow.
 * Connects to `suscripciones` Supabase project via register-client Edge Function.
 */
import { z } from 'zod';

/** Plan disponible en el sistema de suscripciones */
export interface Plan {
    id: string;
    name: string;
    code: string;
    description?: string;
    price: number;
    billing_cycle: number; // catalog_item id: 18=Mensual, 19=Anual, 21=Semestral
    billing_cycle_label?: string;
    trial_days: number;
    is_active: boolean;
    features?: PlanFeature[];
    plan_features?: PlanFeature[];
}

/** Feature de un plan */
export interface PlanFeature {
    id: string;
    value: string;
    description?: string;
}

/** DTO enviado a la Edge Function register-client */
export const RegistrationDtoSchema = z.object({
    name: z.string().min(3),
    contact_name: z.string().min(3),
    contact_nit: z.string().min(6),
    contact_email: z.string().email(),
    contact_phone: z.string().min(10),
    contact_address: z.string().min(3),
    contact_city: z.string().min(2),
    plan_id: z.string().min(1),
});

export type RegistrationDto = z.infer<typeof RegistrationDtoSchema>;

/** Respuesta exitosa de la Edge Function */
export const RegistrationResultSchema = z.object({
    success: z.boolean(),
    clientId: z.string(),
    message: z.string(),
    planName: z.string(),
    trialEndDate: z.string(),
    emailSent: z.boolean(),
});

export type RegistrationResult = z.infer<typeof RegistrationResultSchema>;

/** Estado del formulario de registro */
export type RegistrationStep = 'form' | 'loading' | 'success' | 'error';
