// backend/static/app.js
// A-Z Household Services — Vue 3 SPA root
// ─────────────────────────────────────────

import { AdminDashboard } from '/static/components/admin.js';
import { CustomerDashboard } from '/static/components/customer.js';
import { ProfessionalDashboard } from '/static/components/professional.js';

const { createApp, ref, computed, onMounted, reactive } = Vue;

// ─── AUTH HELPER (shared across components) ──────────────────────────
export const auth = {
  get token() { return localStorage.getItem('hsa_token'); },
  get user()  {
    try { return JSON.parse(localStorage.getItem('hsa_user') || 'null'); }
    catch { return null; }
  },
  isLoggedIn() { return !!this.token; },
  role()       { return this.user?.role || null; },
  login(token, user) {
    localStorage.setItem('hsa_token', token);
    localStorage.setItem('hsa_user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('hsa_token');
    localStorage.removeItem('hsa_user');
  },
};

// ─── AXIOS DEFAULTS ──────────────────────────────────────────────────
axios.defaults.baseURL = '';
axios.interceptors.request.use(cfg => {
  const t = auth.token;
  if (t) cfg.headers['Authorization'] = `Bearer ${t}`;
  return cfg;
});

// ─── CATEGORY ICONS ──────────────────────────────────────────────────
export const catIcon = (cat) => ({
  'AC Repair': '❄️', 'Cleaning': '🧹', 'Electrician': '⚡',
  'Plumbing': '🔧', 'Salon': '💇', 'Pest Control': '🐛',
}[cat] || '🏠');

// ─── STATUS BADGE HELPER ─────────────────────────────────────────────
export const statusClass = (s) => `badge-status status-${(s||'').toLowerCase()}`;

// ─── TOAST COMPONENT ─────────────────────────────────────────────────
const ToastHost = {
  name: 'ToastHost',
  data: () => ({ toasts: [] }),
  methods: {
    show(msg, type = 'info', ttl = 3500) {
      const id = Date.now();
      this.toasts.push({ id, msg, type });
      setTimeout(() => this.remove(id), ttl);
    },
    remove(id) { this.toasts = this.toasts.filter(t => t.id !== id); },
  },
  template: `
    <div class="toast-wrap">
      <div v-for="t in toasts" :key="t.id" class="toast-msg" :class="t.type">
        {{ t.msg }}
      </div>
    </div>
  `,
};

// ─── LANDING PAGE ─────────────────────────────────────────────────────
const LandingPage = {
  name: 'LandingPage',
  emits: ['go-login', 'go-register-customer', 'go-register-professional'],
  template: `
  <div>
    <!-- NAVBAR -->
    <nav class="navbar navbar-expand-lg navbar-dark fixed-top">
      <div class="container">
        <span class="navbar-brand">🏠 A-Z Household Services</span>
        <div class="d-flex gap-2 ms-auto">
          <button class="btn btn-outline-secondary btn-sm" @click="$emit('go-login')">Login</button>
          <button class="btn btn-primary btn-sm" @click="$emit('go-register-customer')">Sign Up</button>
        </div>
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div class="container">
        <div class="hero-badge">Trusted Home Services</div>
        <h1 class="hero-title">
          Your Home Deserves<br>
          <span class="gradient-text">Expert Care</span>
        </h1>
        <p class="hero-sub">Book vetted professionals for AC repair, cleaning, plumbing, electrical, salon, and more — all in one platform.</p>
        <div class="d-flex gap-3 justify-content-center flex-wrap">
          <button class="btn btn-primary px-4 py-2" @click="$emit('go-register-customer')">
            <i class="bi bi-person-plus me-2"></i>Book a Service
          </button>
          <button class="btn btn-outline-secondary px-4 py-2" @click="$emit('go-register-professional')">
            <i class="bi bi-briefcase me-2"></i>Join as Professional
          </button>
        </div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section class="section" style="background:var(--bg-card); border-top:1px solid var(--border);">
      <div class="container">
        <h2 class="section-title text-center">Our Services</h2>
        <p class="section-sub text-center">Six categories, hundreds of professionals.</p>
        <div class="row g-3 justify-content-center">
          <div v-for="cat in categories" :key="cat.name" class="col-6 col-md-4 col-lg-2">
            <div class="glass-card text-center" style="cursor:default">
              <div style="font-size:2.5rem;margin-bottom:8px">{{ cat.icon }}</div>
              <div style="font-weight:700;font-size:13px">{{ cat.name }}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">From ₹{{ cat.from }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="section">
      <div class="container">
        <h2 class="section-title text-center">How It Works</h2>
        <p class="section-sub text-center">Simple, fast, reliable.</p>
        <div class="row g-4">
          <div v-for="step in steps" :key="step.n" class="col-md-4">
            <div class="glass-card text-center h-100">
              <div style="font-size:2rem;margin-bottom:12px">{{ step.icon }}</div>
              <div style="font-size:32px;font-weight:800;color:var(--accent);margin-bottom:8px">{{ step.n }}</div>
              <h5 style="font-weight:700">{{ step.title }}</h5>
              <p style="color:var(--text-muted);font-size:13px;margin-top:8px">{{ step.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer style="background:var(--bg-card);border-top:1px solid var(--border);padding:2rem 0;text-align:center;color:var(--text-dim);font-size:12px;">
      <p>© 2024 A-Z Household Services &nbsp;|&nbsp; Parth Jain &nbsp;|&nbsp; IITM: 23f2003877 &nbsp;|&nbsp; VIT: 23bce10156</p>
    </footer>
  </div>
  `,
  data: () => ({
    categories: [
      { name: 'AC Repair', icon: '❄️', from: 499 },
      { name: 'Cleaning', icon: '🧹', from: 299 },
      { name: 'Electrician', icon: '⚡', from: 199 },
      { name: 'Plumbing', icon: '🔧', from: 249 },
      { name: 'Salon', icon: '💇', from: 299 },
      { name: 'Pest Control', icon: '🐛', from: 799 },
    ],
    steps: [
      { n: '1', icon: '🔍', title: 'Find a Service', desc: 'Browse categories or search by name, location, or pincode.' },
      { n: '2', icon: '📅', title: 'Book a Professional', desc: 'Choose a vetted expert and pick your preferred date.' },
      { n: '3', icon: '✅', title: 'Get It Done', desc: 'Professional arrives, completes the job, and you rate them.' },
    ],
  }),
};

// ─── LOGIN PAGE ───────────────────────────────────────────────────────
const LoginPage = {
  name: 'LoginPage',
  emits: ['logged-in', 'go-register-customer', 'go-register-professional', 'go-home'],
  data: () => ({ form: { email: '', password: '' }, error: '', loading: false }),
  methods: {
    async doLogin() {
      this.error = '';
      this.loading = true;
      try {
        const { data } = await axios.post('/auth/login', this.form);
        auth.login(data.access_token, data.user);
        this.$emit('logged-in', data.user.role);
      } catch (e) {
        this.error = e.response?.data?.msg || 'Login failed';
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
  <div class="d-flex align-items-center justify-content-center" style="min-height:100vh;background:var(--bg);">
    <div style="width:100%;max-width:420px;padding:1.5rem;">
      <div class="glass-card">
        <div class="text-center mb-4">
          <div style="font-size:2.5rem;margin-bottom:8px">🏠</div>
          <h4 style="font-weight:800;margin-bottom:4px">Welcome Back</h4>
          <p style="color:var(--text-muted);font-size:13px">Sign in to A-Z Household Services</p>
        </div>
        <div v-if="error" class="alert alert-danger mb-3">{{ error }}</div>
        <form @submit.prevent="doLogin">
          <div class="mb-3">
            <label class="form-label">Email Address</label>
            <input v-model="form.email" type="email" class="form-control" placeholder="you@example.com" required />
          </div>
          <div class="mb-4">
            <label class="form-label">Password</label>
            <input v-model="form.password" type="password" class="form-control" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            <span v-if="loading" class="loader-ring" style="width:16px;height:16px;border-width:2px;margin-right:8px"></span>
            {{ loading ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>
        <hr style="border-color:var(--border);margin:1.5rem 0;" />
        <div class="text-center" style="font-size:13px;color:var(--text-muted);">
          New here?
          <a href="#" @click.prevent="$emit('go-register-customer')" style="color:var(--accent);font-weight:600">Register as Customer</a>
          &nbsp;or&nbsp;
          <a href="#" @click.prevent="$emit('go-register-professional')" style="color:var(--accent2);font-weight:600">Join as Professional</a>
        </div>
        <div class="text-center mt-2">
          <a href="#" @click.prevent="$emit('go-home')" style="font-size:13px;color:var(--text-dim)">← Back to Home</a>
        </div>
      </div>
      <!-- Default Credentials -->
      <div style="margin-top:1rem;font-size:11px;color:var(--text-dim);text-align:center;">
        Admin: admin@hsa.com / admin123
      </div>
    </div>
  </div>
  `,
};

// ─── REGISTER CUSTOMER ────────────────────────────────────────────────
const RegisterCustomer = {
  name: 'RegisterCustomer',
  emits: ['go-login', 'go-home'],
  data: () => ({
    form: { email: '', password: '', full_name: '', address: '', pincode: '' },
    error: '', success: '', loading: false
  }),
  methods: {
    async doRegister() {
      this.error = ''; this.success = '';
      this.loading = true;
      try {
        await axios.post('/auth/register/customer', this.form);
        this.success = 'Registered! Please login.';
        setTimeout(() => this.$emit('go-login'), 1500);
      } catch (e) {
        this.error = e.response?.data?.msg || 'Registration failed';
      } finally { this.loading = false; }
    },
  },
  template: `
  <div class="d-flex align-items-center justify-content-center" style="min-height:100vh;background:var(--bg);padding:2rem 1rem;">
    <div style="width:100%;max-width:480px;">
      <div class="glass-card">
        <div class="text-center mb-4">
          <div style="font-size:2rem;margin-bottom:8px">👤</div>
          <h4 style="font-weight:800">Create Account</h4>
          <p style="color:var(--text-muted);font-size:13px">Register as a Customer</p>
        </div>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-if="success" class="alert alert-success">{{ success }}</div>
        <form @submit.prevent="doRegister">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Full Name</label>
              <input v-model="form.full_name" class="form-control" placeholder="Your Name" required />
            </div>
            <div class="col-12">
              <label class="form-label">Email</label>
              <input v-model="form.email" type="email" class="form-control" placeholder="you@example.com" required />
            </div>
            <div class="col-12">
              <label class="form-label">Password</label>
              <input v-model="form.password" type="password" class="form-control" placeholder="Min 6 characters" required />
            </div>
            <div class="col-12">
              <label class="form-label">Address</label>
              <input v-model="form.address" class="form-control" placeholder="Your address" />
            </div>
            <div class="col-12">
              <label class="form-label">Pin Code</label>
              <input v-model="form.pincode" class="form-control" placeholder="6-digit pincode" />
            </div>
          </div>
          <button type="submit" class="btn btn-primary w-100 mt-4" :disabled="loading">
            {{ loading ? 'Registering…' : 'Register' }}
          </button>
        </form>
        <div class="text-center mt-3" style="font-size:13px;color:var(--text-muted);">
          Already have an account?
          <a href="#" @click.prevent="$emit('go-login')" style="color:var(--accent);font-weight:600">Sign In</a>
        </div>
      </div>
    </div>
  </div>
  `,
};

// ─── REGISTER PROFESSIONAL ────────────────────────────────────────────
const RegisterProfessional = {
  name: 'RegisterProfessional',
  emits: ['go-login', 'go-home'],
  data: () => ({
    form: { email: '', password: '', full_name: '', service_type: '', experience: '', address: '', pincode: '', description: '' },
    categories: ['AC Repair', 'Cleaning', 'Electrician', 'Plumbing', 'Salon', 'Pest Control'],
    error: '', success: '', loading: false
  }),
  methods: {
    async doRegister() {
      this.error = ''; this.success = '';
      this.loading = true;
      try {
        await axios.post('/auth/register/professional', this.form);
        this.success = 'Registered! Awaiting admin approval. Please wait.';
        setTimeout(() => this.$emit('go-login'), 2000);
      } catch (e) {
        this.error = e.response?.data?.msg || 'Registration failed';
      } finally { this.loading = false; }
    },
  },
  template: `
  <div class="d-flex align-items-center justify-content-center" style="min-height:100vh;background:var(--bg);padding:2rem 1rem;">
    <div style="width:100%;max-width:500px;">
      <div class="glass-card">
        <div class="text-center mb-4">
          <div style="font-size:2rem;margin-bottom:8px">🔧</div>
          <h4 style="font-weight:800">Join as Professional</h4>
          <p style="color:var(--text-muted);font-size:13px">Your profile will be reviewed by admin before activation</p>
        </div>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-if="success" class="alert alert-success">{{ success }}</div>
        <form @submit.prevent="doRegister">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Full Name</label>
              <input v-model="form.full_name" class="form-control" placeholder="Your Name" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">Service Category</label>
              <select v-model="form.service_type" class="form-select" required>
                <option value="">Select…</option>
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label">Email</label>
              <input v-model="form.email" type="email" class="form-control" required />
            </div>
            <div class="col-12">
              <label class="form-label">Password</label>
              <input v-model="form.password" type="password" class="form-control" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">Experience</label>
              <input v-model="form.experience" class="form-control" placeholder="e.g. 3 years" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Pin Code</label>
              <input v-model="form.pincode" class="form-control" placeholder="6-digit" />
            </div>
            <div class="col-12">
              <label class="form-label">Address</label>
              <input v-model="form.address" class="form-control" placeholder="Your base location" />
            </div>
            <div class="col-12">
              <label class="form-label">Brief Description</label>
              <textarea v-model="form.description" class="form-control" rows="2" placeholder="Tell customers about your expertise"></textarea>
            </div>
          </div>
          <button type="submit" class="btn btn-success w-100 mt-4" :disabled="loading">
            {{ loading ? 'Submitting…' : 'Submit for Approval' }}
          </button>
        </form>
        <div class="text-center mt-3" style="font-size:13px;color:var(--text-muted);">
          Already registered?
          <a href="#" @click.prevent="$emit('go-login')" style="color:var(--accent);font-weight:600">Sign In</a>
        </div>
      </div>
    </div>
  </div>
  `,
};

// ─── ROOT APP ─────────────────────────────────────────────────────────
const App = {
  name: 'App',
  components: {
    LandingPage, LoginPage, RegisterCustomer, RegisterProfessional,
    AdminDashboard, CustomerDashboard, ProfessionalDashboard, ToastHost,
  },
  data() {
    const role = auth.role();
    let view = 'landing';
    if (auth.isLoggedIn() && role) {
      view = role + '_dashboard';
    }
    return { view };
  },
  methods: {
    onLoggedIn(role) { this.view = role + '_dashboard'; },
    onLogout() { auth.logout(); this.view = 'landing'; },
    toast(msg, type = 'info') { this.$refs.toastHost?.show(msg, type); },
  },
  template: `
    <div>
      <ToastHost ref="toastHost" />
      <LandingPage          v-if="view === 'landing'"                  @go-login="view='login'" @go-register-customer="view='reg_customer'" @go-register-professional="view='reg_professional'" />
      <LoginPage            v-else-if="view === 'login'"               @logged-in="onLoggedIn" @go-register-customer="view='reg_customer'" @go-register-professional="view='reg_professional'" @go-home="view='landing'" />
      <RegisterCustomer     v-else-if="view === 'reg_customer'"        @go-login="view='login'" @go-home="view='landing'" />
      <RegisterProfessional v-else-if="view === 'reg_professional'"    @go-login="view='login'" @go-home="view='landing'" />
      <AdminDashboard        v-else-if="view === 'admin_dashboard'"    @logout="onLogout" :toast="toast" />
      <CustomerDashboard     v-else-if="view === 'customer_dashboard'" @logout="onLogout" :toast="toast" />
      <ProfessionalDashboard v-else-if="view === 'professional_dashboard'" @logout="onLogout" :toast="toast" />
    </div>
  `,
};

// ─── MOUNT ───────────────────────────────────────────────────────────
createApp(App).mount('#app');
