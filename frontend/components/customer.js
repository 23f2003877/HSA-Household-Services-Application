// backend/static/components/customer.js
import { auth, statusClass, catIcon } from '/static/app.js';
const { ref, reactive, onMounted, computed } = Vue;

export const CustomerDashboard = {
  name: 'CustomerDashboard',
  props: ['toast'],
  emits: ['logout'],
  setup(props, { emit }) {
    const tab = ref('home');
    const loading = ref(false);
    const profile = ref(null);
    const services = ref([]);
    const categories = ref([]);
    const requests = ref([]);
    const unratedRequests = ref([]);
    const selectedCat = ref('');
    const professionals = ref([]);

    // Search
    const searchQuery = ref('');
    const searchBy = ref('service');
    const searchResults = ref([]);

    // Book form
    const bookForm = reactive({ service_id: '', professional_id: '', date_of_request: '' });
    const bookError = ref('');
    const bookLoading = ref(false);
    const selectedService = ref(null);

    // Rating form
    const ratingForm = reactive({ req_id: null, rating: 0, remarks: '' });
    const hoverStar = ref(0);

    const api = (url, opts = {}) => axios({ url, ...opts });

    // ── LOAD ──────────────────────────────────────────────────────
    async function loadHome() {
      loading.value = true;
      try {
        const [dashRes, unratedRes] = await Promise.all([
          api('/customer/dashboard'),
          api('/customer/requests/unrated'),
        ]);
        profile.value = dashRes.data.profile;
        services.value = dashRes.data.services || [];
        categories.value = dashRes.data.categories || [];
        unratedRequests.value = unratedRes.data || [];
      } finally { loading.value = false; }
    }

    async function loadRequests() {
      const { data } = await api('/customer/requests');
      requests.value = data;
    }

    async function loadServices(cat) {
      selectedCat.value = cat || '';
      const url = cat ? `/customer/services?category=${cat}` : '/customer/services';
      const { data } = await api(url);
      services.value = data.services || [];
      if (!cat) categories.value = data.categories || [];
    }

    async function loadProfessionals(serviceType) {
      if (!serviceType) return;
      const { data } = await api(`/customer/professionals/${serviceType}`);
      professionals.value = data;
    }

    // ── SEARCH ────────────────────────────────────────────────────
    async function doSearch() {
      if (!searchQuery.value.trim()) return;
      const { data } = await api(`/customer/search?by=${searchBy.value}&q=${searchQuery.value}`);
      searchResults.value = data.results || [];
    }

    // ── BOOK ──────────────────────────────────────────────────────
    function openBook(svc) {
      selectedService.value = svc;
      Object.assign(bookForm, { service_id: svc.id, professional_id: '', date_of_request: '' });
      bookError.value = '';
      professionals.value = [];
      loadProfessionals(svc.category);
      const m = new bootstrap.Modal(document.getElementById('bookModal'));
      m.show();
    }

    async function submitBook() {
      bookError.value = '';
      bookLoading.value = true;
      try {
        await api('/customer/requests', { method: 'post', data: bookForm });
        props.toast?.('Service booked!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('bookModal'))?.hide();
        await loadRequests();
        tab.value = 'requests';
      } catch (e) {
        bookError.value = e.response?.data?.msg || 'Booking failed';
      } finally { bookLoading.value = false; }
    }

    // ── CANCEL ────────────────────────────────────────────────────
    async function cancelRequest(id) {
      if (!confirm('Cancel this request?')) return;
      try {
        await api(`/customer/requests/${id}`, { method: 'delete' });
        props.toast?.('Request cancelled', 'success');
        await loadRequests();
      } catch (e) { props.toast?.(e.response?.data?.msg || 'Cannot cancel', 'error'); }
    }

    // ── CLOSE ─────────────────────────────────────────────────────
    async function closeRequest(id) {
      try {
        await api(`/customer/requests/${id}/close`, { method: 'post' });
        props.toast?.('Request closed', 'success');
        await loadRequests();
        await loadHome();
      } catch (e) { props.toast?.(e.response?.data?.msg || 'Cannot close', 'error'); }
    }

    // ── RATING ───────────────────────────────────────────────────
    function openRating(req) {
      ratingForm.req_id = req.id;
      ratingForm.rating = 0;
      ratingForm.remarks = '';
      hoverStar.value = 0;
      const m = new bootstrap.Modal(document.getElementById('ratingModal'));
      m.show();
    }

    async function submitRating() {
      try {
        await api(`/customer/requests/${ratingForm.req_id}/rate`, {
          method: 'post',
          data: { rating: ratingForm.rating, remarks: ratingForm.remarks }
        });
        props.toast?.('Rating submitted!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('ratingModal'))?.hide();
        await loadHome();
      } catch (e) { props.toast?.(e.response?.data?.msg || 'Failed', 'error'); }
    }

    // ── TABS ──────────────────────────────────────────────────────
    async function goTab(t) {
      tab.value = t;
      if (t === 'home') await loadHome();
      if (t === 'requests') await loadRequests();
      if (t === 'browse') await loadServices();
    }

    function doLogout() { emit('logout'); }

    onMounted(() => loadHome());

    return {
      tab, loading, profile, services, categories, requests, unratedRequests,
      selectedCat, professionals, searchQuery, searchBy, searchResults,
      bookForm, bookError, bookLoading, selectedService,
      ratingForm, hoverStar,
      loadServices, doSearch, openBook, submitBook,
      cancelRequest, closeRequest, openRating, submitRating,
      goTab, doLogout, statusClass, catIcon,
    };
  },
  template: `
  <div class="dash-layout">
    <!-- SIDEBAR -->
    <div class="dash-sidebar">
      <div class="sidebar-logo">🏠 A-Z Services</div>
      <div v-for="item in sideItems" :key="item.t" class="sidebar-item" :class="{active:tab===item.t}" @click="goTab(item.t)">
        <span class="icon">{{ item.icon }}</span> {{ item.label }}
        <span v-if="item.t==='home' && unratedRequests.length" style="margin-left:auto;background:var(--accent3);color:#000;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700">{{ unratedRequests.length }}</span>
      </div>
      <div class="sidebar-divider"></div>
      <div style="padding:0 12px 0;font-size:11px;color:var(--text-dim)">{{ profile?.email }}</div>
      <div class="sidebar-item mt-1" @click="doLogout"><span class="icon">🚪</span> Logout</div>
    </div>

    <!-- MAIN -->
    <div class="dash-main">

      <!-- HOME TAB -->
      <div v-if="tab==='home'">
        <h4 style="font-weight:800;margin-bottom:4px">Welcome, {{ profile?.full_name }} 👋</h4>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:1.5rem">Browse and book trusted home services.</p>

        <!-- Rate pending -->
        <div v-if="unratedRequests.length" class="alert alert-warning mb-4">
          <strong>⭐ Rate your recent services!</strong> You have {{ unratedRequests.length }} unrated completed request(s).
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button v-for="r in unratedRequests" :key="r.id" class="btn btn-warning btn-sm" @click="openRating(r)">
              Rate #{{ r.id }} — {{ r.service_name }}
            </button>
          </div>
        </div>

        <!-- Category pills -->
        <div class="mb-3">
          <span class="cat-pill" :class="{active:selectedCat===''}" @click="loadServices('')">All</span>
          <span v-for="c in categories" :key="c" class="cat-pill" :class="{active:selectedCat===c}" @click="loadServices(c)">{{ catIcon(c) }} {{ c }}</span>
        </div>

        <!-- Services grid -->
        <div v-if="loading" class="text-center py-5"><div class="loader-ring"></div></div>
        <div v-else class="row g-3">
          <div v-for="s in services" :key="s.id" class="col-md-4 col-lg-3">
            <div class="service-card h-100">
              <div class="service-icon">{{ catIcon(s.category) }}</div>
              <div class="service-name">{{ s.name }}</div>
              <div class="service-category">{{ s.category }}</div>
              <div class="service-price">₹{{ s.base_price }}</div>
              <div class="service-time">⏱ {{ s.time_required || 'N/A' }}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:6px;flex-grow:1">{{ s.description }}</div>
              <button class="btn btn-primary btn-sm w-100 mt-3" @click="openBook(s)">
                <i class="bi bi-calendar-check me-1"></i>Book Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- BROWSE/SEARCH TAB -->
      <div v-if="tab==='browse'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">Search Services</h4>
        <div class="glass-card mb-4">
          <div class="row g-3">
            <div class="col-md-3">
              <select v-model="searchBy" class="form-select">
                <option value="service">By Service</option>
                <option value="professional">By Professional</option>
              </select>
            </div>
            <div class="col-md-7">
              <input v-model="searchQuery" class="form-control" placeholder="Search name, category, pincode…" @keyup.enter="doSearch" />
            </div>
            <div class="col-md-2"><button class="btn btn-primary w-100" @click="doSearch">Search</button></div>
          </div>
        </div>
        <div v-if="!searchResults.length" class="empty-state"><div class="icon">🔍</div><p>Search for services or professionals</p></div>
        <div class="row g-3">
          <div v-for="r in searchResults" :key="r.id" class="col-md-4">
            <div class="service-card">
              <div v-if="r.name">
                <div class="service-icon">{{ catIcon(r.category) }}</div>
                <div class="service-name">{{ r.name }}</div>
                <div class="service-category">{{ r.category }}</div>
                <div class="service-price">₹{{ r.base_price }}</div>
                <button class="btn btn-primary btn-sm w-100 mt-3" @click="openBook(r)">Book Now</button>
              </div>
              <div v-else>
                <div class="prof-avatar" style="margin-bottom:10px">{{ r.full_name?.[0]?.toUpperCase() }}</div>
                <div class="service-name">{{ r.full_name }}</div>
                <div class="service-category">{{ r.service_type }}</div>
                <div style="font-size:12px;color:var(--text-muted)">📍 {{ r.pincode }} · {{ r.experience }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- REQUESTS TAB -->
      <div v-if="tab==='requests'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">My Requests ({{ requests.length }})</h4>
        <div v-if="!requests.length" class="empty-state"><div class="icon">📋</div><p>No requests yet — go book a service!</p></div>
        <div class="table-responsive">
          <table v-if="requests.length" class="table table-dark table-hover">
            <thead><tr><th>#</th><th>Service</th><th>Professional</th><th>Date</th><th>Status</th><th>Rating</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="r in requests" :key="r.id">
                <td>#{{ r.id }}</td>
                <td>{{ r.service_name }}<div style="font-size:11px;color:var(--text-muted)">{{ r.service_category }}</div></td>
                <td>{{ r.professional_name }}</td>
                <td>{{ r.date_of_request }}</td>
                <td><span :class="statusClass(r.status)">{{ r.status }}</span></td>
                <td>{{ r.rating ? '⭐'.repeat(r.rating) : '—' }}</td>
                <td>
                  <div class="d-flex gap-1">
                    <button v-if="['requested','assigned'].includes(r.status)" class="btn btn-danger btn-sm" @click="cancelRequest(r.id)">Cancel</button>
                    <button v-if="['accepted','completed'].includes(r.status) && r.status !== 'closed'" class="btn btn-success btn-sm" @click="closeRequest(r.id)">Close</button>
                    <button v-if="['closed','completed'].includes(r.status) && !r.rating" class="btn btn-warning btn-sm" @click="openRating(r)">⭐ Rate</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PROFILE TAB -->
      <div v-if="tab==='profile'">
        <h4 style="font-weight:800;margin-bottom:1.5rem">My Profile</h4>
        <div class="glass-card" style="max-width:480px" v-if="profile">
          <div class="mb-3"><label class="form-label">Full Name</label><input v-model="profile.full_name" class="form-control" /></div>
          <div class="mb-3"><label class="form-label">Address</label><input v-model="profile.address" class="form-control" /></div>
          <div class="mb-3"><label class="form-label">Pin Code</label><input v-model="profile.pincode" class="form-control" /></div>
          <button class="btn btn-primary" @click="updateProfile">Save Changes</button>
        </div>
      </div>

    </div>

    <!-- BOOK MODAL -->
    <div class="modal fade" id="bookModal" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Book — {{ selectedService?.name }}</h5>
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div v-if="bookError" class="alert alert-danger mb-3">{{ bookError }}</div>
          <div class="mb-3">
            <label class="form-label">Select Professional</label>
            <select v-model="bookForm.professional_id" class="form-select" required>
              <option value="">Choose…</option>
              <option v-for="p in professionals" :key="p.id" :value="p.id">{{ p.full_name }} ({{ p.experience }}) · 📍{{ p.pincode }}</option>
            </select>
            <div v-if="!professionals.length" style="font-size:12px;color:var(--accent3);margin-top:4px">No professionals available for this category</div>
          </div>
          <div class="mb-3">
            <label class="form-label">Preferred Date</label>
            <input v-model="bookForm.date_of_request" type="date" class="form-control" :min="today" required />
          </div>
          <div v-if="selectedService" class="glass-card" style="padding:0.75rem">
            <div style="font-size:12px;color:var(--text-muted)">
              <div>💰 Base Price: <strong style="color:var(--accent2)">₹{{ selectedService.base_price }}</strong></div>
              <div>⏱ Time: {{ selectedService.time_required || 'N/A' }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button class="btn btn-primary" @click="submitBook" :disabled="bookLoading || !bookForm.professional_id">
            {{ bookLoading ? 'Booking…' : 'Confirm Booking' }}
          </button>
        </div>
      </div></div>
    </div>

    <!-- RATING MODAL -->
    <div class="modal fade" id="ratingModal" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Rate Service #{{ ratingForm.req_id }}</h5>
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="text-center mb-4">
            <div style="margin-bottom:8px;color:var(--text-muted);font-size:13px">Tap a star to rate</div>
            <div class="stars-input d-flex justify-content-center gap-2">
              <span v-for="n in 5" :key="n" :class="{active: n <= (hoverStar || ratingForm.rating)}"
                @mouseenter="hoverStar=n" @mouseleave="hoverStar=0" @click="ratingForm.rating=n"
                style="font-size:2rem;cursor:pointer">⭐</span>
            </div>
            <div style="color:var(--accent3);font-weight:700;margin-top:8px">{{ ratingLabels[ratingForm.rating] || 'Select rating' }}</div>
          </div>
          <div>
            <label class="form-label">Remarks (optional)</label>
            <textarea v-model="ratingForm.remarks" class="form-control" rows="2" placeholder="How was the service?"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Skip</button>
          <button class="btn btn-warning" @click="submitRating" :disabled="!ratingForm.rating">Submit Rating</button>
        </div>
      </div></div>
    </div>
  </div>
  `,
  data: () => ({
    sideItems: [
      { t: 'home', icon: '🏠', label: 'Home' },
      { t: 'browse', icon: '🔍', label: 'Search' },
      { t: 'requests', icon: '📋', label: 'My Requests' },
      { t: 'profile', icon: '👤', label: 'Profile' },
    ],
    ratingLabels: { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' },
    today: new Date().toISOString().split('T')[0],
  }),
  methods: {
    async updateProfile() {
      try {
        await axios.put('/customer/profile', this.profile);
        this.toast?.('Profile updated', 'success');
      } catch (e) { this.toast?.(e.response?.data?.msg || 'Failed', 'error'); }
    },
  },
};
