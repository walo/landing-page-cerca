import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { debounceTime, switchMap, map, first } from 'rxjs/operators';
import { RegistrationService } from './core/services/registration.service';
import {
  ClientType,
  Plan,
  RegistrationDto,
  RegistrationDtoSchema,
  RegistrationResult,
  RegistrationStep,
} from './core/models/registration.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private fb = inject(FormBuilder);
  private meta = inject(Meta);
  private title = inject(Title);
  private registrationService = inject(RegistrationService);

  // State signals
  readonly plans = signal<Plan[]>([]);
  readonly selectedPlan = signal<Plan | null>(null);
  readonly step = signal<RegistrationStep>('form');
  readonly registrationResult = signal<RegistrationResult | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoadingPlans = signal(true);

  // Computed
  readonly isLoading = computed(() => this.step() === 'loading');
  readonly isSuccess = computed(() => this.step() === 'success');
  readonly isError = computed(() => this.step() === 'error');
  readonly clientType = computed<ClientType>(() => {
    const plan = this.selectedPlan();
    if (!plan) return 'SINGLE_CONJUNTO';
    return this.getClientTypeForPlan(plan);
  });
  readonly isEnterprise = computed(() => this.clientType() === 'ADMIN_COMPANY');
  readonly isSingleConjunto = computed(() => this.clientType() === 'SINGLE_CONJUNTO');

  // Reactive Form
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)], [this.uniqueNameValidator()]],
    contact_name: ['', [Validators.required, Validators.minLength(3)]],
    contact_nit: ['', [Validators.required, Validators.pattern(/^\d{6,12}-?\d?$/)], [this.uniqueNitValidator()]],
    contact_email: ['', [Validators.required, Validators.email]],
    contact_phone: ['', [Validators.required, Validators.pattern(/^[3][0-9]{9}$/)]],
    contact_address: ['', [Validators.required]],
    contact_city: ['', [Validators.required]],
  });

  private uniqueNitValidator(): AsyncValidatorFn {
    return (control: AbstractControl) =>
      control.valueChanges.pipe(
        debounceTime(600),
        switchMap(value => this.registrationService.checkNitExists(value ?? '')),
        map(exists => (exists ? { nitExists: true } : null)),
        first()
      );
  }

  private uniqueNameValidator(): AsyncValidatorFn {
    return (control: AbstractControl) =>
      control.valueChanges.pipe(
        debounceTime(600),
        switchMap(value => this.registrationService.checkNameExists(value ?? '')),
        map(exists => (exists ? { nameExists: true } : null)),
        first()
      );
  }

  // Static content data
  readonly heroBenefits = [
    'Gestión de cuotas y cartera con recordatorios automáticos',
    'Comunicaciones a residentes por correo y notificaciones',
    'Módulo de PQRS y solicitudes en línea',
    'Reservas de zonas comunes en tiempo real',
    'Informes financieros y contables al instante',
  ];

  readonly features = [
    {
      icon: '💰',
      title: 'Gestión de Cartera',
      description: 'Controla cuotas de administración, genera recibos y envía recordatorios automáticos a morosos. Integración con pagos en línea vía Wompi.',
    },
    {
      icon: '👥',
      title: 'Directorio de Residentes',
      description: 'Mantén actualizado el directorio de propietarios y arrendatarios. Gestiona accesos y permisos de cada unidad.',
    },
    {
      icon: '📢',
      title: 'Comunicados Masivos',
      description: 'Envía comunicados, circulares y alertas importantes a todos los residentes por correo electrónico y notificaciones push.',
    },
    {
      icon: '📋',
      title: 'PQRS en Línea',
      description: 'Recibe y da seguimiento a peticiones, quejas, reclamos y sugerencias de los residentes con trazabilidad completa.',
    },
    {
      icon: '🏊',
      title: 'Reservas de Zonas Comunes',
      description: 'Gestiona la disponibilidad y reservas del salón comunal, piscina, BBQ y otras zonas comunes del conjunto.',
    },
    {
      icon: '📊',
      title: 'Reportes e Informes',
      description: 'Genera informes financieros, de cartera y de actividad para presentar en las asambleas de copropietarios.',
    },
  ];

  readonly dashboardStats = [
    { label: 'Residentes', value: '124', change: '+2 este mes' },
    { label: 'Recaudo', value: '94%', change: '↑ 6% vs anterior' },
    { label: 'PQRS abiertas', value: '3', change: '5 resueltas' },
    { label: 'Saldo CTA', value: '$8.2M', change: '↑ Actualizado hoy' },
  ];

  readonly recentActivity = [
    { icon: '💳', desc: 'Pago cuota Apto 301', time: 'Hace 5 min', badge: '$250K' },
    { icon: '📋', desc: 'Nueva PQRS - Apto 205', time: 'Hace 20 min', badge: 'Nuevo' },
    { icon: '📢', desc: 'Comunicado asamblea', time: 'Hace 1h', badge: 'Enviado' },
  ];

  readonly onboardingSteps = [
    { text: 'Revisa tu correo y abre el enlace para crear tu contraseña de acceso.' },
    { text: 'Ingresa a cerca-admin con tus credenciales y configura tu conjunto: torres, unidades, propietarios.' },
    { text: 'Empieza a gestionar cuotas, comunicados y residentes. ¡Tienes 15 días completamente gratis!' },
  ];

  readonly onboardingStepsEnterprise = [
    { text: 'Revisa tu correo y abre el enlace para crear tu contraseña de acceso a saas-admin.' },
    { text: 'Ingresa a saas-admin con tus credenciales y configura el perfil de tu empresa administradora.' },
    { text: 'Crea tus primeros conjuntos, asigna administradores de conjunto y personaliza tu marca (subdominio, logo, colores).' },
  ];

  readonly currentOnboardingSteps = computed(() =>
    this.isEnterprise() ? this.onboardingStepsEnterprise : this.onboardingSteps,
  );

  ngOnInit(): void {
    // SEO Meta tags
    this.title.setTitle('Cerca | Gestión Inteligente para tu Conjunto Residencial');
    this.meta.addTags([
      { name: 'description', content: 'Digitaliza tu conjunto residencial con Cerca. Administra cuotas, residentes, PQRS y más desde un solo lugar. Empieza gratis 15 días.' },
      { name: 'keywords', content: 'administración conjunto residencial, software propiedad horizontal, app conjunto, cuotas administración, Colombia' },
      { property: 'og:title', content: 'Cerca | Gestión Inteligente para tu Conjunto Residencial' },
      { property: 'og:description', content: 'Digitaliza tu conjunto residencial. Gestión de cuotas, residentes y comunicación en un solo lugar.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: 'cerca-logo-full.png' },
      { name: 'robots', content: 'index, follow' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ]);
    this.loadPlans();
  }

  private loadPlans(): void {
    this.isLoadingPlans.set(true);
    this.registrationService.getActivePlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        if (plans.length > 0) {
          // Pre-select first plan
          this.selectedPlan.set(plans[0]);
        }
        this.isLoadingPlans.set(false);
      },
      error: () => {
        this.isLoadingPlans.set(false);
      },
    });
  }

  selectPlan(plan: Plan): void {
    this.selectedPlan.set(plan);
    // Scroll to form on mobile
    const formEl = document.getElementById('registro-form');
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getBillingLabel(cycleId: number): string {
    return this.registrationService.getBillingCycleLabel(cycleId);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  }

  getDefaultFeatures(plan: Plan): string[] {
    const isBasic = plan.code?.includes('BASIC') || plan.name?.includes('Basic');
    if (isBasic) {
      return [
        'Hasta 50 unidades residenciales',
        'Gestión de cuotas y cartera',
        'Comunicados a residentes',
        'Módulo de PQRS',
        'Soporte por correo',
      ];
    }
    return [
      'Unidades residenciales ilimitadas',
      'Gestión de cuotas y cartera avanzada',
      'Comunicados masivos y notificaciones push',
      'PQRS + reservas de zonas comunes',
      'Reportes financieros avanzados',
      'Soporte prioritario 24/7',
    ];
  }

  /**
   * Deriva el tipo de cliente a partir del plan.
   * Usa is_enterprise cuando esté disponible; respaldo por name/code.
   */
  private getClientTypeForPlan(plan: Plan): ClientType {
    if (plan.is_enterprise === true) return 'ADMIN_COMPANY';
    const name = plan.name?.toLowerCase() ?? '';
    const code = plan.code?.toLowerCase() ?? '';
    if (name.includes('enterprise') || code.includes('enterprise')) return 'ADMIN_COMPANY';
    return 'SINGLE_CONJUNTO';
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field) as AbstractControl;
    return control?.invalid && (control?.dirty || control?.touched);
  }

  getFieldError(field: string): string {
    const control = this.form.get(field) as AbstractControl;
    if (!control) return '';
    if (control.hasError('required')) return 'Este campo es obligatorio';
    if (control.hasError('email')) return 'Ingresa un correo electrónico válido';
    if (control.hasError('minlength')) return `Mínimo ${control.errors?.['minlength']?.requiredLength} caracteres`;
    if (control.hasError('nitExists')) return 'Ya existe un conjunto registrado con este NIT';
    if (control.hasError('nameExists')) return 'Ya existe un conjunto registrado con este nombre';
    if (control.hasError('pattern')) {
      if (field === 'contact_phone') return 'Ingresa un número celular colombiano válido (ej: 3001234567)';
      if (field === 'contact_nit') return 'Formato de NIT inválido (ej: 900123456-1)';
    }
    return 'Campo inválido';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const plan = this.selectedPlan();
    if (!plan) {
      this.errorMessage.set('Por favor selecciona un plan para continuar.');
      return;
    }

    this.step.set('loading');
    this.errorMessage.set(null);

    const formValue = this.form.getRawValue();
    const dto: RegistrationDto = {
      client_type: this.clientType(),
      is_enterprise: this.selectedPlan()?.is_enterprise ?? false,
      name: formValue.name ?? '',
      contact_name: formValue.contact_name ?? '',
      tax_id: formValue.contact_nit ?? '',
      contact_email: formValue.contact_email ?? '',
      contact_phone: formValue.contact_phone ?? '',
      billing_address: formValue.contact_address ?? '',
      billing_city: formValue.contact_city ?? '',
      plan_id: plan.id,
    };

    const validation = RegistrationDtoSchema.safeParse(dto);
    if (!validation.success) {
      this.step.set('error');
      this.errorMessage.set('Datos inválidos, revisa la información del formulario.');
      return;
    }

    this.registrationService.registerClient(dto).subscribe({
      next: (result) => {
        this.registrationResult.set(result);
        this.step.set('success');
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Error al procesar tu solicitud. Por favor intenta nuevamente.';
        this.errorMessage.set(msg);
        this.step.set('error');
      },
    });
  }

  retry(): void {
    this.step.set('form');
    this.errorMessage.set(null);
  }

  clearError(): void {
    this.step.set('form');
    this.errorMessage.set(null);
  }

  scrollToForm(): void {
    const el = document.getElementById('registro-form');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollToPricing(): void {
    const el = document.getElementById('planes');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
