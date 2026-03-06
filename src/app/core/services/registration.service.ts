import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, map } from 'rxjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Plan, RegistrationDto, RegistrationResult, RegistrationResultSchema } from '../models/registration.model';

@Injectable({
    providedIn: 'root',
})
export class RegistrationService {
    private http = inject(HttpClient);
    private platformId = inject(PLATFORM_ID);
    private supabase: SupabaseClient;
    private isBrowser = isPlatformBrowser(this.platformId);

    constructor() {
        this.supabase = createClient(
            environment.supabaseUrl,
            environment.supabaseAnonKey
        );
    }

    /**
     * Obtiene los planes activos desde Supabase.
     * Solo se ejecuta en el navegador (browser) para evitar que SSR falle.
     */
    getActivePlans(): Observable<Plan[]> {
        // Skip during SSR — Angular server side rendering blocks external fetch
        if (!this.isBrowser) {
            return of([]);
        }
        return from(
            this.supabase
                .from('plans')
                .select(`
          id,
          name,
          code,
          description,
          price,
          billing_cycle,
          trial_days,
          is_active,
          plan_features (
            id,
            value,
            description
          )
        `)
                .eq('is_active', true)
                .order('price', { ascending: true })
                .then(({ data, error }) => {
                    if (error) throw error;
                    return (data as Plan[]) ?? [];
                })
        );
    }

    /**
     * Registra un nuevo cliente llamando a la Edge Function pública `register-client`.
     * No requiere autenticación (verify_jwt: false).
     * Valida la forma de la respuesta con Zod antes de exponerla al resto de la app.
     */
    registerClient(dto: RegistrationDto): Observable<RegistrationResult> {
        return this.http
            .post<unknown>(environment.registerEndpoint, dto, {
                headers: { 'Content-Type': 'application/json' },
            })
            .pipe(
                map((response) => {
                    const parsed = RegistrationResultSchema.safeParse(response);
                    if (!parsed.success) {
                        throw new Error('Respuesta inválida del servidor de registro.');
                    }
                    return parsed.data;
                })
            );
    }

    /**
     * Verifica si ya existe un conjunto con el mismo NIT.
     */
    checkNitExists(nit: string): Observable<boolean> {
        if (!this.isBrowser || !nit) return of(false);
        return from(
            this.supabase
                .from('tenants')
                .select('id', { count: 'exact', head: true })
                .eq('contact_nit', nit.trim())
                .then(({ count }) => (count ?? 0) > 0)
        );
    }

    /**
     * Verifica si ya existe un conjunto con el mismo nombre.
     */
    checkNameExists(name: string): Observable<boolean> {
        if (!this.isBrowser || !name) return of(false);
        return from(
            this.supabase
                .from('tenants')
                .select('id', { count: 'exact', head: true })
                .ilike('name', name.trim())
                .then(({ count }) => (count ?? 0) > 0)
        );
    }

    /**
     * Resuelve la etiqueta del ciclo de facturación.
     */
    getBillingCycleLabel(cycleId: number): string {
        const labels: Record<number, string> = {
            18: 'mes',
            19: 'año',
            21: 'semestre',
        };
        return labels[cycleId] ?? 'período';
    }
}
